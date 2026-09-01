// lib/feed-fetch.js — the hardened feed fetcher, shared by every RSS consumer.
//
// Extracted from app/api/social/route.js so the podcast route inherits the
// Reddit rate-limit work rather than repeating it. Podcast hosts (Megaphone,
// Libsyn, Simplecast) are CDNs that behave much better than reddit.com, but
// they are still someone else's servers: the pacing, the response cache and the
// 429/Retry-After handling all apply, and a second copy of that logic would
// have drifted from this one the first time either was fixed.
//
// Everything here is host-generic. Nothing knows what a podcast or a subreddit
// is; callers pass a URL.

const FETCH_TIMEOUT_MS = 9000;

export function hostOf(url) {
  try { return new URL(url).host; } catch { return ''; }
}

// A real browser UA. Default/bot agents get 403'd by Cloudflare in front of
// rsshub.app — the same lesson the news feed proxy already learned.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// Reddit is the exception, and it wants the OPPOSITE of a browser UA.
// Reddit's API rules ask for a descriptive, uniquely identifying agent and
// throttle generic/browser strings from cloud IPs much harder — a datacenter
// claiming to be Chrome is exactly the pattern they penalise.
// ASSUMPTION: the repo URL is the closest thing to a contact address this
// project has. Swap it if you'd rather they could reach you another way.
const REDDIT_UA =
  'AetherHub/1.0 (personal social-intelligence dashboard; ' +
  '+https://github.com/wchrisbloch-clefty/social-command-center)';

const isReddit = url => /(^|\.)reddit\.com/i.test(hostOf(url));

