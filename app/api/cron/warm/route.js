// app/api/cron/warm/route.js — keep every feed cached so no page load fetches.
//
// GET /api/cron/warm  → { warmed, failed, elapsedMs, sources[] }
//
// ── WHY THIS IS THE DEEPEST FIX ─────────────────────────────────────────────
// Rate limiting bounds how fast we may ask. Caching bounds how often we have
// to. But a cache only helps the SECOND visitor — someone always pays for the
// cold fetch, and on a feed with 13 rate-limited sources that someone waits
// ~14 seconds.
//
// A scheduled warm-up moves that cost off the request path entirely. The cron
// pays it on a timer, nobody is watching, and every real page load is a cache
// hit. Combined with stale-while-revalidate the cache then never goes cold:
// entries stay fresh, and if a run is missed the stale band covers the gap.
//
// ── WIRING IT ───────────────────────────────────────────────────────────────
// vercel.json schedules this every 5 minutes, matching CACHE_FRESH_MS so an
// entry is refreshed about when it stops being fresh.
//
// IMPORTANT, and the reason this is honest rather than theatre: Vercel runs
// each cron in its own lambda, and the response cache is per-instance memory.
// So this guarantees a warm cache only where instances are reused or a single
// instance serves the traffic — a small personal hub, which is what AetherHub
// is. On a fleet it reduces cold loads rather than eliminating them. A shared
// cache (Vercel KV, Redis) is the fix for that, and it is a bigger change than
// this pass: noted in README under Social ingestion rather than half-built.
//
// Unauthenticated by design: it neither reads user data nor writes anything —
// it only pre-fetches public feeds that any visitor's page load would fetch
// anyway. Vercel sets `x-vercel-cron: 1` on its own invocations, and that is
// reported so an unexpected caller is visible in the logs.

import { SOCIAL_SOURCES, TOPIC_SOURCES, PODCAST_SOURCES } from '../../../../config/sources.js';
import { fetchFeed, cacheStatus } from '../../../../lib/feed-fetch.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// The whole point is to absorb the slow path so requests do not. Every source
// in the app, paced, needs more room than a single category does.
export const maxDuration = 300;

/** Every fetchable URL in the app, de-duplicated. */
function allTargets() {
  const urls = new Map();
  for (const s of [...SOCIAL_SOURCES, ...TOPIC_SOURCES]) {
    const r = String(s.route || '');
    const url = /^https?:\/\//i.test(r)
      ? r
      : `${(process.env.RSSHUB_BASE_URL || 'https://rsshub.app').replace(/\/+$/, '')}${r.startsWith('/') ? '' : '/'}${r}`;
    if (url) urls.set(url, s.label);
  }
  for (const p of PODCAST_SOURCES) if (p.feedUrl) urls.set(p.feedUrl, p.label);
  return [...urls.entries()].map(([url, label]) => ({ url, label }));
}

export async function GET(request) {
  const startedAt = Date.now();
  const byCron = request.headers.get('x-vercel-cron') === '1';
  const targets = allTargets();

  console.warn(`[warm] starting — ${targets.length} sources (${byCron ? 'scheduled' : 'manual'})`);

  // Fired together on purpose. The per-host scheduler in lib/feed-fetch.js is
  // what spaces them; doing it here too would apply the limit twice and take
  // twice as long for no benefit. Hosts that are NOT rate limited run fully in
  // parallel, which is the whole reason the warm-up finishes in reasonable time.
  const results = await Promise.all(targets.map(async ({ url, label }) => {
    try {
      const res = await fetchFeed(url);
      return { url, label, ok: Boolean(res.ok), status: res.status ?? 200, cached: res.cached || 'live' };
    } catch (e) {
      return { url, label, ok: false, status: 0, error: e?.message || 'threw' };
    }
  }));

  const warmed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  const elapsedMs = Date.now() - startedAt;

  console.warn(`[warm] ${warmed}/${results.length} cached in ${(elapsedMs / 1000).toFixed(1)}s` +
    (failed.length ? ` — failed: ${failed.map(f => f.label).join(', ')}` : ''));

  return Response.json({
    warmed,
    failed: failed.length,
    total: results.length,
    elapsedMs,
    scheduled: byCron,
    sources: results.map(({ url, ...r }) => ({ ...r, cache: cacheStatus(url) })),
  });
}
