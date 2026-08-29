// lib/recommend.js — "Recommended to Follow", mined locally.
//
// Surfaces accounts you do NOT follow that the accounts you DO follow keep
// pointing at, ranked by how many distinct trusted sources point at each.
//
// Entirely local: it reads the feed the pipeline already fetched and counts
// references. No external hub, no third-party graph API, no extra network.
//
// ── WHAT THIS CAN AND CANNOT SEE ────────────────────────────────────────────
// Honest limits, because a recommender that overstates its evidence is worse
// than none:
//
//   • YouTube descriptions and RSS bodies mention other accounts in plain text
//     ("@handle", "with Guest Name", "via Channel"). That is the signal here.
//   • YouTube's related-channels API was retired, so there is no graph to walk.
//   • X co-mention data is behind auth on the free instance, so X-native
//     recommendations will be thin until you self-host.
//
// Net effect: this leans YouTube-heavy on the free tier. That is the honest
// shape of the available data, not a bug to paper over.

import { alreadyFollowed, categorize, normalizeHandle } from './categorize.js';

// Handles that appear everywhere and mean nothing as a recommendation.
// ASSUMPTION: a starter stop-list; extend it as noise shows up.
const STOPLIST = new Set([
  'youtube', 'youtu', 'subscribe', 'patreon', 'instagram', 'twitter', 'x',
  'tiktok', 'facebook', 'discord', 'spotify', 'apple', 'podcast', 'podcasts',
  'gmail', 'email', 'shorts', 'live', 'channel', 'here', 'link', 'links',
  'me', 'us', 'the', 'and', 'for', 'reddit', 'linkedin', 'http', 'https',
]);

const MIN_HANDLE = 3;
const MAX_HANDLE = 30;

/** @handle mentions in free text. */
function extractHandles(text) {
  const out = new Set();
  for (const m of String(text || '').matchAll(/@([A-Za-z0-9_.]{3,30})\b/g)) {
    const h = m[1].replace(/[._]+$/, '');
    const key = normalizeHandle(h);
    if (key.length < MIN_HANDLE || key.length > MAX_HANDLE) continue;
    if (STOPLIST.has(key)) continue;
    if (/^\d+$/.test(key)) continue; // bare numbers are never handles
    out.add(h);
  }
  return [...out];
}

/**
 * Guest / collaborator names: "with Jane Doe", "ft. Jane Doe", "| Jane Doe".
 * Deliberately conservative — two capitalised words only. A loose pattern here
 * produces confident-looking garbage.
 */
function extractNames(text) {
  const out = new Set();
  const s = String(text || '');
  const patterns = [
    /\b(?:with|w\/|ft\.?|feat\.?|featuring|guest:?)\s+([A-Z][a-z]+ [A-Z][a-z]+)/g,
    /\|\s*([A-Z][a-z]+ [A-Z][a-z]+)\s*(?:\||$)/g,
  ];
  for (const re of patterns) {
    for (const m of s.matchAll(re)) {
      const name = m[1].trim();
      if (name.split(' ').every(w => STOPLIST.has(w.toLowerCase()))) continue;
      out.add(name);
    }
  }
  return [...out];
}

/**
 * Mine recommendations from a normalized feed.
 *
 * @param {object[]} items    normalized signals
 * @param {object[]} sources  everything currently followed (social + youtube)
 * @param {object}   opts
 * @returns {object[]} ranked candidates
 */
