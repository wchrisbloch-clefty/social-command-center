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

function headersFor(url) {
  return {
    'User-Agent': isReddit(url) ? REDDIT_UA : UA,
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, */*',
    'Accept-Language': 'en-US,en;q=0.9',
  };
}

const FETCH_TIMEOUT_MS = 9000;

function hostOf(url) {
  try { return new URL(url).host; } catch { return ''; }
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

function paced(url, task) {
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

/**
 * Retry transient failures only. 401/403/404 cannot be fixed by asking again.
 *
 * 429 IS retried, and with a longer backoff than the rest: it means "you asked
 * too fast", so the useful response is to wait, not to give up. Honours
 * Retry-After when the server sends one.
 */
async function fetchFeed(target) {
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
