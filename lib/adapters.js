// lib/adapters.js — the signal pipeline.
//
//   raw feed item ──▶ normalizeSignal() ──▶ tiered signal ──▶ category filter ──▶ UI
//
// EVERY signal in the app goes through normalizeSignal(). It is the only place a
// tier is assigned, and it can never return an un-tiered signal — that is the
// invariant the UI depends on to render its tier badge unconditionally.
//
// Imported from BOTH sides: the API routes normalize at ingestion (server), and
// getFeed() re-normalizes what comes back (client). One implementation, so the
// two can never drift.

import {
  PLATFORM_TIER,
  FALLBACK_TIER,
  DEFAULT_CATEGORY,
  CATEGORY_IDS,
} from '../config/sources.js';

// ─── Platform capability ─────────────────────────────────────────────────────
// 'live'   → a real adapter fetches this platform
// 'manual' → no adapter; anything shown is demo/seed data
//
// Instagram/LinkedIn/X/Reddit moved manual → live in this change. TikTok has no
// adapter and stays manual, which is why the badge is per-platform and not a
// constant.
export const PLATFORM_STATUS = {
  YouTube:   'live',   // official Data API v3
  Instagram: 'live',   // RSSHub
  LinkedIn:  'live',   // RSSHub
  X:         'live',   // RSSHub (needs a token on the public instance — may fall back)
  Reddit:    'live',   // native Reddit RSS
  Podcast:   'live',   // the show's own RSS feed — no RSSHub, no API key
  TikTok:    'manual', // no adapter
};

// A third tier. Every consumer reads TIERS rather than hardcoding two, so
// adding one here is the whole change — see TIER_WORD in app/page.jsx for the
// word each renders as.
export const TIERS = ['mainstream', 'street', 'podcast'];

// ─── Time / number formatting ────────────────────────────────────────────────

export function hoursSince(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return (Date.now() - t) / 3_600_000;
}