export function headersFor(url) {
  return {
    'User-Agent': isReddit(url) ? REDDIT_UA : UA,
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, */*',
    'Accept-Language': 'en-US,en;q=0.9',
  };
}


// ── Per-host request pacing ─────────────────────────────────────────────────
// The bug this fixes: every source was fetched with Promise.allSettled, so all
// 18 Reddit routes left at once. Live, exactly one returned 200 and seventeen
// came back 429. That is throttling, not blocking — Reddit serves this content
// happily, just not eighteen times in the same instant.
//
// So requests to the same host now queue behind one another with a minimum gap.
// Different hosts still run fully in parallel: rsshub.app and reddit.com do not
// wait on each other, only reddit-on-reddit does.
//
// ── Per-host request scheduling ─────────────────────────────────────────────
// Two independent controls, and the distinction is the whole fix:
//
//   gapMs        minimum interval between request STARTS. This is what caps
//                the request RATE, and it is the only thing Reddit counts.
//   concurrency  how many may be in flight at once. This does NOT raise the
//                rate — the gate above still spaces every start — it only lets
//                a slow response overlap the next request instead of blocking it.
//
// ── WHY THE START MATTERS, MEASURED ─────────────────────────────────────────
// The previous version slept AFTER the task: `await task(); await sleep(gap)`.
// That makes the effective interval `latency + gap`, so a 350ms feed at a
// 1100ms gap actually spaced requests 1450ms apart, and 13 sports subreddits
// took 18.9s against a 20s deadline. One slow day and every source but the
// first reported "not finished within 20s" — which is exactly what happened in
// production: 1 of 13 returned.
//
// Gating on the START makes the interval exactly `gap`, independent of how slow
// the upstream is. Same 13 sources: 18.9s → 13.6s, still zero 429s.
//
// Concurrency then covers the case the gate cannot: when latency EXCEEDS the
// gap, requests queue behind each other and the deadline wins anyway. Measured
// at 2500ms latency: concurrency 1 → 5/13, concurrency 3 → 13/13.
//
// Numbers from scripts/tune-throttle.mjs (`npm run tune:throttle`), which
// sweeps both against a fixture that 429s anything arriving <1000ms after the
// last served request. Re-run it if Reddit's limits change; do not guess.
//
// ASSUMPTION: 1100ms. Reddit publishes ~60 requests/minute for unauthenticated
// clients. The sweep puts the 429 threshold at 1000ms exactly, so 1100 keeps a
// 10% margin. 1050 also measured clean; below 1000 the 429s return immediately.
const HOST_LIMITS = {
  'www.reddit.com': { gapMs: 1100, concurrency: 3 },
  'reddit.com':     { gapMs: 1100, concurrency: 3 },
};
const DEFAULT_LIMIT = { gapMs: 0, concurrency: Infinity };   // everything else unthrottled

// Extra hosts, as "host=ms" or "host=ms:concurrency" pairs, comma separated.
// Two real uses: throttling a self-hosted RSSHub you would rather not hammer,
// and pointing the rate-limit tests at a fixture so they exercise this exact
// code path rather than a copy of it.
//   SOCIAL_THROTTLE_HOSTS=127.0.0.1:4321=300,rsshub.internal=500:2
for (const pair of (process.env.SOCIAL_THROTTLE_HOSTS || '').split(',').filter(Boolean)) {
  const at = pair.lastIndexOf('=');
  if (at < 1) continue;
  const host = pair.slice(0, at).trim();
  const [msRaw, concRaw] = pair.slice(at + 1).split(':');
  const ms = Number(msRaw);
  const conc = Number(concRaw);
  if (host && Number.isFinite(ms) && ms >= 0) {
    HOST_LIMITS[host] = {
      gapMs: ms,
      concurrency: Number.isFinite(conc) && conc > 0 ? conc : 3,
    };
  }
}

const hostState = new Map();   // host → { gate, lastStart, active, waiters }

function stateFor(host) {
  if (!hostState.has(host)) {
    hostState.set(host, { gate: Promise.resolve(), lastStart: 0, active: 0, waiters: [] });
  }
  return hostState.get(host);
}

/**
 * Run `task` under this host's rate limit.
 *
 * Only the PERMIT is serialised — and a permit is just a sleep. The task itself
 * runs free, up to `concurrency` at a time. That separation is what lets the
 * rate stay fixed while throughput follows the upstream's actual speed.
 */
export async function paced(url, task) {
  const host = hostOf(url);
  const { gapMs, concurrency } = HOST_LIMITS[host] || DEFAULT_LIMIT;
  if (!gapMs && concurrency === Infinity) return task();

  const st = stateFor(host);

  // 1. A concurrency slot.
  if (st.active < concurrency) st.active++;
  else { await new Promise(res => st.waiters.push(res)); st.active++; }

  try {
    // 2. A start permit, spaced gapMs from the previous START.
    st.gate = st.gate.then(async () => {
      const wait = st.lastStart + gapMs - Date.now();
      if (wait > 0) await sleep(wait);
      st.lastStart = Date.now();
    });
    await st.gate;
    return await task();
  } finally {
    st.active--;
    const next = st.waiters.shift();
    if (next) next();
  }
}

// ── Response cache, with stale-while-revalidate ─────────────────────────────
// THE REAL FIX. Rate limiting bounds how fast we may ask; caching decides how
// often we have to. After the first warm-up no page load should wait on a live
// fetch at all, and then the deadline stops mattering.
//
// Three ages, not two:
//
//   < FRESH_MS   serve from cache, ask nobody
//   < STALE_MS   serve from cache IMMEDIATELY and refresh in the BACKGROUND
//                — the caller never waits, and the next caller gets fresh data
//   > STALE_MS   too old to stand behind; fetch and make the caller wait
//
// The middle band is what removes the cliff. Previously an entry one second
// past 5 minutes turned a 0ms response into a 13-second one for whoever
// happened to load next; now that user gets the cached copy at once and pays
// nothing for the refresh they triggered.
//
// ASSUMPTION: fresh 5 minutes, stale-serviceable to 30. These are hot/new
// subreddit listings — minutes of staleness is invisible, and content half an
// hour old is still worth showing while something better is fetched. Beyond
// that it stops being "the feed" and the wait is honest.
// Env-overridable so the warm-up cadence and the freshness window can be tuned
// together on a deployment, and so the stale band is directly testable without
// a five-minute wait.
const CACHE_FRESH_MS = Number(process.env.SOCIAL_CACHE_FRESH_MS) || 5 * 60 * 1000;
const CACHE_STALE_MS = Number(process.env.SOCIAL_CACHE_STALE_MS) || 30 * 60 * 1000;
const responseCache = new Map();   // url → { at, text }
const inFlight = new Map();        // url → promise, so N callers cause 1 fetch

/** Cached entry plus its age band, or null when nothing usable is held. */
function cacheGet(url) {
  const hit = responseCache.get(url);
  if (!hit) return null;
  const age = Date.now() - hit.at;
  if (age > CACHE_STALE_MS) { responseCache.delete(url); return null; }
  return { ...hit, age, fresh: age <= CACHE_FRESH_MS };
}

function cacheSet(url, value) {
  // Only cache SUCCESS. Caching a 429 would extend an outage well past the
  // moment the rate limit lifted.
  if (!value.ok) return;
  responseCache.set(url, { text: value.text, at: Date.now() });
}

/**
 * Cache state for one URL, without fetching. The warm-up job reports on this,
 * and the route uses it to tell "still loading" apart from "broken".
 */
export function cacheStatus(url) {
  const hit = cacheGet(redirectToFixture(url));
  if (!hit) return { cached: false };
  return { cached: true, fresh: hit.fresh, ageSeconds: Math.round(hit.age / 1000) };
}

/** Test seam — the warm-up verification needs a cold start it can assert on. */
export function clearFeedCache() {
  responseCache.clear();
  inFlight.clear();
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Rewrite a URL onto SOCIAL_FIXTURE_BASE, preserving path and query.
 * Unset in production and in any real deployment — returns the URL untouched.
 * Idempotent: a URL already pointing at the fixture rewrites to itself.
 */
export function redirectToFixture(url) {
  const base = (process.env.SOCIAL_FIXTURE_BASE || '').trim().replace(/\/+$/, '');
  if (!base) return url;
  try {
    const u = new URL(url);
    return `${base}${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

/**
 * Retry transient failures only. 401/403/404 cannot be fixed by asking again.
 *
 * 429 IS retried, and with a longer backoff than the rest: it means "you asked
 * too fast", so the useful response is to wait, not to give up. Honours
 * Retry-After when the server sends one.
 */
export async function fetchFeed(rawTarget) {
  // ── Test fixture redirection, applied for EVERY consumer ──────────────────
  // SOCIAL_FIXTURE_BASE points all feed traffic at a local fixture, so the
  // responsive audit reaches no network at all.
  //
  // It lives HERE rather than in one route because the last time it lived in a
  // route, the next route added (podcasts) called fetchFeed directly, bypassed
  // it, and would have hammered live podcast CDNs from CI on all 72 page loads.
  // At this layer a new consumer cannot forget it.
  const target = redirectToFixture(rawTarget);

  const cached = cacheGet(target);
  if (cached?.fresh) return { ok: true, text: cached.text, cached: 'fresh' };

  if (cached) {
    // STALE-WHILE-REVALIDATE. Hand back what we have RIGHT NOW and refresh out
    // of band. The caller never pays for the refresh it triggered, which is the
    // difference between a 0ms page load and a 13s one.
    if (!inFlight.has(target)) {
      const bg = liveFetch(target)
        .catch(() => null)                    // a failed refresh keeps the stale copy
        .finally(() => inFlight.delete(target));
      inFlight.set(target, bg);
      // Nothing awaits this; an unhandled rejection here must not take the
      // process down.
      bg.catch(() => {});
    }
    return { ok: true, text: cached.text, cached: 'stale', ageSeconds: Math.round(cached.age / 1000) };
  }

  // Nothing usable held. Single-flight it: a cold page load fans out to every
  // source, and two sources pointing at one URL should cost one request.
  if (inFlight.has(target)) return inFlight.get(target);
  const p = liveFetch(target).finally(() => inFlight.delete(target));
  inFlight.set(target, p);
  return p;
}

/** The actual network path. Retry, backoff, 429 handling. Never throws. */
async function liveFetch(target) {
  const backoffs = [0, 400, 1200];
  let last = { status: 0, err: 'unknown' };

  for (let i = 0; i < backoffs.length; i++) {
    if (backoffs[i]) await sleep(backoffs[i]);
    try {
      // Pace inside the retry loop so a retry also waits its turn behind any
      // other request queued for the same host.
      //
      // ── next.revalidate, NOT cache:'no-store' ────────────────────────────
      // This was `cache: 'no-store'`, which explicitly opts OUT of Next's Data
      // Cache — and that made the whole caching design ineffective in
      // production, for a reason the in-process cache could never fix.
      //
      // The response cache above is per-INSTANCE memory. On Vercel almost every
      // request lands on a fresh lambda, so it was empty every time: two
      // consecutive live calls to /api/social?category=sports reported
      // `fromCache: 0` both times, from different x-vercel-ids. Every load was
      // a cold load, and only the first two sources cleared the deadline.
      //
      // Next's Data Cache is SHARED across invocations and survives them, so it
      // is the layer that actually carries this. The in-process map stays as an
      // L1 in front of it: free, instant, and it still collapses a fan-out
      // within one instance.
      //
      // ASSUMPTION: revalidate matches CACHE_FRESH_MS (300s). Keeping them in
      // step means the two layers expire together rather than one serving
      // content the other considers stale.
      const r = await paced(target, () => fetch(target, {
        headers: headersFor(target),
        redirect: 'follow',
        next: { revalidate: Math.round(CACHE_FRESH_MS / 1000) },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }));

      if (r.ok) {
        const text = await r.text();
        cacheSet(target, { ok: true, text });
        return { ok: true, text };
      }

      last = { status: r.status, err: `HTTP ${r.status}` };

      if (r.status === 429) {
        // Rate limited: back off harder than the standard ladder before the
        // next attempt, and respect Retry-After if it is present and sane.
        const retryAfter = Number(r.headers.get('retry-after'));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 5000)
          : 2000;
        last.err = 'rate limited (429)';
        await sleep(waitMs);
        continue;
      }

      if ([400, 401, 402, 403, 404, 410].includes(r.status)) break;
    } catch (e) {
      last = { status: 0, err: e?.name === 'TimeoutError' ? 'timeout' : (e?.message || 'network') };
    }
  }
  return { ok: false, ...last };
}
