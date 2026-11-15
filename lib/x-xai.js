// lib/x-xai.js — the SUPPORTED X path: xAI live search, one request per handle, restricted
// to X. Isolated and fail-soft: an error here never breaks /api/social. See x-provider.js.
//
// COST GUARDS (xAI bills per call): ≤10 X calls per refresh, results cached ≥6h, a hard daily
// cap (X_DAILY_CAP, default 40), 8s per-call timeout. The warm cron reuses the same 6h cache,
// so it can never call X more than once per handle per 6h.

import { normalizeSignal } from './adapters.js';
import { ttlCache } from './ttl-cache.js';

export const MAX_X_CALLS_PER_REFRESH = 10;
export const DEFAULT_DAILY_CAP = 40;
const SIX_HOURS = 6 * 3_600_000;
const DAY = 24 * 3_600_000;

const postsCache = ttlCache('x-xai-posts', SIX_HOURS);  // route -> items (≥6h)
const capCache   = ttlCache('x-xai-cap', DAY);          // 'YYYY-MM-DD' -> count

const dailyCap = () => Number(process.env.X_DAILY_CAP) || DEFAULT_DAILY_CAP;
const dayKey   = (now) => new Date(now).toISOString().slice(0, 10);
const model    = () => process.env.X_XAI_MODEL || 'grok-4-fast';

function callsToday(now) { const h = capCache.get(dayKey(now)); return h ? Number(h.value) : 0; }
function bumpCalls(now)  { capCache.set(dayKey(now), callsToday(now) + 1); }

/** PURE: parse a handle out of an X route ('/twitter/user/sama' → 'sama', keyword → the query). */
export function handleFromRoute(route = '') {
  const m = String(route).match(/\/twitter\/(?:user|keyword|list)\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]) : '';
}

/** PURE: map a parsed xAI `{posts:[{text,url,time?}]}` into normalized signals for a source. */
export function mapXaiPosts(posts, source, now = Date.now()) {
  return (Array.isArray(posts) ? posts : [])
    .filter(p => p && p.text && p.url && /^https?:\/\//.test(p.url))
    .slice(0, source.limit || 5)
    .map(p => normalizeSignal({
      title:       String(p.text).slice(0, 200),
      content:     String(p.text).slice(0, 280),
      url:         String(p.url),
      author:      source.label,
      publishedAt: p.time || new Date(now).toISOString(),
      platform:    'X',
      category:    source.category,
      sourceLabel: source.label,
      topic:       Boolean(source.topic),
      live:        true,
      provider:    'xai',          // card renders "via xAI"; tier 'street' = "Alt. perspective"
    }, { platform: 'X', category: source.category, label: source.label }));
}

const PROMPT = (handle, topic) => topic
  ? `Search X for the most recent real posts matching: "${handle}". Return STRICT JSON ONLY, no prose, no fences:\n{"posts":[{"text":"...","url":"https://x.com/..."}]}\nRules: up to 5 posts, each a DIFFERENT real recent post; text under 220 chars quoted/tightly paraphrased; url is the direct link to that exact post on x.com. If none, {"posts":[]}.`
  : `Search X for the most recent real posts from @${handle}. Return STRICT JSON ONLY, no prose, no fences:\n{"posts":[{"text":"...","url":"https://x.com/..."}]}\nRules: up to 5 posts, each a DIFFERENT real recent post by @${handle}; text under 220 chars quoted/tightly paraphrased; url is the direct link to that exact post on x.com. If none, {"posts":[]}.`;

/** One live-search request for one handle. Returns parsed posts or []. Never throws. */
async function fetchOne(source, apiKey) {
  const handle = handleFromRoute(source.route);
  if (!handle) return [];
  const sources = [{ type: 'x', ...(source.topic ? {} : { x_handles: [handle] }) }];
  try {
    const r = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model(),
        messages: [{ role: 'user', content: PROMPT(source.topic ? source.query || handle : handle, source.topic) }],
        temperature: 0.2,
        max_tokens: 900,
        search_parameters: { mode: 'on', sources, max_search_results: 15, return_citations: true },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) { console.warn(`[x-xai] ${source.label} HTTP ${r.status}`); return []; }
    const d = await r.json();
    const content = String(d?.choices?.[0]?.message?.content || '').replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) return [];
    return JSON.parse(m[0]).posts || [];
  } catch (e) {
    console.warn(`[x-xai] ${source.label} ${e?.name || 'error'} ${e?.message || ''}`);
    return [];
  }
}

/**
 * Fetch X for the given X sources via xAI. Fail-soft and cost-guarded.
 * @returns {Promise<{ items:any[], calls:number, capped:boolean, served:number }>}
 */
export async function fetchXViaXai(xSources, { apiKey, now = Date.now() } = {}) {
  const items = [];
  let calls = 0, served = 0, capped = false;
  // ≤10 handles per refresh — the cap is on live calls, cached hits are free.
  const budget = xSources.slice(0, MAX_X_CALLS_PER_REFRESH);
  for (const src of budget) {
    const ck = src.route;
    const hit = postsCache.get(ck);
    if (hit) { items.push(...hit.value); served++; continue; }   // 6h cache — the cron warms this
    if (callsToday(now) >= dailyCap()) { capped = true; continue; } // hard daily cap
    bumpCalls(now); calls++;
    const posts = await fetchOne(src, apiKey);
    const mapped = mapXaiPosts(posts, src, now);
    postsCache.set(ck, mapped);
    items.push(...mapped);
    served++;
  }
  return { items, calls, capped, served };
}

/** Test seam: clear the module caches between unit tests. */
export function __resetXaiCaches() { postsCache.clear(); capCache.clear(); }