export function relTime(iso) {
  const h = hoursSince(iso);
  if (!Number.isFinite(h) || h < 0) return 'now';
  if (h < 1)  return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

export function fmtCount(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/** Views-per-hour scoring. The original AetherHub/MyNewsHub curve, unchanged. */
export function scoreSignal(views, ageHours) {
  const vph = (Number(views) || 0) / Math.max(Number(ageHours) || 0, 1);
  let signal, velocityNum;
  if (vph > 50_000)     { signal = 'high';     velocityNum = Math.round(vph / 1000) * 10; }
  else if (vph > 5_000) { signal = 'rising';   velocityNum = Math.round(vph / 100)  * 5;  }
  else                  { signal = 'moderate'; velocityNum = Math.round(vph / 100);        }
  return { signal, velocity: `+${velocityNum}%` };
}

/**
 * Recency-only scoring, for sources that carry no engagement numbers.
 *
 * RSS is one of those: an Instagram/LinkedIn/X/Reddit item arrives with a title,
 * a link and a timestamp and nothing else. Running scoreSignal() on views=0
 * would stamp every one of them 'moderate' and flatten the whole feed, so
 * freshness stands in for heat instead.
 * ASSUMPTION: <2h is hot, <8h is rising, older is moderate.
 */
export function scoreByRecency(ageHours) {
  const h = Number(ageHours) || 0;
  if (h < 2)  return { signal: 'high',     velocity: 'fresh' };
  if (h < 8)  return { signal: 'rising',   velocity: 'recent' };
  return             { signal: 'moderate', velocity: 'today'  };
}

export function extractBuzz(text) {
  return String(text || '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 4)
    .slice(0, 6);
}

// ─── The normalizer ──────────────────────────────────────────────────────────

function firstLine(s, max = 180) {
  const line = String(s || '').split('\n').find(l => l.trim()) || '';
  return line.trim().slice(0, max);
}

function safeIso(v) {
  if (!v) return new Date().toISOString();
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
}

/**
 * Map any raw item onto the standard signal object.
 *
 * The contract, which nothing downstream re-checks because it cannot be violated:
 *   • `tier` is always one of TIERS
 *   • `category` is always a known category id
 *   • `signal` is always high | rising | moderate
 *   • `publishedAt` is always a valid ISO string
 *   • `live` is always a boolean → drives the LIVE/MANUAL badge
 */
export function normalizeSignal(raw = {}, ctx = {}) {
  const platform = raw.platform || ctx.platform || 'Unknown';

  // Tier is DERIVED. A caller cannot pass one in and cannot end up without one.
  const tier = PLATFORM_TIER[platform] || FALLBACK_TIER;

  const category = CATEGORY_IDS.includes(raw.category) ? raw.category
                 : CATEGORY_IDS.includes(ctx.category) ? ctx.category
                 : DEFAULT_CATEGORY;

  const publishedAt = safeIso(raw.publishedAt || raw.pubDate || raw.time);
  const ageHours    = hoursSince(publishedAt);

  // Views are real for YouTube and absent for every RSS source — so the scoring
  // curve switches rather than pretending zero views means "cold".
  const views    = Number(raw.views) || 0;
  const hasViews = views > 0;
  const { signal, velocity } = hasViews
    ? scoreSignal(views, ageHours)
    : scoreByRecency(ageHours);

  const title   = firstLine(raw.title || raw.content || '') || '(untitled)';
  const content = String(raw.content || raw.desc || raw.summary || '').trim();

  // `live` reflects THIS item's provenance, not just the platform's capability:
  // a demo/seed item on a live platform must still badge MANUAL.
  const live = typeof raw.live === 'boolean'
    ? raw.live
    : PLATFORM_STATUS[platform] === 'live';

  return {
    id:        String(raw.id || raw.url || raw.link || `${platform}-${publishedAt}-${title.slice(0, 24)}`),
    platform,
    tier,                                         // ← the invariant
    status:    PLATFORM_STATUS[platform] || 'manual',
    live,
    category,
    title,
    content,
    url:       String(raw.url || raw.link || ''),
    author:    String(raw.author || '').slice(0, 80),
    sourceLabel: String(raw.sourceLabel || ctx.label || raw.author || platform),
    publishedAt,
    ageHours,
    time:      relTime(publishedAt),
    views,
    engagement: raw.engagement || (hasViews ? `${fmtCount(views)} views` : ''),
    thumbnail: String(raw.thumbnail || raw.img || ''),
    bw:        Array.isArray(raw.bw) && raw.bw.length ? raw.bw.slice(0, 6) : extractBuzz(title),
    signal,
    velocity,
    // Came from a keyword/hashtag source rather than a followed account.
    topic:     Boolean(raw.topic),
    // Sports league/team, or null. Set by the source, never inferred here —
    // the velocity engine filters on it for the drill-down views.
    subcategory: raw.subcategory || ctx.subcategory || null,

    // ── Podcast extras ──────────────────────────────────────────────────────
    // Present only for platform 'Podcast', null everywhere else. An episode is
    // a signal like any other and goes through this same function; these are
    // the fields a generic feed item has no use for.
    //
    // `provenance` is the honesty flag and the audio-transcription socket:
    //   'show-notes'  the publisher's own episode description — ALL we have
    //                 today, and all any summary may be built from
    //   'captions'    a real caption/transcript track          (not wired)
    //   'audio'       speech-to-text on the episode audio      (not wired)
    // It is a field rather than a boolean precisely so attaching transcription
    // later changes the value, not the shape. See lib/podcast-summary.js.
    podcast: platform === 'Podcast' ? {
      show:       String(raw.show || ctx.label || ''),
      duration:   String(raw.duration || ''),
      audioUrl:   String(raw.audioUrl || ''),
      artwork:    String(raw.episodeImg || raw.artwork || raw.img || ''),
      provenance: raw.provenance || 'show-notes',
      // How much text the publisher actually gave us. The summarizer and the
      // topic miner both need to say when a show is contributing almost
      // nothing, and this is the number they say it with.
      notesChars: Number(raw.notesChars) || String(raw.content || raw.notes || '').length,
    } : null,
  };
}

// ─── Feed assembly ───────────────────────────────────────────────────────────

const RANK = { high: 3, rising: 2, moderate: 1 };

/** Signal strength first, then recency. Stable and cheap. */
export function sortSignals(items) {
  return [...items].sort((a, b) => {
    const r = (RANK[b.signal] || 0) - (RANK[a.signal] || 0);
    if (r !== 0) return r;
    return new Date(b.publishedAt) - new Date(a.publishedAt);
  });
}

async function getJson(url, signal) {
  try {
    const r = await fetch(url, { signal, cache: 'no-store' });
    if (!r.ok) {
      console.warn(`[getFeed] ${url} → HTTP ${r.status}`);
      return null;
    }
    return await r.json();
  } catch (e) {
    if (e?.name === 'AbortError') return null;
    console.warn(`[getFeed] ${url} → ${e?.message || 'network error'}`);
    return null;
  }
}

/**
 * Fetch every configured source and return one normalized, sorted feed.
 *
 * Fails soft by design: a dead endpoint contributes zero items and a warning,
 * never an exception. The caller always receives a renderable shape.
 *
 * @returns {Promise<{items, sources, degraded, youtubeNeedsKey}>}
 */
export async function getFeed({ category = null, signal } = {}) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';

  const [social, youtube] = await Promise.all([
    getJson(`/api/social${qs}`, signal),
    getJson(`/api/youtube${qs}`, signal),
  ]);

  const raw = [
    ...(social?.items || []),
    ...(youtube?.items || []),
  ];

  // Re-normalize on the way in. The routes already did this, but running it
  // again is what makes "nothing renders un-tiered" a property of the pipeline
  // rather than a promise about two files staying in sync.
  const items = sortSignals(raw.map(item => normalizeSignal(item)));

  const sources = [...(social?.sources || []), ...(youtube?.sources || [])];

  return {
    items,
    sources,
    degraded: sources.filter(s => !s.ok).length,
    youtubeNeedsKey: Boolean(youtube?.needsKey),
  };
}

/** Filter an already-normalized feed by category. */
export function filterByCategory(items, category) {
  if (!category) return items;
  return items.filter(i => i.category === category);
}
