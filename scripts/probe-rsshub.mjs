#!/usr/bin/env node
// scripts/probe-rsshub.mjs — does the free public RSSHub actually serve our routes?
//
//   node scripts/probe-rsshub.mjs
//   RSSHUB_BASE_URL=https://rsshub.your-domain.com node scripts/probe-rsshub.mjs
//
// Hits every source in config/sources.js and reports status + item count, so the
// "prove it free before self-hosting" question gets a real answer instead of a
// guess. Read-only: it changes nothing.
//
// Expect X to fail on the public instance — /twitter/* needs a TWITTER_AUTH_TOKEN
// configured on the RSSHub side. That is the signal to self-host, not a bug here.

import { SOCIAL_SOURCES, limitOf } from '../config/sources.js';

const BASE = (process.env.RSSHUB_BASE_URL || 'https://rsshub.app').replace(/\/+$/, '');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const target = route => /^https?:\/\//i.test(route)
  ? { url: route, via: 'direct' }
  : { url: `${BASE}${route.startsWith('/') ? '' : '/'}${route}`, via: 'rsshub' };

const countItems = xml =>
  (xml.match(/<item[\s>]/gi) || []).length + (xml.match(/<entry[\s>]/gi) || []).length;

console.log(`\nRSSHUB_BASE_URL = ${BASE}\n`);
console.log('STATUS  ITEMS  VIA      PLATFORM    SOURCE            DETAIL');
console.log('─'.repeat(78));

let ok = 0, failed = 0;

for (const s of SOCIAL_SOURCES) {
  const { url, via } = target(s.route);
  let status = '---', items = 0, detail = '';

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, */*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    status = String(r.status);
    if (r.ok) {
      const body = await r.text();
      items = countItems(body);
      if (items) { ok++; detail = `cap ${limitOf(s)}`; }
      else { failed++; detail = '200 but no items — likely an error page'; }
    } else {
      failed++;
      detail = r.status === 403 ? 'blocked / rate-limited'
             : r.status === 404 ? 'route not found — check the pattern'
             : '';
    }
  } catch (e) {
    failed++;
    status = 'ERR';
    detail = e?.name === 'TimeoutError' ? 'timeout (20s)' : (e?.message || 'network');
  }

  const mark = items > 0 ? '✓' : '✗';
  console.log(
    `${mark} ${status.padEnd(5)} ${String(items).padStart(5)}  ${via.padEnd(7)}  ` +
    `${s.platform.padEnd(10)}  ${s.label.padEnd(16)}  ${detail}`
  );
}

console.log('─'.repeat(78));
console.log(`${ok} serving, ${failed} not.\n`);
if (failed) {
  console.log('Anything failing above will fail gracefully in the app: the source');
  console.log('contributes zero items, the feed still renders, and the right rail');
  console.log('shows it as degraded. Edit config/sources.js to swap it out.\n');
}
