#!/usr/bin/env node
// scripts/verify-throughput.mjs — the 13-source sports load, end to end.
//
//   npm run verify:throughput
//
// Drives the REAL /api/social?category=sports route against a fixture that
// rate-limits exactly the way Reddit did in production (429 to anything
// arriving <1000ms after the last served request, and a realistic response
// latency on top). Reports the three numbers that matter:
//
//   COLD   first load, nothing cached — the case that was returning 1/13
//   WARM   second load — should be instant and entirely from cache
//   STALE  after the fresh window lapses — should STILL be instant, with the
//          refresh happening behind the caller rather than in front of them
//
// Live confirmation still belongs on the deployment: hit
// /api/social?category=sports and read `served` / `pending` / `fromCache`.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const FIXTURE_GAP_MS = 1000;
const LATENCY_MS = Number(process.env.VERIFY_LATENCY_MS) || 350;

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
  await new Promise(r => setTimeout(r, LATENCY_MS));
  const sub = (req.url.match(/\/r\/([^/]+)/) || [])[1] || 'sub';
  res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
  res.end(`<?xml version="1.0"?><rss version="2.0"><channel><title>r/${sub}</title>
${Array.from({ length: 4 }, (_, i) => `<item><title>${sub} post ${i + 1}</title>
<link>https://example.invalid/${sub}/${i}</link><description>Body text</description>
<pubDate>${new Date(Date.now() - (i + 1) * 3600_000).toUTCString()}</pubDate></item>`).join('')}
</channel></rss>`);
});
await new Promise(r => fixture.listen(0, '127.0.0.1', r));
const FX = `http://127.0.0.1:${fixture.address().port}`;
const fxHost = `127.0.0.1:${fixture.address().port}`;

const reset = () => { served = 0; throttled = 0; lastServed = 0; };
let child;

try {
  const { execSync } = await import('node:child_process');
  execSync('npx next build', { stdio: 'ignore' });

  const port = 4973;
  child = spawn(process.execPath, [fileURLToPath(import.meta.resolve('next/dist/bin/next')), 'start', '-p', String(port)], {
    detached: true, stdio: 'ignore',
    env: {
      ...process.env,
      YOUTUBE_API_KEY: '',
      SOCIAL_FIXTURE_BASE: FX,
      // Pace the fixture host exactly as Reddit is paced in production:
      // 1100ms between starts, 3 concurrent.
      SOCIAL_THROTTLE_HOSTS: `${fxHost}=1100:3`,
    },
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 300));
  }

  const load = async (label) => {
    reset();
    const t0 = Date.now();
    const d = await (await fetch(`${base}/api/social?category=sports`, { signal: AbortSignal.timeout(120_000) })).json();
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const reddit = d.sources.filter(s => s.platform === 'Reddit');
    const ok = reddit.filter(s => s.ok).length;
    const pending = reddit.filter(s => s.pending).length;
    const broken = reddit.filter(s => !s.ok && !s.pending).length;
    const cachedN = reddit.filter(s => s.cached).length;
    process.stdout.write(
      `${label.padEnd(7)} ${String(ok).padStart(2)}/${reddit.length} returned  ` +
      `${pending} still loading  ${broken} degraded  ` +
      `${d.items.length} items  ${secs}s  ` +
      `[${cachedN} from cache · fixture: ${served} served, ${throttled} rate-limited]\n`);
    return { ok, total: reddit.length, pending, broken, secs: Number(secs), throttled, cachedN };
  };

  process.stdout.write(`\nFixture 429s anything <${FIXTURE_GAP_MS}ms after the last served; ${LATENCY_MS}ms latency.\n`);
  process.stdout.write(`Scheduler: 1100ms between request STARTS, concurrency 3.\n\n`);

  const cold = await load('COLD');
  const warm = await load('WARM');

  process.stdout.write('\nThe stale band needs control of the clock, so it is asserted directly in\n');
  process.stdout.write('`npm run verify:swr` rather than by waiting five minutes here.\n\n');

  const pass = cold.ok >= 12 && cold.throttled === 0 && warm.ok === warm.total && warm.secs <= 1;
  process.stdout.write(pass ? 'PASSED\n' : 'FAILED\n');
  if (!pass) {
    if (cold.ok < 12) process.stdout.write(`  cold load returned only ${cold.ok}/${cold.total}\n`);
    if (cold.throttled) process.stdout.write(`  cold load triggered ${cold.throttled} rate limits\n`);
    if (warm.secs > 1) process.stdout.write(`  warm load took ${warm.secs}s — cache is not being served\n`);
  }
  process.exitCode = pass ? 0 : 1;
} finally {
  if (child) { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }
  fixture.closeAllConnections?.(); fixture.close();
}
process.exit(process.exitCode ?? 0);