export function mineRecommendations(items, sources, { minSources = 2, limit = 20 } = {}) {
  // candidateKey → { display, kind, sourcesPointing:Set, categories:Map, examples:[] }
  const found = new Map();

  // Names we already follow, so a source mentioning a peer we have is not a
  // "recommendation".
  const followedNames = new Set(
    sources.flatMap(s => [s.person, s.label].filter(Boolean).map(x => x.toLowerCase()))
  );

  for (const item of items) {
    const text = `${item.title || ''} ${item.content || ''}`;
    const from = item.sourceLabel || item.author || 'a source';

    const candidates = [
      ...extractHandles(text).map(h => ({ display: `@${h}`, handle: h, kind: 'handle' })),
      ...extractNames(text).map(n => ({ display: n, handle: null, kind: 'name' })),
    ];

    for (const c of candidates) {
      const key = c.kind === 'handle' ? `h:${normalizeHandle(c.handle)}` : `n:${c.display.toLowerCase()}`;

      // Skip anything that IS one of our sources, by name or by handle.
      if (followedNames.has(c.display.toLowerCase().replace(/^@/, ''))) continue;
      if (c.handle && alreadyFollowed(sources, { platform: item.platform, handle: c.handle, route: '' })) continue;

      if (!found.has(key)) {
        found.set(key, {
          key, display: c.display, handle: c.handle, kind: c.kind,
          platform: item.platform,
          sourcesPointing: new Set(),
          categories: new Map(),
          examples: [],
        });
      }
      const rec = found.get(key);
      rec.sourcesPointing.add(from);
      rec.categories.set(item.category, (rec.categories.get(item.category) || 0) + 1);
      if (rec.examples.length < 3) rec.examples.push({ from, title: item.title, url: item.url });
      // Prefer YouTube as the suggested platform — it is the one that actually
      // pulls on the free tier.
      if (item.platform === 'YouTube') rec.platform = 'YouTube';
    }
  }

  return [...found.values()]
    .filter(r => r.sourcesPointing.size >= minSources)
    .map(r => {
      const topCategory = [...r.categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';
      const auto = categorize(`${r.display} ${r.examples.map(e => e.title).join(' ')}`, topCategory);
      const n = r.sourcesPointing.size;
      return {
        key: r.key,
        display: r.display,
        handle: r.handle,
        kind: r.kind,
        platform: r.platform,
        category: auto.category,
        categoryConfidence: auto.confidence,
        pointingCount: n,
        pointingSources: [...r.sourcesPointing],
        // The reason is shown verbatim in the UI. It states the evidence, not a
        // score — "3 of your Energy sources referenced this".
        reason: `${n} of your ${r.categories.size === 1 ? '' : ''}sources referenced this`.replace('  ', ' '),
        examples: r.examples,
      };
    })
    .sort((a, b) => b.pointingCount - a.pointingCount || a.display.localeCompare(b.display))
    .slice(0, limit);
}

/**
 * The exact config line an "Add to Follow" writes.
 *
 * Byte-identical to a hand-written source except for the provenance comment —
 * that is the whole point: once added, nothing downstream can tell the
 * difference, because there is only one list.
 */
export function configLineFor(rec, { category, date = new Date() } = {}) {
  const cat = category || rec.category || 'general';
  const day = date.toISOString().slice(0, 10);
  const why = `Added via Recommended to Follow ${day} — ${rec.reason}`;

  if (rec.platform === 'YouTube' && rec.handle) {
    return {
      array: 'YOUTUBE_SOURCES',
      line: `  // ${why}\n  { platform: 'YouTube', person: ${JSON.stringify(rec.display.replace(/^@/, ''))}, handle: ${JSON.stringify(rec.handle)}, label: ${JSON.stringify(rec.display)}, category: '${cat}', limit: 3 },`,
    };
  }
  if (rec.handle) {
    const route = rec.platform === 'Instagram' ? `/instagram/2/user/${rec.handle}`
                : rec.platform === 'Reddit'    ? `https://www.reddit.com/r/${rec.handle}/hot/.rss`
                : `/twitter/user/${rec.handle}`;
    const platform = ['X', 'Instagram', 'Reddit'].includes(rec.platform) ? rec.platform : 'X';
    return {
      array: 'SOCIAL_SOURCES',
      line: `  // ${why}\n  { platform: '${platform}', person: ${JSON.stringify(rec.display.replace(/^@/, ''))}, route: ${JSON.stringify(route)}, label: ${JSON.stringify(rec.display)}, category: '${cat}', limit: 5 },`,
    };
  }
  // A name with no handle cannot become a route. Surfaced, not auto-added.
  return null;
}
