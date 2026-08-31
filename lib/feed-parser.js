// lib/feed-parser.js — one RSS / Atom / JSON Feed parser for the whole app.
//
// Extracted verbatim from app/api/social/route.js when the podcast route needed
// the same thing. A podcast feed is an RSS feed: copying this to serve it would
// have created a second parser to keep in sync, and the first real-world feed
// quirk would have been fixed in only one of them.
//
// Native fetch + regex, no new dependencies — the same constraint the extract
// route documents. RSSHub emits RSS, Reddit emits Atom, podcast hosts emit RSS
// with iTunes extensions, so every branch here is load-bearing.

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
export function decodeEntities(s = '') {
  let out = String(s), prev;
  for (let i = 0; i < 3 && out !== prev; i++) { prev = out; out = decodeOnce(out); }
  return out;
}

export function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decodeEntities(m[1]).replace(/<[^>]*>/g, '').trim() : '';
}

export function attr(block, tagName, attrName) {
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

export function parseFeed(body) {
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

// ── Podcast extras ──────────────────────────────────────────────────────────
// An episode is an RSS <item> plus the iTunes namespace. These read the extra
// fields rather than forking the parser, so a podcast item is an ordinary feed
// item that happens to carry a duration and an episode-level image.
//
// ASSUMPTION: itunes:duration is either seconds ("3600") or a clock string
// ("1:00:00" / "60:00"). Both are common in the wild; anything else is passed
// through untouched rather than guessed at.
export function parseDuration(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^\d+$/.test(s)) {
    const mins = Math.floor(Number(s) / 60);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  }
  const parts = s.split(':').map(Number);
  if (parts.some(n => !Number.isFinite(n))) return s;
  if (parts.length === 3) return parts[0] > 0 ? `${parts[0]}h ${parts[1]}m` : `${parts[1]}m`;
  if (parts.length === 2) return `${parts[0]}m`;
  return s;
}

/** Channel-level <title>, for confirming which show a feed actually is. */
export function feedTitle(body) {
  const head = String(body || '').slice(0, 4000);
  const ch = head.match(/<(?:channel|feed)[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
  return ch ? decodeEntities(ch[1]).replace(/<[^>]*>/g, '').trim().slice(0, 120) : '';
}

/** Channel-level artwork: itunes:image href, then <image><url>. */
export function feedArtwork(body) {
  const head = String(body || '').slice(0, 8000);
  const itunes = head.match(/<itunes:image[^>]*href=["\']([^"\']+)["\']/i);
  if (itunes) return itunes[1];
  const img = head.match(/<image[^>]*>[\s\S]*?<url[^>]*>([\s\S]*?)<\/url>/i);
  return img ? img[1].trim() : '';
}

/**
 * Episodes from a podcast feed. parseFeed does the work; this adds the two
 * iTunes fields and keeps a LONGER description than the 400-char feed cap,
 * because show notes are the ONLY text an episode summary can be built from.
 * Truncating them to 400 chars would starve the summarizer for no reason.
 */
export function parseEpisodes(body, { maxNotes = 4000 } = {}) {
  const blocks = (String(body || '').match(/<item[\s\S]*?<\/item>/gi) || []).slice(0, 25);
  const base = parseFeed(body);
  return base.map((item, i) => {
    const b = blocks[i] || '';
    const notes = (tag(b, 'content:encoded') || tag(b, 'description') || tag(b, 'itunes:summary') || item.desc || '')
      .replace(/\s+/g, ' ').trim().slice(0, maxNotes);
    return {
      ...item,
      notes,
      duration: parseDuration(tag(b, 'itunes:duration')),
      episodeImg: attr(b, 'itunes:image', 'href') || item.img || '',
      audioUrl: attr(b, 'enclosure', 'url') || '',
    };
  });
}
