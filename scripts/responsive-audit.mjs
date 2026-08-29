#!/usr/bin/env node
// scripts/responsive-audit.mjs — the responsive geometry gate.
//
//   npm run audit:responsive
//
// Drives a real Chromium across every view at every target breakpoint, in BOTH
// themes, and measures actual box geometry. Exits non-zero on any violation, so
// CI blocks a responsive regression before it can merge.
//
// This exists because reading CSS does not catch these. The bug that motivated
// it — the category nav collapsing to 0px wide on mobile, making the feed
// unfilterable on every phone — was invisible in the stylesheet and obvious the
// moment anything measured getBoundingClientRect().
//
// ── WHAT IT ENFORCES ────────────────────────────────────────────────────────
// See docs/RESPONSIVE.md for the layout contract these checks defend.
//
//   1. No document-level horizontal overflow.
//   2. No element wider than its parent's content box (unless an ancestor
//      scrolls on purpose — a tab strip is allowed to overflow itself).
//   3. No collapsed nav/tab strip: every category tab renders with real width.
//   4. No tap target under 34px tall or 24px wide.
//
// ── RUNNING IT ──────────────────────────────────────────────────────────────
// By default it builds nothing and starts nothing you must manage: it boots a
// fixture feed server and `next start` itself, then tears both down.
//
//   npm run build && npm run audit:responsive
//
// Env:
//   AUDIT_BASE_URL   point at an already-running server and skip spawning
//   CHROMIUM_PATH    explicit Chromium binary, for environments with a
//                    pre-provisioned browser that Playwright cannot resolve
//   AUDIT_HEADED=1   watch it run

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CATEGORIES } from '../config/sources.js';

// ── The contract ────────────────────────────────────────────────────────────
// Kept in step with docs/RESPONSIVE.md. Changing a number here is changing the
// contract, so change it there too.
const BREAKPOINTS = [
  { name: 'mobile',  width: 390,  height: 844,  mobile: true  }, // iPhone 14/15
  { name: 'ipad',    width: 820,  height: 1180, mobile: true  }, // iPad Air
  { name: 'desktop', width: 1280, height: 900,  mobile: false },
];

// Local iteration: AUDIT_BREAKPOINT=mobile narrows the sweep. CI always runs
// the full matrix — the filter is unset there.
const ONLY_BP = (process.env.AUDIT_BREAKPOINT || '').split(',').map(x => x.trim()).filter(Boolean);

const VIEWS = ['feed', 'discover', 'intelligence', 'studio', 'alerts', 'sources', 'settings'];
const VIEW_LABEL = {
  discover: 'Discover', intelligence: 'Intelligence', studio: 'Studio',
  alerts: 'Alerts', sources: 'Sources', settings: 'Settings',
};

const MIN_TAP_HEIGHT = 34;
const MIN_TAP_WIDTH  = 24;
const MIN_TAB_STRIP  = 240; // below this the category nav is unusable, not merely tight

// ── Fixture feed ────────────────────────────────────────────────────────────
// Deterministic content so the audit measures LAYOUT, not whatever the public
// RSSHub happened to return. Also keeps CI off the network entirely.
// ASSUMPTION: five items per source is enough to populate a hero, a rail and
// the "more" list at every breakpoint.
const FIXTURE_TITLES = [
  'Webb captures a new view of the Pillars of Creation in stunning infrared detail',
  'Quarterly results beat expectations as margins expand for a fourth straight quarter',
  'Grid-scale storage deployments double year over year, reshaping peak pricing',
  'A deliberately long headline that keeps going and going in order to test how card titles clamp and wrap when the viewport is only a few hundred pixels wide',
  'Short one',
];
// Flat navy 16:10 rectangle, inlined — no network fetch for imagery.
const FIXTURE_IMG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNTAwIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iIzFkMmQ0YSIvPjwvc3ZnPg==';

