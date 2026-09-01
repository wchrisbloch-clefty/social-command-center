#!/usr/bin/env node
// scripts/verify-swr.mjs — the stale-while-revalidate band, directly.
//
//   npm run verify:swr
//
// The three cache ages have three different behaviours, and the middle one is
// the whole point: a stale entry must be served IMMEDIATELY while the refresh
// runs behind the caller. Asserting that needs control of the clock, so the
// freshness windows are set to hundreds of milliseconds here rather than
// minutes.

import { createServer } from 'node:http';

process.env.SOCIAL_CACHE_FRESH_MS = '400';
process.env.SOCIAL_CACHE_STALE_MS = '3000';
process.env.SOCIAL_FIXTURE_BASE = '';

let hits = 0;
const SLOW_MS = 600;   // longer than the fresh window, so a blocking refresh is obvious
const server = createServer(async (req, res) => {
  hits++;
  const n = hits;
  await new Promise(r => setTimeout(r, SLOW_MS));
  res.writeHead(200, { 'Content-Type': 'application/xml' });
  res.end(`<?xml version="1.0"?><rss><channel><title>v${n}</title><item><title>item ${n}</title></item></channel></rss>`);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${server.address().port}/feed.rss`;

const { fetchFeed, clearFeedCache } = await import('../lib/feed-fetch.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const timed = async fn => { const t = Date.now(); const v = await fn(); return { v, ms: Date.now() - t }; };
const version = text => (text.match(/<title>v(\d+)<\/title>/) || [])[1];

let failures = 0;
const check = (label, cond, detail) => {
  process.stdout.write(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${detail ? `  — ${detail}` : ''}\n`);
  if (!cond) failures++;
};

clearFeedCache();
process.stdout.write('\nfresh 400ms · stale-serviceable to 3000ms · upstream takes 600ms\n\n');

// 1. COLD — nothing held, the caller waits for the network.
const cold = await timed(() => fetchFeed(URL_));
check('cold miss fetches and waits', cold.ms >= SLOW_MS && cold.v.ok, `${cold.ms}ms, version v${version(cold.v.text)}`);

// 2. FRESH — inside the window, served instantly, nobody is asked.
const before = hits;
const fresh = await timed(() => fetchFeed(URL_));
check('fresh hit is instant', fresh.ms < 50 && fresh.v.cached === 'fresh', `${fresh.ms}ms, cached=${fresh.v.cached}`);
check('fresh hit makes no request', hits === before, `${hits - before} upstream request(s)`);

// 3. STALE — past fresh, inside stale. Instant AND a refresh starts behind us.
await sleep(500);
const staleHits = hits;
const stale = await timed(() => fetchFeed(URL_));
check('stale hit is instant', stale.ms < 50 && stale.v.cached === 'stale', `${stale.ms}ms, cached=${stale.v.cached}`);
check('stale hit serves the OLD copy', version(stale.v.text) === '1', `got v${version(stale.v.text)}`);
// The refresh is fired but not awaited, so it has not necessarily REACHED the
// fixture by the time the stale value returns — that is the point of it being
// in the background. Poll briefly for the request to arrive rather than reading
// the counter synchronously and racing it.
const sawRefresh = await (async () => {
  for (let i = 0; i < 40; i++) {
    if (hits > staleHits) return true;
    await sleep(10);
  }
  return false;
})();
check('stale hit triggers a background refresh', sawRefresh && hits === staleHits + 1,
  `${hits - staleHits} upstream request(s)`);

// 4. …and that refresh lands, so the NEXT caller gets fresher data for free.
await sleep(SLOW_MS + 250);
const after = await timed(() => fetchFeed(URL_));
check('refresh landed in cache', version(after.v.text) === '2' && after.ms < 50,
  `v${version(after.v.text)} in ${after.ms}ms`);

// 5. EXPIRED — past the stale band, the wait is honest again.
await sleep(3200);
const expiredHits = hits;
const expired = await timed(() => fetchFeed(URL_));
check('expired entry fetches and waits', expired.ms >= SLOW_MS && hits === expiredHits + 1,
  `${expired.ms}ms, ${hits - expiredHits} request(s)`);

// 6. SINGLE-FLIGHT — a cold fan-out of N callers must cost ONE request.
clearFeedCache();
const flightHits = hits;
await Promise.all(Array.from({ length: 8 }, () => fetchFeed(URL_)));
check('8 concurrent cold callers cause 1 request', hits === flightHits + 1, `${hits - flightHits} request(s)`);

process.stdout.write(failures ? `\nFAILED (${failures})\n` : '\nPASSED\n');
server.closeAllConnections?.(); server.close();
process.exit(failures ? 1 : 0);
