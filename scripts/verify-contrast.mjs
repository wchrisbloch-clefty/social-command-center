#!/usr/bin/env node
// scripts/verify-contrast.mjs — WCAG contrast for every mark and every colour
// the stylesheet puts on text.
//
//   npm run verify:contrast
//
// TWO checks, because the charts introduced a second kind of colour use.
//
//   A. CHART MARKS — a bar fill, a sparkline stroke, a mix segment. Held to
//      WCAG 1.4.11's 3.0:1 for a non-text graphic that carries meaning. These
//      colours were all chosen as TEXT colours, and a hue that reads fine as
//      13px type is not automatically legible as a 5px bar. The failure is
//      invisible: the bar is still there, just indistinguishable from its
//      track for anyone with reduced contrast sensitivity.
//
//   B. EVERY `color:` DECLARATION in globals.css — held to 4.5:1. Scanned
//      rather than listed, because a hardcoded list goes stale the first time
//      somebody adds a view, and the whole reason the failures below survived
//      is that nothing was measuring. The app has no text at WCAG's "large"
//      size (18pt regular / 14pt bold), so 4.5:1 applies throughout with no
//      exemptions to track.
//
// Three real failures on the first run, none of them visible by eye:
//   · the signal-mix "moderate" segment used --text4 — 2.5:1 light, 2.3:1 dark
//   · --text4 was the colour of four text rules, at the same ratios
//   · dark --text3 was #7d7d7d — 4.66:1 on the page but 4.36:1 on a card, so
//     every card's metadata line missed by 0.14
//
// Tokens are PARSED from app/globals.css rather than copied here. A duplicated
// palette is a palette that drifts, and a contrast check reading stale hexes is
// worse than no check at all.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CATEGORIES } from '../config/categories.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Comments are stripped first. The rule matcher captures everything between
// the previous brace and the next one as the selector list, and globals.css
// leads almost every rule with a banner comment — leave them in and the
// selector list for the light palette reads "/* LIGHT (primary) ... */ :root,
// [data-theme="light"]", which matches nothing.
const css = readFileSync(join(root, 'app/globals.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

// ── Token extraction ────────────────────────────────────────────────────────
// :root holds the light values; [data-theme="dark"] overrides a subset. Later
// declarations win, and dark falls back to light for anything it does not
// override — exactly how the cascade resolves them at runtime.
//
// Rules are matched by SELECTOR LIST, not by an exact string. The light palette
// lives under `:root,\n[data-theme="light"] {`, so a reader looking for the
// literal `:root {` found a different, earlier :root rule, came back with seven
// tokens out of forty, and threw on the first colour it could not find. Every
// matching rule is read, in source order.
//
// ASSUMPTION: colour tokens are declared in flat rules. A rule nested inside an
// at-rule is still read (its selector matches on its own), but the at-rule
// condition is not evaluated — there are no media-conditional colour tokens in
// globals.css today, and one added later would need this to grow a real parser.
const RULE = /([^{}]+)\{([^{}]*)\}/g;

// The capture before a `{` is everything since the previous brace, which for
// the first rule in the file includes the `@import "tailwindcss";` statement
// above it. Anything up to and including the last `;` is not part of the
// selector.
const selectorParts = list => list
  .split(',')
  .map(x => x.slice(x.lastIndexOf(';') + 1).trim().replace(/\s+/g, ' '))
  .filter(Boolean);

function tokens(selector) {
  const out = {};
  let found = 0;
  for (const [, selectorList, body] of css.matchAll(RULE)) {
    if (!selectorParts(selectorList).includes(selector)) continue;
    found++;
    for (const m of body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) out[m[1]] = m[2];
  }
  if (!found) throw new Error(`no rule in globals.css has "${selector}" in its selector list`);
  if (!Object.keys(out).length) throw new Error(`${found} "${selector}" rule(s) but no colour tokens in any of them`);
  return out;
}
const light = tokens(':root');
const dark  = { ...light, ...tokens('[data-theme="dark"]') };

// ── Contrast maths (WCAG 2.x relative luminance) ───────────────────────────
function luminance(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const NON_TEXT_MIN = 3.0;
const TEXT_MIN     = 4.5;

// Charts live inside .sop-strip, which sits on the page background in light
// and on --surface in dark. Both are checked against the darker/lighter of the
// two so a mark cannot pass by picking the friendlier backdrop.
const grounds = {
  light: [light['--bg'], light['--surface']],
  dark:  [dark['--bg'],  dark['--surface']],
};

const marks = [];
for (const c of CATEGORIES) {
  marks.push({ name: `bar fill · ${c.id}`, light: c.color, dark: c.colorDark || c.color, min: NON_TEXT_MIN });
}
marks.push(
  { name: 'sparkline stroke',        token: '--text2',           min: NON_TEXT_MIN },
  { name: 'mix segment · high',      token: '--ah-signal-high',  min: NON_TEXT_MIN },
  { name: 'mix segment · rising',    token: '--ah-signal-rising', min: NON_TEXT_MIN },
  { name: 'mix segment · moderate',  token: '--text3',           min: NON_TEXT_MIN },
  { name: 'bar fill · uncategorised', token: '--text3',          min: NON_TEXT_MIN },
  // Chart TEXT is held to the stricter 4.5:1: the numbers are the data, and a
  // number nobody can read is not a supplement, it is the whole chart missing.
  { name: 'bar label text',          token: '--text2',           min: TEXT_MIN },
  { name: 'bar value text',          token: '--text3',           min: TEXT_MIN },
  { name: 'sparkline foot text',     token: '--text3',           min: TEXT_MIN },
);

const rows = [];
const problems = [];
for (const m of marks) {
  const lc = m.token ? light[m.token] : m.light;
  const dc = m.token ? dark[m.token]  : m.dark;
  if (!lc || !dc) { problems.push(`${m.name}: token ${m.token} not found`); continue; }
  const lr = Math.min(...grounds.light.map(g => ratio(lc, g)));
  const dr = Math.min(...grounds.dark.map(g => ratio(dc, g)));
  const pass = lr >= m.min && dr >= m.min;
  rows.push({ name: m.name, lc, dc, lr, dr, min: m.min, pass });
  if (!pass) {
    problems.push(
      `${m.name}: ${lr < m.min ? `light ${lc} = ${lr.toFixed(2)}:1` : ''}` +
      `${lr < m.min && dr < m.min ? ', ' : ''}` +
      `${dr < m.min ? `dark ${dc} = ${dr.toFixed(2)}:1` : ''} (needs ${m.min.toFixed(1)}:1)`
    );
  }
}

// ── B. Every colour the stylesheet puts on text ────────────────────────────
const CAT_COLORS = {
  light: CATEGORIES.map(c => ({ id: c.id, hex: c.color })),
  dark:  CATEGORIES.map(c => ({ id: c.id, hex: c.colorDark || c.color })),
};

// An element that paints its own background is not measured against the page.
// The active tab, the primary button and the segmented control all invert —
// white type on near-black — and checking those against the page ground reports
// 1.00:1, which is the check being wrong rather than the design.
//
// Backgrounds are indexed by selector so a DESCENDANT can find its ancestor's
// fill: `.drill-item.active .drill-count` gets its ground from
// `.drill-item.active`, which is a different rule.
const bgBySelector = new Map();
for (const [, selectorList, body] of css.matchAll(RULE)) {
  const bg = body.match(/(?:^|;)\s*background(?:-color)?:\s*([^;]+)/);
  if (!bg) continue;
  const ref = bg[1].match(/var\(\s*(--[\w-]+)/) || bg[1].match(/(#[0-9a-fA-F]{3,8})/);
  if (!ref) continue; // none, transparent, a gradient — not a flat ground
  for (const sel of selectorParts(selectorList)) bgBySelector.set(sel, ref[1]);
}

/**
 * The two colours this rule's text actually sits on, light and dark.
 *
 * Walks the selector's ancestor prefixes so a descendant inherits the fill its
 * ancestor paints. Falls back to the page grounds, which is correct for the
 * overwhelming majority of rules.
 */
function groundsFor(selector, body) {
  const own = body.match(/(?:^|;)\s*background(?:-color)?:\s*([^;]+)/);
  const ownRef = own && (own[1].match(/var\(\s*(--[\w-]+)/) || own[1].match(/(#[0-9a-fA-F]{3,8})/));
  let ref = ownRef ? ownRef[1] : null;

  if (!ref) {
    const parts = selector.split(' ');
    for (let n = parts.length - 1; n >= 1 && !ref; n--) {
      ref = bgBySelector.get(parts.slice(0, n).join(' ')) || null;
    }
  }
  if (!ref) return { light: grounds.light, dark: grounds.dark, from: 'page' };

  const resolve = (map, fallback) =>
    ref.startsWith('#') ? ref : (map[ref] || fallback);
  const l = resolve(light, null), d = resolve(dark, null);
  if (!l || !d) return { light: grounds.light, dark: grounds.dark, from: 'page' };
  return { light: [l], dark: [d], from: ref };
}

const textRows = [];
for (const [, selectorList, body] of css.matchAll(RULE)) {
  const selector = selectorParts(selectorList).join(', ');
  if (!selector) continue;
  const g = groundsFor(selectorParts(selectorList)[0], body);
  for (const decl of body.matchAll(/(?:^|;)\s*color:\s*([^;]+)/g)) {
    const value = decl[1].trim();
    const refs = [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map(m => m[1]);
    // --cat means "whatever category this element belongs to", so every hue in
    // the collection has to clear the bar — not just the fallback beside it.
    const names = refs.includes('--cat')
      ? [...CAT_COLORS.light.map(c => `--cat:${c.id}`), ...refs.filter(r => r !== '--cat')]
      : refs;
    for (const name of names) {
      const id = name.startsWith('--cat:') ? name.slice(6) : null;
      const lc = id ? CAT_COLORS.light.find(c => c.id === id).hex : light[name];
      const dc = id ? CAT_COLORS.dark.find(c => c.id === id).hex  : dark[name];
      // Not a colour token: var(--fs-…) inside a shorthand, inherit, currentColor.
      if (!lc || !dc) continue;
      const lr = Math.min(...g.light.map(bg => ratio(lc, bg)));
      const dr = Math.min(...g.dark.map(bg => ratio(dc, bg)));
      const pass = lr >= TEXT_MIN && dr >= TEXT_MIN;
      textRows.push({ selector, name, lr, dr, pass, lc, dc, on: g.from });
      if (!pass) {
        problems.push(
          `text ${selector} { color: ${name} }: ` +
          `${lr < TEXT_MIN ? `light ${lc} = ${lr.toFixed(2)}:1` : ''}` +
          `${lr < TEXT_MIN && dr < TEXT_MIN ? ', ' : ''}` +
          `${dr < TEXT_MIN ? `dark ${dc} = ${dr.toFixed(2)}:1` : ''} ` +
          `on ${g.from} (needs ${TEXT_MIN.toFixed(1)}:1)`
        );
      }
    }
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
process.stdout.write(`\nChart contrast — ${rows.length} marks, both themes\n`);
process.stdout.write(`  light ground ${grounds.light.join(' / ')}   dark ground ${grounds.dark.join(' / ')}\n\n`);
process.stdout.write(`  ${'mark'.padEnd(28)} ${'need'.padStart(5)} ${'light'.padStart(7)} ${'dark'.padStart(7)}\n`);
for (const r of rows) {
  process.stdout.write(
    `  ${r.pass ? 'ok  ' : 'FAIL'} ${r.name.padEnd(23)} ${r.min.toFixed(1).padStart(5)} ` +
    `${r.lr.toFixed(2).padStart(7)} ${r.dr.toFixed(2).padStart(7)}\n`
  );
}

const textFails = textRows.filter(r => !r.pass);
process.stdout.write(
  `\nText colour — ${textRows.length} declarations scanned from globals.css, ` +
  `held to ${TEXT_MIN.toFixed(1)}:1\n`
);
if (textFails.length) {
  for (const r of textFails) {
    process.stdout.write(
      `  FAIL ${r.selector.slice(0, 40).padEnd(40)} ${r.name.padEnd(14)} ` +
      `light ${r.lr.toFixed(2)}  dark ${r.dr.toFixed(2)}  on ${r.on}\n`
    );
  }
} else if (textRows.length) {
  const worst = textRows.reduce((w, r) =>
    Math.min(r.lr, r.dr) < Math.min(w.lr, w.dr) ? r : w, textRows[0]);
  process.stdout.write(
    `  all clear · tightest is "${worst.selector.slice(0, 36)}" ` +
    `{ color: ${worst.name} } at ${Math.min(worst.lr, worst.dr).toFixed(2)}:1\n`
  );
}

if (problems.length) {
  process.stdout.write('\nFAILED\n');
  for (const p of problems) process.stdout.write(`  ✗ ${p}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    '\nPASSED — every chart mark clears 3.0:1 and every text colour clears 4.5:1, ' +
    'in both themes.\n'
  );
}
