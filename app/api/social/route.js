// app/api/social/route.js — RSSHub ingestion for Instagram, LinkedIn, X + Reddit.
//
// GET /api/social            → every configured social source
// GET /api/social?category=  → just that category
//
// Mirrors the YouTube route's contract exactly: the key/base URL stays server-side,
// every failure is logged LOUDLY with the source + status, and a broken feed can
// never take the request down — it contributes zero items and the app still renders.
//
// ── SWAPPING TO A SELF-HOSTED RSSHUB ────────────────────────────────────────
// Set RSSHUB_BASE_URL and change nothing else:
//     RSSHUB_BASE_URL=https://rsshub.your-domain.com
// Every relative route in config/sources.js re-points automatically. Absolute
// routes (Reddit) are unaffected — they never touch RSSHub.
// ─────────────────────────────────────────────────────────────────────────────

import { SOCIAL_SOURCES, TOPIC_SOURCES, limitOf } from '../../../config/sources.js';
import { normalizeSignal } from '../../../lib/adapters.js';

// Fetching and parsing live in lib/ so /api/podcasts uses the SAME hardened
// path — the per-host pacing, the response cache and the 429/Retry-After
// handling are the Reddit rate-limit fix, and a podcast host deserves the same
// manners. One implementation, so the two routes cannot drift.
import { fetchFeed } from '../../../lib/feed-fetch.js';
import { parseFeed } from '../../../lib/feed-parser.js';

// GET handlers are dynamic by default since Next 15, but a live feed should say
// so out loud rather than depend on a default staying put.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Pacing Reddit at ~1.1s means a cold full feed takes ~20s for 18 subreddits.
// That is fine, but it must be ALLOWED to take that long: Vercel's default
// function timeout is shorter, and a killed function returns nothing and caches
// nothing, so the next load starts cold and dies the same way.
// Hobby caps at 10s regardless of this value — see DEADLINE_MS below, which is
// what actually keeps the response honest on a short-timeout host.
export const maxDuration = 60;

// ASSUMPTION: the free public instance is the starting point, per the
// "prove it free before self-hosting" phase. One env var moves it.
const DEFAULT_BASE = 'https://rsshub.app';

// ── X is the self-host trigger ──────────────────────────────────────────────
// /twitter/* requires TWITTER_AUTH_TOKEN configured ON THE RSSHUB INSTANCE —
// not in AetherHub, which never sees it. A shared public instance will not hold
// your token, so X routes fail there no matter how correct the handle is.
//
// The distinction matters to anyone reading the source rail: "HTTP 403" looks
// like a wrong handle, when in fact the handle is fine and the INSTANCE is the
// limitation. So a failure on a platform we know cannot work on the free tier
// is reported with that reason instead of a bare status code.
const PLATFORM_LIMITS = {
  X: {
    needs: 'TWITTER_AUTH_TOKEN',
    reason: 'X needs TWITTER_AUTH_TOKEN on your RSSHub instance — the public one cannot serve it',
  },
};

/** True when this base URL is the shared public instance. */
function isPublicInstance() {
  return baseUrl().includes('rsshub.app');
}

function baseUrl() {
  const raw = (process.env.RSSHUB_BASE_URL || DEFAULT_BASE).trim();
  return raw.replace(/\/+$/, ''); // tolerate a trailing slash in the env var
}

/** Relative routes go through RSSHub; absolute ones (Reddit) go direct. */
// ── Test fixture redirection ────────────────────────────────────────────────
// RSSHUB_BASE_URL only redirects RELATIVE routes. Reddit sources are ABSOLUTE
// (Reddit serves its own RSS and never touches RSSHub), so they escape it and
// hit the real reddit.com — including from the responsive audit, whose comment
// claimed it kept CI off the network entirely. That was only ever true of the
// RSSHub half.
//
// Harmless while those 18 fetches ran in parallel. Once they were paced at
// 1100ms with Retry-After backoff, and 429s deliberately went uncached, every
// one of the audit's 66 page loads re-paid the full serialised cost against a
// live host that rate-limits datacenter IPs. The audit stopped finishing.
//
// SOCIAL_FIXTURE_BASE redirects EVERY route, absolute ones included, keeping
// path and query. Unset in production and in any real deployment; the audit
// sets it, and that is what finally makes "no network in CI" true.
const fixtureBase = () => (process.env.SOCIAL_FIXTURE_BASE || '').trim().replace(/\/+$/, '');

function resolveTarget(route) {
  const r = String(route || '');
  const absolute = /^https?:\/\//i.test(r);

  const fixture = fixtureBase();
  if (fixture) {
    const path = absolute
      ? (u => u.pathname + u.search)(new URL(r))
      : (r.startsWith('/') ? r : `/${r}`);
    // viaRsshub still reflects what this source WOULD be, so the degraded-source
    // reporting the audit renders stays the same shape as in production.
    return { url: `${fixture}${path}`, viaRsshub: !absolute };
  }

  if (absolute) return { url: r, viaRsshub: false };
  return { url: `${baseUrl()}${r.startsWith('/') ? '' : '/'}${r}`, viaRsshub: true };
}

/**
 * One source → up to `limit` normalized signals. Never throws.
 * Returns { items, report } so the client can show which sources are degraded.
 */
