// app/api/suggest-categories/route.js — content-driven category suggestions.
//
// GET /api/suggest-categories → { suggestions, mined, limits }
//
// Reads the same feed everything else reads and asks which THEMES recur across
// sources. Advisory only: this endpoint never creates or moves anything. The
// manager does that, on your tap, through /api/categories.

import { suggestCategories } from '../../../lib/themes.js';
import { CATEGORIES } from '../../../config/categories.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function localJson(request, path) {
  try {
    const r = await fetch(new URL(path, request.nextUrl.origin), {
      cache: 'no-store', signal: AbortSignal.timeout(25_000),
    });
    return r.ok ? await r.json() : null;
  } catch (e) {
    console.warn(`[suggest] ${path} → ${e?.message || 'failed'}`);
    return null;
  }
}

export async function GET(request) {
  const windowHours = Number(request.nextUrl.searchParams.get('window')) || 168;
  const dismissed = (request.nextUrl.searchParams.get('dismissed') || '').split(',').filter(Boolean);

  try {
    const [social, youtube] = await Promise.all([
      localJson(request, '/api/social'),
      localJson(request, '/api/youtube'),
    ]);
    const items = [...(social?.items || []), ...(youtube?.items || [])];

    const suggestions = suggestCategories(items, { windowHours, existing: CATEGORIES, dismissed });

    // Theme detection is only as good as the text it can read. Say what was
    // missing rather than presenting a thin result as a confident one.
    const limits = [];
    const okSources = (social?.sources || []).filter(s => s.ok).length;
    const degraded  = (social?.sources || []).filter(s => !s.ok).length;

    if (!items.length) {
      limits.push('No feed items were available, so no themes could be extracted at all.');
    } else if (items.length < 30) {
      limits.push(`Only ${items.length} items were readable — themes from a pool this small are weak evidence.`);
    }
    if (youtube?.needsKey) {
      limits.push('YOUTUBE_API_KEY is not set. YouTube titles and descriptions are the richest text available, so themes are thin without it.');
    }
    if (degraded) {
      limits.push(`${degraded} of ${okSources + degraded} sources are degraded and contributed no text.`);
    }

    console.warn(`[suggest] mined ${suggestions.length} suggestions from ${items.length} items over ${windowHours}h`);

    return Response.json({
      suggestions,
      mined: { items: items.length, windowHours, sourcesOk: okSources, sourcesDegraded: degraded },
      limits,
    });
  } catch (err) {
    console.warn(`[suggest] EXCEPTION ${err?.message}`);
    return Response.json({ suggestions: [], mined: { items: 0 }, limits: ['Theme extraction failed.'] });
  }
}
