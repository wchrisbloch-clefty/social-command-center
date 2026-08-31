// app/api/recommend/route.js — "Recommended to Follow", mined server-side.
//
// GET /api/recommend  → { recommendations, mined, limits }
//
// Reads the same feed the Discover view reads, extracts accounts referenced by
// your sources, and ranks them by how many DISTINCT sources point at each.
// Entirely local — no external hub, no third-party graph API.

import { SOCIAL_SOURCES, YOUTUBE_SOURCES } from '../../../config/sources.js';
import { mineRecommendations } from '../../../lib/recommend.js';
import { ttlCache, wantsFresh } from '../../../lib/ttl-cache.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Co-mention mining reads the whole feed, so a cold call pays /api/social's
// ~20s pacing bill. Who your sources reference does not change in five minutes.
// `?fresh=1` bypasses it.
const cache = ttlCache('recommend', 5 * 60 * 1000);

async function localJson(request, path) {
  // Reuse our own routes rather than duplicating fetch logic, so a change to
  // how sources are pulled cannot silently skip the recommender.
  const url = new URL(path, request.nextUrl.origin);
  try {
    const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(25_000) });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    console.warn(`[recommend] ${path} → ${e?.message || 'failed'}`);
    return null;
  }
}

export async function GET(request) {
  if (!wantsFresh(request)) {
    const hit = cache.get('all');
    if (hit) return Response.json({ ...hit.value, cachedAt: hit.cachedAt, ageSeconds: hit.ageSeconds });
  }

  try {
    const [social, youtube] = await Promise.all([
      localJson(request, '/api/social'),
      localJson(request, '/api/youtube'),
    ]);

    const items = [...(social?.items || []), ...(youtube?.items || [])];
    const sources = [...SOCIAL_SOURCES, ...YOUTUBE_SOURCES];

    const recommendations = mineRecommendations(items, sources, { minSources: 2, limit: 20 });

    // Say plainly what the mining could see. A recommender that hides a thin
    // evidence base is worse than one that reports it.
    const limits = [];
    if (!items.length) {
      limits.push('No feed items were available to mine — every source is degraded or unconfigured.');
    }
    if (youtube?.needsKey) {
      limits.push('YOUTUBE_API_KEY is not set, so YouTube descriptions — the richest co-mention source — were not read.');
    }
    const xDegraded = (social?.sources || []).filter(s => s.platform === 'X' && !s.ok).length;
    if (xDegraded) {
      limits.push(`${xDegraded} X sources are degraded on the free instance, so X co-mention data is not represented.`);
    }

    if (!recommendations.length) console.warn('[recommend] mined 0 candidates from', items.length, 'items');

    const payload = { recommendations, mined: { items: items.length, sources: sources.length }, limits };
    // Only cache an answer that actually saw the feed. Caching a degraded empty
    // result would keep showing "nothing to recommend" for five minutes after
    // the upstream recovered.
    if (items.length) cache.set('all', payload);
    return Response.json({ ...payload, cachedAt: null, ageSeconds: 0 });
  } catch (err) {
    console.warn(`[recommend] EXCEPTION ${err?.message}`);
    return Response.json({ recommendations: [], mined: { items: 0, sources: 0 }, limits: ['Recommendation mining failed.'] });
  }
}
