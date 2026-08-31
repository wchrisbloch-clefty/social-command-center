#!/usr/bin/env node
// scripts/verify-reddit-pacing.mjs — proves the Reddit rate-limit fix.
//
//   npm run verify:pacing
//
// Reddit is unreachable from CI and from the build sandbox, so this cannot hit
// the real thing. Instead it stands up a fixture that RATE-LIMITS THE SAME WAY
// Reddit did in production — 200 for a request that respects the gap, 429 for
// one that arrives too soon after the last — and drives the real
// /api/social route against it.
//
// The before/after is measured against one fixture:
//   BEFORE  18 raw parallel fetches, which is exactly what the old
//           Promise.allSettled fan-out did
//   AFTER   the same 18 URLs through the app's paced fetch path
//
// Live confirmation still belongs on the deployment: hit
// /api/social?category=sports and count `ok` sources.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SOURCES = join(ROOT, 'config', 'sources.js');

// ASSUMPTION: 1000ms mirrors Reddit's observed unauthenticated tolerance. The
// app paces at 1100ms, so it should clear this with margin.
const FIXTURE_GAP_MS = 1000;

let lastServed = 0;
let served = 0, throttled = 0;

const fixture = createServer((req, res) => {
  const now = Date.now();
  const since = now - lastServed;
  if (lastServed && since < FIXTURE_GAP_MS) {
    throttled++;
    res.writeHead(429, { 'Content-Type': 'text/plain', 'Retry-After': '1' });
    return res.end('Too Many Requests');
  }
  lastServed = now;
  served++;
  const sub = (req.url.match(/\/r\/([^/]+)/) || [])[1] || 'sub';
  res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
  res.end(`<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>r/${sub}</title>
${Array.from({ length: 4 }, (_, i) => `<entry>
  <title>${sub} post ${i + 1}</title>
  <link href="https://example.invalid/${sub}/${i}"/>
  <content type="html">Body</content>
  <updated>${new Date(Date.now() - (i + 1) * 3600_000).toISOString()}</updated>
  <author><name>/u/someone</name></author>
</entry>`).join('\n')}
</feed>`);
});

await new Promise(r => fixture.listen(0, '127.0.0.1', r));
const FX = `http://127.0.0.1:${fixture.address().port}`;
const fxHost = `127.0.0.1:${fixture.address().port}`;

const snapshot = readFileSync(SOURCES, 'utf8');
let child = null;

const resetCounters = () => { served = 0; throttled = 0; lastServed = 0; };

try {
  // ── BEFORE: the old behaviour — all at once ───────────────────────────────
  const urls = Array.from({ length: 18 }, (_, i) => `${FX}/r/sub${i}/hot/.rss`);
  resetCounters();
  const burst = await Promise.allSettled(urls.map(u => fetch(u)));
  const burstOk = burst.filter(r => r.status === 'fulfilled' && r.value.ok).length;
  const burst429 = burst.filter(r => r.status === 'fulfilled' && r.value.status === 429).length;
  process.stdout.write(
    `BEFORE (parallel fan-out, the old behaviour)\n` +
    `  ${burstOk}/18 returned 200, ${burst429}/18 returned 429\n\n`
  );

  // ── AFTER: the same URLs through the real route ───────────────────────────
  // Point the Reddit sources at the fixture and tell the route to pace it.
  const patched = snapshot.replace(/https:\/\/www\.reddit\.com/g, FX);
  writeFileSync(SOURCES, patched, 'utf8');

  const { execSync } = await import('node:child_process');
  execSync('npx next build', { cwd: ROOT, stdio: 'ignore' });

  const port = 4970;
  child = spawn(process.execPath, [fileURLToPath(import.meta.resolve('next/dist/bin/next')), 'start', '-p', String(port)], {
    detached: true, cwd: ROOT,
    env: {
      ...process.env,
      YOUTUBE_API_KEY: '',
      // Pace the fixture host exactly as Reddit is paced in production.
      SOCIAL_THROTTLE_HOSTS: `${fxHost}=1100`,
    },
    stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 300));
  }

  resetCounters();
  const t0 = Date.now();
  const res = await fetch(`${base}/api/social?category=sports`, { signal: AbortSignal.timeout(120_000) });
  const data = await res.json();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const reddit = data.sources.filter(s => s.platform === 'Reddit');
  const ok = reddit.filter(s => s.ok);
  const bad = reddit.filter(s => !s.ok);

  process.stdout.write(
    `AFTER (paced through /api/social)\n` +
    `  ${ok.length}/${reddit.length} sources returned items, ${bad.length} degraded\n` +
    `  ${data.items.length} items total, ${elapsed}s\n` +
    `  fixture saw ${served} served / ${throttled} throttled\n\n`
  );

  if (bad.length) {
    process.stdout.write('  still degraded:\n');
    for (const s of bad) process.stdout.write(`    ${s.label} — ${s.error}\n`);
  }

  // ── Cache: a second call must not re-hit the fixture ──────────────────────
  resetCounters();
  const t1 = Date.now();
  const again = await fetch(`${base}/api/social?category=sports`, { signal: AbortSignal.timeout(60_000) });
  const d2 = await again.json();
  process.stdout.write(
    `\nCACHE (immediate second call)\n` +
    `  ${d2.sources.filter(s => s.platform === 'Reddit' && s.ok).length}/${reddit.length} sources, ` +
    `${((Date.now() - t1) / 1000).toFixed(1)}s, fixture saw ${served} new request(s)\n`
  );

  const pass = ok.length === reddit.length && served === 0;
  process.stdout.write(pass ? '\nPASSED\n' : '\nFAILED\n');
  process.exitCode = pass ? 0 : 1;
} finally {
  if (child) { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }
  writeFileSync(SOURCES, snapshot, 'utf8');
  fixture.closeAllConnections?.();
  fixture.close();
  process.stdout.write('config restored\n');
}
process.exit(process.exitCode ?? 0);
