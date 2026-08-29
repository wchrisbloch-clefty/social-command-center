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

import { SOCIAL_SOURCES, limitOf } from '../../../config/sources.js';
import { normalizeSignal } from '../../../lib/adapters.js';

// GET handlers are dynamic by default since Next 15, but a live feed should say
// so out loud rather than depend on a default staying put.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

// A real browser UA. Default/bot agents get 403'd by Reddit and by Cloudflare in
// front of rsshub.app — this is the same lesson the news feed proxy already learned.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const FEED_HEADERS = {
  'User-Agent': UA,
  'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

const FETCH_TIMEOUT_MS = 9000;

// ─── XML / JSON feed parsing ─────────────────────────────────────────────────
// Native fetch + regex, no new dependencies — same constraint the extract route
// documents. RSS, Atom and JSON Feed all arrive here; RSSHub emits RSS by default
// and Reddit emits Atom, so both branches are load-bearing.

function decodeOnce(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return _; } })
    .replace(/&#(\d+);/g,           (_, d) => { try { return String.fromCodePoint(parseInt(d, 10)); } catch { return _; } })
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&lsquo;/g, '‘').replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/&hellip;/g, '…').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

// Iterate: a single pass decodes &amp; last, so double-encoded entities survive
// as raw "&#8217;" downstream. Loop until stable.
function decodeEntities(s = '') {
  let out = String(s), prev;
  for (let i = 0; i < 3 && out !== prev; i++) { prev = out; out = decodeOnce(out); }
  return out;
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decodeEntities(m[1]).replace(/<[^>]*>/g, '').trim() : '';
}

function attr(block, tagName, attrName) {
  const m = block.match(new RegExp(`<${tagName}[^>]*\\b${attrName}=["']([^"']+)["']`, 'i'));
  return m ? m[1] : '';
}

function extractImg(block) {
  const m = block.match(/<(?:media:content|media:thumbnail|enclosure)[^>]*url=["']([^"']+)["']/i);
  if (m) return m[1];
  const img = block.match(/<img[^>]*src=["']([^"']+)["']/i);
  return img ? img[1] : '';
}

function extractAuthor(block) {
  const atom = block.match(/<author[^>]*>[\s\S]*?<name[^>]*>([\s\S]*?)<\/name>/i);
  if (atom) return decodeEntities(atom[1]).replace(/<[^>]*>/g, '').trim().slice(0, 80);
  const creator = tag(block, 'dc:creator');
  if (creator) return creator.slice(0, 80);
  const a = tag(block, 'author');
  if (!a) return '';
  const paren = a.match(/\(([^)]+)\)/);
  return (paren ? paren[1].trim() : (a.includes('@') ? '' : a)).slice(0, 80);
}

// Link resolution that survives real feeds: RSS <link>, Atom <link href>, <guid>,
// then <enclosure>. Requiring a text <link> silently drops every Atom item —
// which is every Reddit item.
function pickLink(block) {
  const text = tag(block, 'link');
  if (/^https?:\/\//i.test(text)) return text;
  const href = attr(block, 'link', 'href');
  if (href) return href;
  const guid = tag(block, 'guid');
  if (/^https?:\/\//i.test(guid)) return guid;
  return attr(block, 'enclosure', 'url') || text || '';
}

function parseJsonFeed(body) {
  let d;
  try { d = JSON.parse(body); } catch { return []; }
  const arr = d.items || d.entries || (Array.isArray(d) ? d : []);
  return (arr || []).slice(0, 25).map(it => {
    const title = decodeEntities(String(it.title || '').trim());
    if (!title) return null;
    const imgRaw = it.image || it.banner_image || it.thumbnail || '';
    return {
      title,
      link:    String(it.url || it.external_url || (typeof it.link === 'string' ? it.link : it.link?.href) || ''),
      desc:    decodeEntities(String(it.summary || it.content_text || it.content_html || '').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim().slice(0, 400),
      pubDate: it.date_published || it.published || it.pubDate || it.updated || '',
      img:     typeof imgRaw === 'string' ? imgRaw : '',
      author:  String(it.author?.name || (typeof it.author === 'string' ? it.author : '') || '').slice(0, 80),
    };
  }).filter(Boolean);
}

function parseFeed(body) {
  const s = (body || '').replace(/^﻿/, '').trimStart();
  if (s[0] === '{' || s[0] === '[') return parseJsonFeed(s);

  // RSS <item> AND Atom <entry>, in whatever order they appear.
  const blocks = [
    ...(body.match(/<item[\s\S]*?<\/item>/gi)   || []),
    ...(body.match(/<entry[\s\S]*?<\/entry>/gi) || []),
  ];

  const items = [];
  for (const b of blocks.slice(0, 25)) {
    const title = tag(b, 'title');
    if (!title) continue; // title is the only hard requirement
    items.push({
      title,
      link:    pickLink(b),
      desc:    (tag(b, 'description') || tag(b, 'summary') || tag(b, 'content')).slice(0, 400),
      pubDate: tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated'),
      img:     extractImg(b),
      author:  extractAuthor(b),
    });
  }
  return items;
}

// ─── Fetching ────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Retry transient failures only. 401/403/404 cannot be fixed by asking again. */
async function fetchFeed(target) {
  const backoffs = [0, 400, 1200];
  let last = { status: 0, err: 'unknown' };

  for (let i = 0; i < backoffs.length; i++) {
    if (backoffs[i]) await sleep(backoffs[i]);
    try {
      const r = await fetch(target, {
        headers: FEED_HEADERS,
        redirect: 'follow',
        cache: 'no-store',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (r.ok) return { ok: true, text: await r.text() };
      last = { status: r.status, err: `HTTP ${r.status}` };
      if ([400, 401, 402, 403, 404, 410].includes(r.status)) break;
    } catch (e) {
      last = { status: 0, err: e?.name === 'TimeoutError' ? 'timeout' : (e?.message || 'network') };
    }
  }
  return { ok: false, ...last };
}

/** Relative routes go through RSSHub; absolute ones (Reddit) go direct. */
function resolveTarget(route) {
  const r = String(route || '');
  if (/^https?:\/\//i.test(r)) return { url: r, viaRsshub: false };
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
        ok: false, status: res.status, error: reason, count: 0,
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
      sourceLabel: source.label,
      live:        true, // it came off the wire this request
      // RSS carries no engagement numbers — normalizeSignal scores on recency.
    },
    { platform: source.platform, category: source.category, label: source.label }
  ));

  return { items, report: { label: source.label, platform: source.platform, category: source.category, ok: true, status: 200, count: items.length } };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(request) {
  const category = request.nextUrl.searchParams.get('category');

  const selected = category
    ? SOCIAL_SOURCES.filter(s => s.category === category)
    : SOCIAL_SOURCES;

  if (!selected.length) {
    return Response.json({ items: [], sources: [], base: baseUrl() });
  }

  try {
    // allSettled, not all: one rejection must not lose the other twelve feeds.
    const settled = await Promise.allSettled(selected.map(loadSource));

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
