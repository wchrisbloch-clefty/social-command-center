// config/categories.js — categories as a first-class, editable collection.
//
// ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
// Categories used to be two hardcoded things in two places: a label list in
// config/sources.js and a colour map in app/globals.css. Neither was editable,
// and the colour map keyed off the id in CSS, so adding a category meant
// editing a stylesheet.
//
// Now a category is one record:
//
//   { id, label, color, colorDark, order }
//
//   id         stable, never changes, never shown to a human
//   label      display text — rename freely, nothing points at it
//   color      the Signal Desk stripe/label colour, light theme
//   colorDark  the same hue lifted for a dark ground
//   order      nav position
//
// ── THE INVARIANT ───────────────────────────────────────────────────────────
// A source stores `category: '<id>'`, never a label. That is what makes rename
// and recolour safe: nothing anywhere points at display text, so changing it
// cannot detach a single source.
//
// ASSUMPTION: the shape you specified was { id, label, color, order }. I added
// `colorDark` because one hex cannot serve both themes — a colour readable on
// white is muddy on #0f0f0f, and dark mode has to keep working. It is edited
// together with `color`: pick from the palette and both are set.
//
// ── MIGRATION (documented in docs/CATEGORIES.md) ────────────────────────────
// Zero source edits were required. The strings already on sources ('energy',
// 'business', …) were always ids — the labels lived separately in CATEGORIES.
// So the migration moved COLOUR from CSS into this collection and added
// `order`; every source kept its category untouched. Verified by
// `npm run categories:verify`.

// ── The approved palette ────────────────────────────────────────────────────
// Muted, editorial, never neon. Every light value clears 4.5:1 on white so a
// category label reads as text rather than decoration. Picking a palette entry
// sets both themes at once.
export const PALETTE = [
  { name: 'Slate',        color: '#5b6470', colorDark: '#9aa4b0' },
  { name: 'Soft brass',   color: '#8a6a2f', colorDark: '#d1a758' },
  { name: 'Slate-teal',   color: '#2f6b6b', colorDark: '#5fb0b0' },
  { name: 'Dusty violet', color: '#6b5b8a', colorDark: '#a897c9' },
  { name: 'Muted clay',   color: '#9c5a3c', colorDark: '#d18a6a' },
  { name: 'Sage',         color: '#4a7355', colorDark: '#82b894' },
  { name: 'Dusty rose',   color: '#96536b', colorDark: '#d18aa5' },
  { name: 'Bronze',       color: '#6b5a44', colorDark: '#b39c7d' },
  // Spare hues for categories you add. Same discipline: muted, readable, no neon.
  { name: 'Deep indigo',  color: '#4c5788', colorDark: '#909bd0' },
  { name: 'Moss',         color: '#5f6b3a', colorDark: '#a8b478' },
  { name: 'Oxblood',      color: '#8a3f45', colorDark: '#cf8189' },
  { name: 'Storm blue',   color: '#3c6285', colorDark: '#7fa8cd' },
];

/** The category every orphan falls back to. Cannot be deleted. */
export const FALLBACK_CATEGORY_ID = 'general';

// ── The seeded eight ────────────────────────────────────────────────────────
// These are DEFAULTS, not fixtures. Every one can be renamed, recoloured,
// reordered, merged or deleted like any category you add — except `general`,
// which is the reassignment target of last resort and so must survive.
export const DEFAULT_CATEGORIES = [
  { id: 'general',    label: 'General',            color: '#5b6470', colorDark: '#9aa4b0', order: 0 },
  { id: 'business',   label: 'Business & Markets', color: '#8a6a2f', colorDark: '#d1a758', order: 1 },
  { id: 'energy',     label: 'Energy',             color: '#2f6b6b', colorDark: '#5fb0b0', order: 2 },
  { id: 'tech',       label: 'AI & Tech',          color: '#6b5b8a', colorDark: '#a897c9', order: 3 },
  { id: 'sports',     label: 'Sports',             color: '#9c5a3c', colorDark: '#d18a6a', order: 4 },
  { id: 'health',     label: 'Health',             color: '#4a7355', colorDark: '#82b894', order: 5 },
  { id: 'popculture', label: 'Pop Culture',        color: '#96536b', colorDark: '#d18aa5', order: 6 },
  { id: 'ancient',    label: 'Ancient Mysteries',  color: '#6b5a44', colorDark: '#b39c7d', order: 7 },
];

// ═══════════════════════════════════════════════════════════════════════════
//  ── YOUR CATEGORIES. Edited by the category manager; safe to hand-edit. ──
// ═══════════════════════════════════════════════════════════════════════════
// Written by /api/categories. Keep ids stable — changing an id detaches every
// source using it, which is the one thing this design exists to prevent.
export const CATEGORIES = [
  { id: 'general',    label: 'General',            color: '#5b6470', colorDark: '#9aa4b0', order: 0 },
  { id: 'business',   label: 'Business & Markets', color: '#8a6a2f', colorDark: '#d1a758', order: 1 },
  { id: 'energy',     label: 'Energy',             color: '#2f6b6b', colorDark: '#5fb0b0', order: 2 },
  { id: 'tech',       label: 'AI & Tech',          color: '#6b5b8a', colorDark: '#a897c9', order: 3 },
  { id: 'sports',     label: 'Sports',             color: '#9c5a3c', colorDark: '#d18a6a', order: 4 },
  { id: 'health',     label: 'Health',             color: '#4a7355', colorDark: '#82b894', order: 5 },
  { id: 'popculture', label: 'Pop Culture',        color: '#96536b', colorDark: '#d18aa5', order: 6 },
  { id: 'ancient',    label: 'Ancient Mysteries',  color: '#6b5a44', colorDark: '#b39c7d', order: 7 },
];

// ── Derived views ───────────────────────────────────────────────────────────

/** Nav order. Everything that renders a category list goes through this. */
export function sortedCategories(list = CATEGORIES) {
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label));
}

export const CATEGORY_IDS = CATEGORIES.map(c => c.id);

export function categoryById(id, list = CATEGORIES) {
  return list.find(c => c.id === id) || null;
}

/** Label for an id. Falls back to the id so nothing ever renders blank. */
export function categoryLabel(id, list = CATEGORIES) {
  return categoryById(id, list)?.label || id || 'General';
}

/**
 * Slugify a label into a stable id, avoiding collisions with existing ones.
 * The id is generated ONCE at creation and never regenerated from the label —
 * renaming must not change it.
 */
export function makeCategoryId(label, existing = CATEGORIES) {
  const base = String(label || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'category';
  const taken = new Set(existing.map(c => c.id));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 100; n++) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Renumber `order` to 0..n-1 with no gaps, preserving current sequence. */
export function normalizeOrder(list) {
  return sortedCategories(list).map((c, i) => ({ ...c, order: i }));
}

/**
 * The CSS custom properties the Signal Desk stripe and label read.
 *
 * Colour used to be hardcoded in globals.css keyed by id, which meant a new
 * category had no colour until someone edited a stylesheet. It is data now, so
 * the rules are generated from the collection at render time.
 */
export function categoryStyleSheet(list = CATEGORIES) {
  const light = list.map(c => `[data-cat="${c.id}"]{--cat:${c.color};}`).join('');
  const dark  = list.map(c => `[data-theme="dark"] [data-cat="${c.id}"]{--cat:${c.colorDark || c.color};}`).join('');
  return light + dark;
}
