#!/usr/bin/env node
// scripts/tune-throttle.mjs — find the throughput/429 balance empirically.
//
//   npm run tune:throttle
//
// Stands up a fixture that rate-limits the way Reddit did in production (429 to
// anything arriving less than FIXTURE_GAP_MS after the last SERVED request) and
// sweeps scheduler settings against it, reporting for each: how many of 13
// sources returned 200, how many were throttled, and the wall time.
//
// The point is to pick numbers from measurement rather than intuition, and to
// leave the measurement runnable so the next person can re-tune when Reddit's
// limits change.

import { createServer } from 'node:http';

// ASSUMPTION: 1000ms mirrors Reddit's observed unauthenticated tolerance — one
// request per second, no burst allowance. This is STRICTER than a real token
// bucket, so anything that passes here has margin in production.
const FIXTURE_GAP_MS = 1000;
const SOURCES = 13;                 // the live sports category
const LATENCY_MS = Number(process.env.TUNE_LATENCY_MS) || 350;  // realistic Reddit response time
const DEADLINE_MS = Number(process.env.TUNE_DEADLINE_MS) || 20_000;

let lastServed = 0, served = 0, throttled = 0;
const fixture = createServer(async (req, res) => {
  const now = Date.now();
  if (lastServed && now - lastServed < FIXTURE_GAP_MS) {
    throttled++;
    res.writeHead(429, { 'Retry-After': '1' });
    return res.end('Too Many Requests');
  }
  lastServed = now;
  served++;
  // Real feeds do not answer instantly, and that latency is the whole bug:
  // sleeping AFTER the response serialises latency into the gap.
  await new Promise(r => setTimeout(r, LATENCY_MS));
  res.writeHead(200, { 'Content-Type': 'application/xml' });
  res.end('<?xml version="1.0"?><rss><channel><title>t</title><item><title>i</title></item></channel></rss>');
});
await new Promise(r => fixture.listen(0, '127.0.0.1', r));
const PORT = fixture.address().port;
const urls = Array.from({ length: SOURCES }, (_, i) => `http://127.0.0.1:${PORT}/r/sub${i}/hot/.rss`);

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── The two schedulers, side by side ────────────────────────────────────────

/** BEFORE: chain, run, THEN sleep. Inter-arrival = latency + gap. */
function makeOldPacer(gap) {
  let tail = Promise.resolve();
  return (task) => {
    const next = tail.catch(() => {}).then(async () => {
      const r = await task();
      await sleep(gap);
      return r;
    });
    tail = next.catch(() => {});
    return next;
  };
}

/** AFTER: a start-permit gate + a concurrency semaphore. Inter-arrival = gap. */
function makeNewPacer(gap, concurrency) {
  let gate = Promise.resolve(), lastStart = 0, active = 0;
  const waiters = [];
  const acquire = () => active < concurrency
    ? (active++, Promise.resolve())
    : new Promise(res => waiters.push(res)).then(() => { active++; });
  const release = () => { active--; const w = waiters.shift(); if (w) w(); };

  return async (task) => {
    await acquire();
    // Only the PERMIT is serialised — a sleep, not the fetch.
    gate = gate.then(async () => {
      const wait = lastStart + gap - Date.now();
      if (wait > 0) await sleep(wait);
      lastStart = Date.now();
    });
    await gate;
    try { return await task(); } finally { release(); }
  };
}

async function run(label, pacer) {
  served = 0; throttled = 0; lastServed = 0;
  const t0 = Date.now();
  const deadline = new Promise(r => setTimeout(() => r('DEADLINE'), DEADLINE_MS));
  const results = await Promise.all(urls.map(u =>
    Promise.race([
      pacer(() => fetch(u).then(r => r.status)).catch(() => 0),
      deadline,
    ])));
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const ok = results.filter(r => r === 200).length;
  const rl = results.filter(r => r === 429).length;
  const late = results.filter(r => r === 'DEADLINE').length;
  return { label, ok, rl, late, elapsed, served, throttled };
}

const row = r =>
  `  ${r.label.padEnd(34)} ${String(r.ok).padStart(2)}/13 ok  ${String(r.rl).padStart(2)} rate-limited  ` +
  `${String(r.late).padStart(2)} past deadline  ${r.elapsed}s`;

process.stdout.write(`\nFixture: 429 if a request arrives <${FIXTURE_GAP_MS}ms after the last served\n`);
process.stdout.write(`Each response takes ${LATENCY_MS}ms · deadline ${DEADLINE_MS / 1000}s · ${SOURCES} sources\n\n`);

process.stdout.write('BEFORE — sleep AFTER the task (inter-arrival = latency + gap)\n');
process.stdout.write(row(await run('gap 1100ms, sequential', makeOldPacer(1100))) + '\n\n');

process.stdout.write('AFTER — permit gate before the task (inter-arrival = gap)\n');
for (const [gap, conc] of [[1100, 1], [1100, 2], [1100, 3], [1050, 2], [1000, 2], [900, 2], [750, 3], [500, 3]]) {
  process.stdout.write(row(await run(`gap ${gap}ms, concurrency ${conc}`, makeNewPacer(gap, conc))) + '\n');
}

process.stdout.write('\n');
fixture.closeAllConnections?.(); fixture.close();
process.exit(0);