async function loadSource(source) {
  const { url, viaRsshub } = resolveTarget(source.route);
  const limit = limitOf(source);
  const tagStr = `${source.platform}/${source.label}`;

  const res = await fetchFeed(url);

  if (!res.ok) {
    // FAIL LOUD: the server log names the source, the status and the reason.
    const limit = viaRsshub && isPublicInstance() ? PLATFORM_LIMITS[source.platform] : null;
    const reason = limit ? limit.reason : res.err;
    console.warn(`[social] ${tagStr} FAIL status=${res.status} (${reason}) via=${viaRsshub ? 'rsshub' : 'direct'} url=${url}`);
    return {
      items: [],
      report: {
        label: source.label, platform: source.platform, category: source.category,
        ok: false, status: res.status, error: reason, count: 0, topic: Boolean(source.topic),
        // Distinguishes "this cannot work here" from "this broke". The UI shows
        // the first as a known limitation, not as a fault to go chase.
        ...(limit ? { limitation: true, needs: limit.needs } : {}),
      },
    };
  }

  let parsed = [];
  try {
    parsed = parseFeed(res.text);
  } catch (e) {
    console.warn(`[social] ${tagStr} PARSE-ERROR ${e?.message}`);
    return { items: [], report: { label: source.label, platform: source.platform, category: source.category, ok: false, status: 200, error: 'parse', count: 0 } };
  }

  if (!parsed.length) {
    // A 200 with zero items is still a failure worth seeing — it usually means
    // RSSHub answered with an error page rather than a feed.
    console.warn(`[social] ${tagStr} EMPTY (200 but 0 items parsed)`);
    return { items: [], report: { label: source.label, platform: source.platform, category: source.category, ok: false, status: 200, error: 'empty', count: 0 } };
  }

  const items = parsed.slice(0, limit).map(it => normalizeSignal(
    {
      title:       it.title,
      content:     it.desc,
      url:         it.link,
      author:      it.author || source.label,
      publishedAt: it.pubDate,
      thumbnail:   it.img,
      platform:    source.platform,
      category:    source.category,
      subcategory: source.subcategory || null,
      sourceLabel: source.label,
      topic:       Boolean(source.topic),
      live:        true, // it came off the wire this request
      // RSS carries no engagement numbers — normalizeSignal scores on recency.
    },
    { platform: source.platform, category: source.category, label: source.label, subcategory: source.subcategory || null }
  ));

  return { items, report: { label: source.label, platform: source.platform, category: source.category, ok: true, status: 200, count: items.length, topic: Boolean(source.topic) } };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(request) {
  // `general` is the everything view, not a bucket — see FeedView.
  const raw = request.nextUrl.searchParams.get('category');
  const category = raw === 'general' ? null : raw;

  // Topic sources are ordinary sources with a query instead of an account, so
  // they join the same fetch set rather than getting their own endpoint.
  const pool = [...SOCIAL_SOURCES, ...TOPIC_SOURCES];
  const selected = category ? pool.filter(s => s.category === category) : pool;

  if (!selected.length) {
    return Response.json({ items: [], sources: [], base: baseUrl() });
  }

  // A deadline, so a slow host cannot turn into a dead endpoint. Whatever has
  // arrived by the cutoff is returned; the rest report as degraded with a
  // reason. Partial and honest beats a timeout that returns nothing — and
  // crucially, the sources that DID arrive get cached, so the next load is
  // faster rather than identically slow.
  // ASSUMPTION: 20s leaves headroom under maxDuration=60 and still fits a
  // 25s-ish platform cap. Lower it if you deploy somewhere stricter.
  const DEADLINE_MS = Number(process.env.SOCIAL_DEADLINE_MS) || 20_000;
  const deadline = new Promise(res => setTimeout(() => res('__deadline__'), DEADLINE_MS));

  try {
    // allSettled, not all: one rejection must not lose the other feeds.
    const settled = await Promise.allSettled(selected.map(src =>
      Promise.race([loadSource(src), deadline.then(() => ({
        items: [],
        report: {
          label: src.label, platform: src.platform, category: src.category,
          ok: false, status: 0, count: 0,
          error: `not finished within ${Math.round(DEADLINE_MS / 1000)}s`,
          deadline: true,
        },
      }))])
    ));

    const items = [];
    const sources = [];
    for (let i = 0; i < settled.length; i++) {
      const s = settled[i];
      if (s.status === 'fulfilled') {
        items.push(...s.value.items);
        sources.push(s.value.report);
      } else {
        const src = selected[i];
        console.warn(`[social] ${src.platform}/${src.label} REJECTED ${s.reason?.message || s.reason}`);
        sources.push({ label: src.label, platform: src.platform, category: src.category, ok: false, status: 0, error: 'rejected', count: 0 });
      }
    }

    const degraded = sources.filter(s => !s.ok).length;
    if (degraded) console.warn(`[social] ${degraded}/${sources.length} sources degraded`);

    return Response.json({ items, sources, degraded, base: baseUrl() });
  } catch (err) {
    // Must never take the request down.
    console.warn(`[social] EXCEPTION ${err?.message}`);
    return Response.json({ items: [], sources: [], degraded: selected.length, error: err?.message || 'exception', base: baseUrl() });
  }
}
