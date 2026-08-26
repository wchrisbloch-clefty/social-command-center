// app/api/youtube/route.js — YouTube stays on the OFFICIAL Data API v3.
//
// GET /api/youtube            → latest uploads for every configured channel
// GET /api/youtube?category=  → just that category's channels
//
// Deliberately NOT RSSHub. YouTube is the one platform with a real, free,
// documented API that returns engagement numbers, so it keeps its own path and
// is the only source in the app whose signal scoring uses actual view counts.
//
// The key never reaches the client. No key → { needsKey: true, items: [] } and
// the app renders without it.

import { YOUTUBE_SOURCES, TRACKED_QUERIES, limitOf } from '../../../config/sources.js';
import { normalizeSignal } from '../../../lib/adapters.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const YT = 'https://www.googleapis.com/youtube/v3';
const TIMEOUT_MS = 9000;

async function ytGet(path, params, key) {
  const qs = new URLSearchParams({ ...params, key }).toString();
  const r = await fetch(`${YT}/${path}?${qs}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) {
    // FAIL LOUD — but never leak the key into the log line.
    const body = await r.text().catch(() => '');
    const reason = body.match(/"reason":\s*"([^"]+)"/)?.[1] || `HTTP ${r.status}`;
    throw new Error(`${path} → ${reason}`);
  }
  return r.json();
}

/** One API video → a normalized signal. Views are real here, so scoreSignal runs. */
function toSignal(video, source) {
  const { id, snippet, statistics } = video;
  const videoId = typeof id === 'string' ? id : id?.videoId;
  const views = parseInt(statistics?.viewCount || '0', 10);

  // Prefer the largest thumbnail the API actually returned.
  const th = snippet?.thumbnails || {};
  const thumbnail = (th.maxres || th.standard || th.high || th.medium || th.default)?.url || '';

  return normalizeSignal(
    {
      id:          videoId,
      platform:    'YouTube',
      title:       snippet?.title || '',
      content:     (snippet?.description || '').slice(0, 400),
      url:         videoId ? `https://youtube.com/watch?v=${videoId}` : '',
      author:      snippet?.channelTitle || source?.label || 'YouTube',
      publishedAt: snippet?.publishedAt,
      views,
      thumbnail,
      bw:          (snippet?.tags || []).slice(0, 4),
      category:    source?.category,
      sourceLabel: source?.label || snippet?.channelTitle,
      live:        true,
    },
    { platform: 'YouTube', category: source?.category, label: source?.label }
  );
}

/** Latest uploads for one channel handle. Never throws — logs and returns []. */
async function channelVideos(source, key) {
  const limit = limitOf(source);
  try {
    const chan = await ytGet('channels', {
      part: 'contentDetails,snippet',
      forHandle: source.handle,
    }, key);

    const channel = chan.items?.[0];
    if (!channel) {
      console.warn(`[youtube] @${source.handle} NOT FOUND`);
      return { items: [], report: { label: source.label, platform: 'YouTube', category: source.category, ok: false, status: 404, error: 'channel not found', count: 0 } };
    }

    const uploadsId = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) {
      console.warn(`[youtube] @${source.handle} NO UPLOADS PLAYLIST`);
      return { items: [], report: { label: source.label, platform: 'YouTube', category: source.category, ok: false, status: 200, error: 'no uploads playlist', count: 0 } };
    }

    const playlist = await ytGet('playlistItems', {
      part: 'snippet',
      maxResults: String(limit),
      playlistId: uploadsId,
    }, key);

    const ids = (playlist.items || [])
      .map(i => i.snippet?.resourceId?.videoId)
      .filter(Boolean);

    if (!ids.length) {
      console.warn(`[youtube] @${source.handle} EMPTY (0 uploads)`);
      return { items: [], report: { label: source.label, platform: 'YouTube', category: source.category, ok: false, status: 200, error: 'empty', count: 0 } };
    }

    // Second call is what gets statistics — the playlist response has no view counts.
    const detail = await ytGet('videos', { part: 'snippet,statistics', id: ids.join(',') }, key);
    const items = (detail.items || []).slice(0, limit).map(v => toSignal(v, source));

    return { items, report: { label: source.label, platform: 'YouTube', category: source.category, ok: true, status: 200, count: items.length } };
  } catch (e) {
    console.warn(`[youtube] @${source.handle} FAIL ${e?.message || e}`);
    return { items: [], report: { label: source.label, platform: 'YouTube', category: source.category, ok: false, status: 0, error: e?.message || 'error', count: 0 } };
  }
}

/** Keyword sweep for a category — TRACKED_QUERIES. Never throws. */
async function searchQuery(query, category, key) {
  try {
    const found = await ytGet('search', {
      part: 'snippet', q: query, type: 'video', order: 'viewCount', maxResults: '5',
    }, key);

    const ids = (found.items || []).map(i => i.id?.videoId).filter(Boolean);
    if (!ids.length) return { items: [], report: { label: `“${query}”`, platform: 'YouTube', category, ok: true, status: 200, count: 0 } };

    const detail = await ytGet('videos', { part: 'snippet,statistics', id: ids.join(',') }, key);
    const items = (detail.items || []).map(v => toSignal(v, { label: `“${query}”`, category }));
    return { items, report: { label: `“${query}”`, platform: 'YouTube', category, ok: true, status: 200, count: items.length } };
  } catch (e) {
    console.warn(`[youtube] search "${query}" FAIL ${e?.message || e}`);
    return { items: [], report: { label: `“${query}”`, platform: 'YouTube', category, ok: false, status: 0, error: e?.message || 'error', count: 0 } };
  }
}

export async function GET(request) {
  const key = process.env.YOUTUBE_API_KEY;
  const category = request.nextUrl.searchParams.get('category');

  // Graceful fallback: no key is a normal state, not an error. The app renders.
  if (!key) {
    console.warn('[youtube] YOUTUBE_API_KEY not set — YouTube signals disabled');
    return Response.json({ items: [], sources: [], needsKey: true });
  }

  const channels = category
    ? YOUTUBE_SOURCES.filter(s => s.category === category)
    : YOUTUBE_SOURCES;

  // Keyword sweeps: the selected category's, or every category's when unfiltered.
  const queries = category
    ? (TRACKED_QUERIES[category] || []).map(q => ({ q, category }))
    : Object.entries(TRACKED_QUERIES).flatMap(([cat, qs]) => (qs || []).map(q => ({ q, category: cat })));

  try {
    const settled = await Promise.allSettled([
      ...channels.map(s => channelVideos(s, key)),
      ...queries.map(({ q, category: c }) => searchQuery(q, c, key)),
    ]);

    const items = [];
    const sources = [];
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        items.push(...s.value.items);
        sources.push(s.value.report);
      } else {
        console.warn(`[youtube] REJECTED ${s.reason?.message || s.reason}`);
      }
    }

    // The same video can arrive from a channel and a keyword sweep.
    const seen = new Set();
    const deduped = items.filter(i => (seen.has(i.id) ? false : seen.add(i.id)));

    const degraded = sources.filter(s => !s.ok).length;
    if (degraded) console.warn(`[youtube] ${degraded}/${sources.length} sources degraded`);

    return Response.json({ items: deduped, sources, degraded });
  } catch (err) {
    console.warn(`[youtube] EXCEPTION ${err?.message}`);
    return Response.json({ items: [], sources: [], degraded: channels.length, error: err?.message || 'exception' });
  }
}
