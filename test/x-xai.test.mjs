// AD1: xAI adapter — pure mapping + cost guards (per-refresh cap, daily cap, 6h cache,
// key never echoed). node --test. global.fetch is mocked; no network, no real key.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  handleFromRoute, mapXaiPosts, fetchXViaXai, __resetXaiCaches,
  MAX_X_CALLS_PER_REFRESH,
} from '../lib/x-xai.js';

test('handleFromRoute pulls the handle from user/keyword/list routes', () => {
  assert.equal(handleFromRoute('/twitter/user/DanielYergin'), 'DanielYergin');
  assert.equal(handleFromRoute('/twitter/keyword/ERCOT'), 'ERCOT');
  assert.equal(handleFromRoute('/twitter/list/12345'), '12345');
  assert.equal(handleFromRoute('/reddit/r/nfl'), '');
});

test('mapXaiPosts: filters junk, caps to source.limit, labels provider=xai, tier=street', () => {
  const src = { label: '@sama', category: 'tech', limit: 2 };
  const out = mapXaiPosts([
    { text: 'one', url: 'https://x.com/sama/1' },
    { text: 'no url' },                               // dropped (no url)
    { text: 'bad', url: 'ftp://x.com/2' },            // dropped (not http)
    { text: 'two', url: 'https://x.com/sama/2' },
    { text: 'three', url: 'https://x.com/sama/3' },   // dropped (over limit 2)
  ], src);
  assert.equal(out.length, 2);
  assert.equal(out[0].platform, 'X');
  assert.equal(out[0].tier, 'street');       // → renders "Alt. perspective" (unverified)
  assert.equal(out[0].provider, 'xai');
  assert.equal(out[0].url, 'https://x.com/sama/1');
});

// Build N fake X sources.
const xs = (n) => Array.from({ length: n }, (_, i) => ({
  platform: 'X', route: `/twitter/user/h${i}`, label: `@h${i}`, category: 'tech', limit: 3,
}));

function mockFetch(body = { posts: [{ text: 'hi', url: 'https://x.com/h/1' }] }) {
  let calls = 0;
  const seenAuth = [];
  global.fetch = async (_url, opts) => {
    calls++;
    seenAuth.push(opts?.headers?.Authorization || '');
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(body) } }] }) };
  };
  return { calls: () => calls, seenAuth: () => seenAuth };
}

test('per-refresh cap: at most MAX_X_CALLS_PER_REFRESH (10) live calls even with 15 sources', async () => {
  __resetXaiCaches();
  const m = mockFetch();
  const r = await fetchXViaXai(xs(15), { apiKey: 'SECRET_KEY', now: Date.now() });
  assert.equal(m.calls(), MAX_X_CALLS_PER_REFRESH);  // call #11 never fires
  assert.ok(r.items.length > 0);
});

test('6h cache: a second refresh for the same handles makes 0 new calls', async () => {
  __resetXaiCaches();
  const m = mockFetch();
  const sources = xs(3);
  await fetchXViaXai(sources, { apiKey: 'SECRET_KEY' });
  const before = m.calls();
  const r2 = await fetchXViaXai(sources, { apiKey: 'SECRET_KEY' });
  assert.equal(m.calls(), before);     // served entirely from cache
  assert.equal(r2.served, 3);
});

test('daily cap: once X_DAILY_CAP is reached, further handles are capped (no call)', async () => {
  __resetXaiCaches();
  process.env.X_DAILY_CAP = '2';
  const m = mockFetch();
  // 5 distinct handles, cache empty → only 2 live calls allowed today, rest capped.
  const r = await fetchXViaXai(xs(5), { apiKey: 'SECRET_KEY', now: Date.now() });
  assert.equal(m.calls(), 2);
  assert.equal(r.capped, true);
  delete process.env.X_DAILY_CAP;
});

test('the API key is sent as a Bearer header but never appears in returned items', async () => {
  __resetXaiCaches();
  const m = mockFetch();
  const r = await fetchXViaXai(xs(2), { apiKey: 'SUPER_SECRET_123', now: Date.now() });
  assert.ok(m.seenAuth().every(a => /^Bearer SUPER_SECRET_123$/.test(a)));
  const blob = JSON.stringify(r);
  assert.ok(!blob.includes('SUPER_SECRET_123'));
});