function fixtureRss(handle) {
  const now = Date.now();
  const items = FIXTURE_TITLES.map((t, i) => `<item>
  <title><![CDATA[${t}]]></title>
  <link>https://example.invalid/${encodeURIComponent(handle)}/${i}</link>
  <description><![CDATA[A description long enough to exercise the two-line clamp on the lead card and to wrap sensibly at narrow widths.]]></description>
  <pubDate>${new Date(now - (i * 2 + 0.4) * 3600_000).toUTCString()}</pubDate>
  <author>${handle}</author>
  ${i % 2 === 0 ? `<media:content url="${FIXTURE_IMG}"/>` : ''}
</item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${handle}</title>\n${items}\n</channel></rss>`;
}

function startFixtureFeed() {
  return new Promise(resolve => {
    const server = createServer((req, res) => {
      const u = req.url.split('?')[0];
      let m, handle;
      if ((m = u.match(/^\/instagram\/2\/(?:user|tags)\/([^/]+)/)))    handle = '@' + m[1];
      else if ((m = u.match(/^\/linkedin\/company\/([^/]+)\/posts$/))) handle = m[1];
      else if ((m = u.match(/^\/twitter\/user\/([^/]+)/)))             handle = '@' + m[1];
      else { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('no route'); }
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
      res.end(fixtureRss(handle));
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

// ── App under test ──────────────────────────────────────────────────────────
async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

function startApp(rsshubBase) {
  const port = 3000 + Math.floor(Math.random() * 900) + 100;
  // Run the Next binary directly under this Node, and DETACHED so the child
  // leads its own process group.
  //
  // Both details are load-bearing. Going through `npx` left a shell between us
  // and next-server, so child.kill() killed the shell and orphaned the server —
  // the audit printed PASSED, then hung until CI's job timeout killed it, and a
  // passing audit was reported as a failing build. Detaching lets us signal the
  // whole group with kill(-pid).
  const nextBin = fileURLToPath(import.meta.resolve('next/dist/bin/next'));
  const child = spawn(process.execPath, [nextBin, 'start', '-p', String(port)], {
    detached: true,
    env: {
      ...process.env,
      RSSHUB_BASE_URL: rsshubBase,
      // Deliberately unset: the audit must pass in the degraded, no-credential
      // state, because that is what CI and a fresh clone actually look like.
      YOUTUBE_API_KEY: '',
      GROQ_API_KEY: '', GOOGLE_AI_API_KEY: '', ANTHROPIC_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', d => { log += d; });
  child.stderr.on('data', d => { log += d; });
  return { child, port, url: `http://127.0.0.1:${port}`, getLog: () => log };
}

// ── Measurement, run inside the page ────────────────────────────────────────
function measure({ minTapH, minTapW, minTabStrip, expectedTabs, touch }) {
  const de = document.documentElement;
  const vw = de.clientWidth;

  const describe = el => {
    let s = el.tagName.toLowerCase();
    const cls = (el.className && el.className.toString ? el.className.toString() : '').trim();
    if (cls) s += '.' + cls.split(/\s+/).slice(0, 3).join('.');
    const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34);
    return txt ? `${s} "${txt}"` : s;
  };

  const visible = el => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  // An element inside a deliberately-SCROLLING ancestor is contained by design:
  // a tab strip is supposed to overflow itself and scroll.
  //
  // `overflow-x: hidden` is deliberately NOT accepted here. Hidden clips rather
  // than scrolls, so exempting it means any layout bug wrapped in a hidden
  // container becomes invisible to this audit. A verification pass proved that
  // exactly: a deliberately broken masthead passed, because .nav-bar carried
  // `overflow-x: hidden` and everything inside it was skipped. Content that
  // genuinely needs to overflow must scroll, not be clipped.
  const scrollExempt = new WeakSet();
  for (const el of document.querySelectorAll('*')) {
    if (['auto', 'scroll'].includes(getComputedStyle(el).overflowX)) scrollExempt.add(el);
  }
  const inScrollingAncestor = el => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (scrollExempt.has(a)) return true;
    }
    return false;
  };

  const violations = [];

  // (1) Document-level horizontal overflow.
  if (de.scrollWidth > vw + 1) {
    violations.push({
      rule: 'doc-overflow',
      detail: `document scrollWidth ${de.scrollWidth} exceeds viewport ${vw} by ${de.scrollWidth - vw}px`,
    });
  }

  // (2) Any element wider than its parent's content box.
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const par = el.parentElement;
    if (!par) continue;
    const pw = par.clientWidth;
    if (pw <= 0) continue;
    const w = el.getBoundingClientRect().width;
    if (w > pw + 1 && !inScrollingAncestor(el)) {
      violations.push({
        rule: 'wider-than-parent',
        detail: `${describe(el)} is ${Math.round(w)}px inside a ${pw}px parent (${describe(par)})`,
      });
    }
  }

  // (3) Collapsed nav / tab strip. This is the regression that started it all:
  //     .nav-tabs is flex:1 between two flex-shrink:0 siblings, so it is the
  //     thing that silently gives when the masthead runs out of room.
  const strip = document.querySelector('.nav-tabs');
  if (!strip) {
    violations.push({ rule: 'nav-collapsed', detail: '.nav-tabs is not present' });
  } else {
    const sw = strip.getBoundingClientRect().width;
    if (sw < minTabStrip) {
      violations.push({ rule: 'nav-collapsed', detail: `.nav-tabs is ${Math.round(sw)}px wide (min ${minTabStrip}px)` });
    }
    const tabs = [...document.querySelectorAll('.nav-tab')];
    if (tabs.length !== expectedTabs) {
      violations.push({ rule: 'nav-collapsed', detail: `${tabs.length} category tabs rendered, expected ${expectedTabs}` });
    }
    const zero = tabs.filter(t => t.getBoundingClientRect().width < 1);
    if (zero.length) {
      violations.push({ rule: 'nav-collapsed', detail: `${zero.length} category tab(s) have zero width` });
    }
    // The strip may scroll, but every tab must be reachable by scrolling it.
    const overflows = strip.scrollWidth > strip.clientWidth + 1;
    if (overflows && !['auto', 'scroll'].includes(getComputedStyle(strip).overflowX)) {
      violations.push({ rule: 'nav-collapsed', detail: '.nav-tabs overflows but does not scroll — tabs are unreachable' });
    }
    // On a pointer breakpoint every category must be visible without scrolling.
    // Adding an eighth category ("Ancient Mysteries") clipped the last tab by
    // 127px at 1280px while the strip still technically scrolled, so nothing
    // failed and the category looked absent. A hidden tab is a broken nav.
    if (!touch && overflows) {
      const last = tabs[tabs.length - 1];
      violations.push({
        rule: 'nav-collapsed',
        detail: `.nav-tabs needs ${strip.scrollWidth}px but has ${strip.clientWidth}px at a pointer breakpoint — ` +
                `"${last ? last.textContent.trim() : '?'}" is cut off`,
      });
    }
  }

  // (4) Tap targets — touch breakpoints only. A 32px icon button is fine under
  //     a mouse; it is not fine under a thumb.
  for (const el of touch ? document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]') : []) {
    if (!visible(el)) continue;
    if (el.tagName === 'INPUT' && ['hidden'].includes(el.type)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < minTapH || r.width < minTapW) {
      violations.push({
        rule: 'tap-target',
        detail: `${describe(el)} is ${Math.round(r.width)}x${Math.round(r.height)} (min ${minTapW}x${minTapH})`,
      });
    }
  }

  return {
    violations,
    theme: de.getAttribute('data-theme'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyColor: getComputedStyle(document.body).color,
    docScrollWidth: de.scrollWidth,
    viewport: vw,
  };
}

// ── Runner ──────────────────────────────────────────────────────────────────
async function main() {
  const expectedTabs = CATEGORIES.length;
  let fixture = null;
  let app = null;
  let baseUrl = process.env.AUDIT_BASE_URL;

  if (!baseUrl) {
    fixture = await startFixtureFeed();
    app = startApp(`http://127.0.0.1:${fixture.port}`);
    baseUrl = app.url;
    process.stdout.write(`starting app on ${baseUrl} (fixture feed on :${fixture.port})\n`);
    if (!(await waitForServer(baseUrl))) {
      process.stderr.write('\nThe app did not come up. `next start` output:\n' + app.getLog() + '\n');
      throw new Error('app failed to start — did you run `npm run build` first?');
    }
  } else {
    process.stdout.write(`using AUDIT_BASE_URL=${baseUrl}\n`);
  }

  const launchOpts = { headless: !process.env.AUDIT_HEADED };
  if (process.env.CHROMIUM_PATH) launchOpts.executablePath = process.env.CHROMIUM_PATH;

  let browser;
  try {
    browser = await chromium.launch(launchOpts);
  } catch (e) {
    process.stderr.write(
      `\nCould not launch Chromium: ${e.message.split('\n')[0]}\n` +
      'Install it with `npx playwright install --with-deps chromium`, or set\n' +
      'CHROMIUM_PATH to an existing binary.\n'
    );
    throw e;
  }

  const results = [];
  const consoleErrorsByCase = new Map();

  try {
    for (const bp of BREAKPOINTS.filter(b => !ONLY_BP.length || ONLY_BP.includes(b.name))) {
      for (const theme of ['light', 'dark']) {
        const ctx = await browser.newContext({
          viewport: { width: bp.width, height: bp.height },
          deviceScaleFactor: 1,
          isMobile: bp.mobile,
          hasTouch: bp.mobile,
        });
        const page = await ctx.newPage();
        let consoleErrors = [];
        page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
        page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`));

        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(900); // let the feed fetch settle

        if (theme === 'dark') {
          await page.locator('button[aria-label*="theme"]').first().click();
          await page.waitForTimeout(300);
        }

        for (const view of VIEWS) {
          consoleErrors = [];
          if (view === 'feed') {
            // Already here on load; if we navigated away, come back.
            const back = page.locator('button:has-text("← Back to feed")');
            if (await back.count()) { await back.first().click(); await page.waitForTimeout(400); }
          } else {
            const btn = page.locator(`button:has-text("${VIEW_LABEL[view]}")`).first();
            await btn.scrollIntoViewIfNeeded().catch(() => {});
            await btn.click({ timeout: 8000 });
            await page.waitForTimeout(400);
          }

          const m = await page.evaluate(measure, {
            minTapH: MIN_TAP_HEIGHT, minTapW: MIN_TAP_WIDTH,
            minTabStrip: MIN_TAB_STRIP, expectedTabs, touch: bp.mobile,
          });

          const key = `${bp.name}/${theme}/${view}`;
          results.push({ bp: bp.name, theme, view, key, ...m });
          if (consoleErrors.length) consoleErrorsByCase.set(key, [...consoleErrors]);
        }
        await ctx.close();
      }
    }
  } finally {
    await browser.close().catch(() => {});
    if (app) {
      // Signal the GROUP (negative pid), not just the direct child.
      try { process.kill(-app.child.pid, 'SIGKILL'); }
      catch { try { app.child.kill('SIGKILL'); } catch { /* already gone */ } }
    }
    if (fixture) {
      // close() only stops accepting; established keep-alive sockets would keep
      // the event loop alive on their own.
      fixture.server.closeAllConnections?.();
      fixture.server.close();
      fixture.server.unref();
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  const failed = results.filter(r => r.violations.length);

  process.stdout.write(`\nResponsive geometry audit — ${results.length} cases ` +
    `(${BREAKPOINTS.length} breakpoints x 2 themes x ${VIEWS.length} views)\n\n`);

  for (const r of results) {
    const mark = r.violations.length ? 'FAIL' : ' ok ';
    process.stdout.write(
      `${mark}  ${r.bp.padEnd(8)} ${r.theme.padEnd(6)} ${r.view.padEnd(13)} ` +
      `doc=${String(r.docScrollWidth).padStart(5)} vw=${String(r.viewport).padStart(5)}\n`
    );
    for (const v of r.violations) {
      process.stdout.write(`        [${v.rule}] ${v.detail}\n`);
    }
  }

  // Dark mode must actually apply at every breakpoint, not merely not-crash.
  const darkProblems = [];
  for (const r of results.filter(x => x.theme === 'dark')) {
    if (r.theme !== 'dark') continue;
    if (r.themeAttr === 'light') darkProblems.push(`${r.key}: data-theme did not switch`);
  }
  for (const bp of BREAKPOINTS.filter(b => results.some(r => r.bp === b.name))) {
    const dark = results.find(r => r.bp === bp.name && r.theme === 'dark' && r.view === 'feed');
    const light = results.find(r => r.bp === bp.name && r.theme === 'light' && r.view === 'feed');
    if (!dark || !light) continue;
    if (dark.theme !== 'dark' || dark.bodyBg === light.bodyBg) {
      darkProblems.push(`${bp.name}: dark theme did not change the page background (${dark.bodyBg})`);
    }
  }

  process.stdout.write('\nDark mode:\n');
  for (const bp of BREAKPOINTS.filter(b => results.some(r => r.bp === b.name))) {
    const d = results.find(r => r.bp === bp.name && r.theme === 'dark' && r.view === 'feed');
    const l = results.find(r => r.bp === bp.name && r.theme === 'light' && r.view === 'feed');
    process.stdout.write(`  ${bp.name.padEnd(8)} light=${l?.bodyBg}  dark=${d?.bodyBg}  attr=${d?.theme}\n`);
  }

  if (consoleErrorsByCase.size) {
    process.stdout.write('\nConsole errors:\n');
    for (const [k, errs] of consoleErrorsByCase) {
      for (const e of errs.slice(0, 2)) process.stdout.write(`  ${k}: ${e.slice(0, 120)}\n`);
    }
  }

  const totalViolations = failed.reduce((n, r) => n + r.violations.length, 0);
  process.stdout.write(
    `\n${results.length - failed.length}/${results.length} cases clean` +
    (totalViolations ? `, ${totalViolations} violation(s) across ${failed.length} case(s)\n` : '\n')
  );

  if (darkProblems.length) {
    process.stdout.write('\nDark-mode problems:\n');
    for (const p of darkProblems) process.stdout.write(`  ${p}\n`);
  }

  // A console error is a real defect (it is how the /api/brief 500 surfaced),
  // but it is not a geometry violation — report it and fail on it separately.
  const consoleFail = consoleErrorsByCase.size > 0;

  if (failed.length || darkProblems.length || consoleFail) {
    process.stdout.write('\nFAILED — see docs/RESPONSIVE.md for the layout contract these checks defend.\n');
    process.exitCode = 1;
    return;
  }
  process.stdout.write('\nPASSED\n');
}

main()
  .catch(err => {
    process.stderr.write(`\nresponsive-audit crashed: ${err?.stack || err}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    // Belt and braces: the verdict is printed and cleanup has run, so leave now
    // rather than waiting on whatever handle is still open.
    process.exit(process.exitCode ?? 0);
  });
