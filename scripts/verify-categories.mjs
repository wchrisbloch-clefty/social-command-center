#!/usr/bin/env node
// scripts/verify-categories.mjs — the category integrity check.
//
//   npm run categories:verify
//
// Proves the invariant the ID model exists to protect: every source is attached
// to a category that exists, by id, and nothing points at display text.
//
// Run it after any category edit. It is cheap, and a detached source is silent
// otherwise — the item just stops appearing under any tab.

import {
  CATEGORIES, DEFAULT_CATEGORIES, FALLBACK_CATEGORY_ID, PALETTE,
} from '../config/categories.js';
import { SOCIAL_SOURCES, YOUTUBE_SOURCES, TOPIC_SOURCES } from '../config/sources.js';

const all = [
  ...SOCIAL_SOURCES.map(s => ({ ...s, _list: 'SOCIAL_SOURCES' })),
  ...YOUTUBE_SOURCES.map(s => ({ ...s, _list: 'YOUTUBE_SOURCES' })),
  ...TOPIC_SOURCES.map(s => ({ ...s, _list: 'TOPIC_SOURCES' })),
];

const ids = new Set(CATEGORIES.map(c => c.id));
const problems = [];

// 1. Every source resolves to a real category id.
for (const s of all) {
  const name = s.person || s.label || s.route || '(unnamed)';
  if (!s.category) problems.push(`${s._list}: "${name}" has no category`);
  else if (!ids.has(s.category)) problems.push(`${s._list}: "${name}" → category "${s.category}" does not exist`);
}

// 2. Ids are unique.
const seen = new Set();
for (const c of CATEGORIES) {
  if (seen.has(c.id)) problems.push(`duplicate category id "${c.id}"`);
  seen.add(c.id);
}

// 3. The fallback survives — delete/merge reassign into it.
if (!ids.has(FALLBACK_CATEGORY_ID)) {
  problems.push(`the fallback category "${FALLBACK_CATEGORY_ID}" has been removed — delete and merge have nowhere to reassign orphans`);
}

// 4. Every category is renderable: label, both colours, an order.
const hex = /^#[0-9a-fA-F]{6}$/;
for (const c of CATEGORIES) {
  if (!c.label?.trim())            problems.push(`category "${c.id}" has no label`);
  if (!hex.test(c.color || ''))    problems.push(`category "${c.id}" has an invalid color "${c.color}"`);
  if (!hex.test(c.colorDark || '')) problems.push(`category "${c.id}" has an invalid colorDark "${c.colorDark}"`);
  if (!Number.isFinite(c.order))   problems.push(`category "${c.id}" has no order`);
}

// 5. Migration check: every DEFAULT category id still resolves. Renaming is
//    fine — that is the point — but an id vanishing means sources detached.
const migrated = DEFAULT_CATEGORIES.filter(d => !ids.has(d.id));

// ── Report ──────────────────────────────────────────────────────────────────
const byCat = {};
for (const s of all) byCat[s.category] = (byCat[s.category] || 0) + 1;

process.stdout.write(`\nCategory integrity — ${all.length} sources, ${CATEGORIES.length} categories\n\n`);
for (const c of [...CATEGORIES].sort((a, b) => a.order - b.order)) {
  const n = byCat[c.id] || 0;
  process.stdout.write(
    `  ${String(c.order).padStart(2)}  ${c.id.padEnd(14)} ${c.label.padEnd(20)} ` +
    `${c.color} / ${c.colorDark}  ${String(n).padStart(3)} source${n === 1 ? '' : 's'}\n`
  );
}

const orphanIds = Object.keys(byCat).filter(id => !ids.has(id));
if (orphanIds.length) {
  process.stdout.write(`\n  ORPHANED category ids referenced by sources: ${orphanIds.join(', ')}\n`);
}
if (migrated.length) {
  process.stdout.write(`\n  Seeded categories no longer present (deleted or merged): ${migrated.map(d => d.id).join(', ')}\n`);
  process.stdout.write('  That is allowed — they are defaults, not fixtures — provided their sources were reassigned, which check 1 confirms.\n');
}

const palette = new Set(PALETTE.map(p => p.color));
const offPalette = CATEGORIES.filter(c => !palette.has(c.color));
if (offPalette.length) {
  process.stdout.write(`\n  Note: ${offPalette.length} category colour(s) are not from the approved palette: ${offPalette.map(c => c.id).join(', ')}\n`);
}

process.stdout.write(`\n  total attached: ${all.filter(s => ids.has(s.category)).length}/${all.length}\n`);

if (problems.length) {
  process.stdout.write('\nFAILED\n');
  for (const p of problems) process.stdout.write(`  ✗ ${p}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('\nPASSED — every source is attached to a category that exists, by id.\n');
}
