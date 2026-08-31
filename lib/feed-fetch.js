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
// ASSUMPTION: 1100ms between Reddit requests. Reddit's published guidance is
// ~60 requests/minute for unauthenticated clients; one per second sits just
// inside that with headroom for a retry.
const HOST_MIN_GAP_MS = { 'www.reddit.com': 1100, 'reddit.com': 1100 };
const DEFAULT_GAP_MS = 0;   // everything else is unthrottled

// Extra hosts to pace, as "host:ms" pairs. Two real uses: throttling a
// self-hosted RSSHub that you would rather not hammer, and pointing the
// rate-limit test at a fixture so it exercises this exact code path instead of
// a copy of it.
//   SOCIAL_THROTTLE_HOSTS=127.0.0.1:4321=300,rsshub.internal=500
for (const pair of (process.env.SOCIAL_THROTTLE_HOSTS || '').split(',').filter(Boolean)) {
  const at = pair.lastIndexOf('=');
  if (at < 1) continue;
  const host = pair.slice(0, at).trim();
  const ms = Number(pair.slice(at + 1));
  if (host && Number.isFinite(ms) && ms >= 0) HOST_MIN_GAP_MS[host] = ms;
}

const hostQueues = new Map();   // host → promise chain tail

export function paced(url, task) {
  const host = hostOf(url);
  const gap = HOST_MIN_GAP_MS[host] ?? DEFAULT_GAP_MS;
  if (!gap) return task();

  const prev = hostQueues.get(host) || Promise.resolve();
  // Chain, and swallow the predecessor's rejection so one failure cannot break
  // the queue for everything behind it.
  const next = prev.catch(() => {}).then(async () => {
    const result = await task();
    await sleep(gap);          // hold the slot open so the NEXT caller waits
    return result;
  });
  hostQueues.set(host, next.catch(() => {}));
  return next;
}

// ── Response cache ──────────────────────────────────────────────────────────
// A page load fans out to every source. Without this, opening the feed twice in
// a minute re-hammers Reddit and earns another 429 — the cache is part of the
// rate-limit fix, not just a speed-up.
//
// ASSUMPTION: 5 minutes. These are hot/new subreddit listings; a few minutes
// stale is invisible, and it collapses a burst of page loads into one fetch.
// Per-instance only: serverless gives each lambda its own memory, so this
// reduces load rather than guaranteeing a single fetch fleet-wide.
const CACHE_TTL_MS = 5 * 60 * 1000;
const responseCache = new Map();   // url → { at, ok, text, status, err }

function cacheGet(url) {
  const hit = responseCache.get(url);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) { responseCache.delete(url); return null; }
  return hit;
}

function cacheSet(url, value) {
  // Only cache SUCCESS. Caching a 429 would extend an outage well past the
  // moment the rate limit lifted.
  if (!value.ok) return;
  responseCache.set(url, { ...value, at: Date.now() });
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
  if (cached) return { ok: true, text: cached.text, cached: true };

  const backoffs = [0, 400, 1200];
  let last = { status: 0, err: 'unknown' };

  for (let i = 0; i < backoffs.length; i++) {
    if (backoffs[i]) await sleep(backoffs[i]);
    try {
      // Pace inside the retry loop so a retry also waits its turn behind any
      // other request queued for the same host.
      const r = await paced(target, () => fetch(target, {
        headers: headersFor(target),
        redirect: 'follow',
        cache: 'no-store',
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
