// lib/velocity.js — the ONE velocity engine.
//
// Discover (B1), the topic radar (B2) and the Sports drill-down (D1) all rank
// through this file. There is deliberately no second implementation: "what is
// spiking in Energy" and "what is spiking about the Houston Texans" are the
// same question with a different filter, and two engines would drift.
//
// The scoring itself already happened — normalizeSignal() assigned every item a
// `signal` (high/rising/moderate) and a `velocity`, using real view counts where
// a platform gives them (YouTube) and recency where it does not (all RSS). This
// module only WINDOWS, FILTERS, RANKS and GROUPS what the pipeline produced.

import { CATEGORIES } from '../config/sources.js';

/** Default rolling window. "What's spiking in my world" is a 2-day question. */
export const DEFAULT_WINDOW_HOURS = 48;

export const WINDOW_OPTIONS = [
  { hours: 24,  label: '24h' },
  { hours: 48,  label: '48h' },
  { hours: 168, label: '7d'  },
];

// Plain words, never icons. See docs/DESIGN.md — velocity is a word.
export const VELOCITY_WORD = { high: 'High', rising: 'Rising', moderate: 'Moderate' };
const RANK = { high: 3, rising: 2, moderate: 1 };

/**
 * Numeric heat, used only for ordering WITHIN a signal band.
 *
 * Two items both marked "High" still need a stable order. Views-per-hour is the
 * honest tiebreak where views exist; where they do not, freshness stands in.
 * Deliberately not surfaced in the UI — the user sees a word, not a number.
 */
export function heat(item) {
  const age = Math.max(Number(item.ageHours) || 0, 0.25);
  const band = (RANK[item.signal] || 1) * 1_000_000;
  const perHour = (Number(item.views) || 0) / age;
  // No views (every RSS source): fall back to pure recency inside the band.
  const recency = 1 / age;
  return band + (perHour > 0 ? Math.min(perHour, 999_999) : recency);
}

/** Items published inside the rolling window. */
export function withinWindow(items, windowHours = DEFAULT_WINDOW_HOURS) {
  return items.filter(i => (Number(i.ageHours) ?? Infinity) <= windowHours);
}

/**
 * The core call: window → filter → rank.
 *
 * @param {object[]} items      normalized signals (already through normalizeSignal)
 * @param {object}   opts
 * @param {number}   opts.windowHours
 * @param {string}   opts.category     restrict to one category id
 * @param {string}   opts.subcategory  restrict to one subcategory id (Sports leagues/teams)
 * @param {number}   opts.limit
 */
export function rankByVelocity(items, {
  windowHours = DEFAULT_WINDOW_HOURS,
  category = null,
  subcategory = null,
  limit = Infinity,
} = {}) {
  let pool = withinWindow(items, windowHours);
  if (category)    pool = pool.filter(i => i.category === category);
  if (subcategory) pool = pool.filter(i => i.subcategory === subcategory);

  return [...pool]
    .sort((a, b) => heat(b) - heat(a))
    .slice(0, limit === Infinity ? undefined : limit);
}

/**
 * Group ranked items by category, in nav order, dropping empties.
 * Each group carries its own counts so a view can say "3 High" without
 * recomputing anything.
 */
export function groupByCategory(items, { windowHours = DEFAULT_WINDOW_HOURS, perCategory = 6 } = {}) {
  const ranked = rankByVelocity(items, { windowHours });
  return CATEGORIES
    .map(c => {
      const inCat = ranked.filter(i => i.category === c.id);
      return {
        id: c.id,
        label: c.label,
        items: inCat.slice(0, perCategory),
        total: inCat.length,
        high: inCat.filter(i => i.signal === 'high').length,
        rising: inCat.filter(i => i.signal === 'rising').length,
      };
    })
    .filter(g => g.total > 0);
}

/**
 * Group by subcategory within one category — the Sports league/team view.
 * Same engine, one more filter; nothing here re-derives velocity.
 */
export function groupBySubcategory(items, category, subcategories, {
  windowHours = DEFAULT_WINDOW_HOURS, perGroup = 6,
} = {}) {
  const ranked = rankByVelocity(items, { windowHours, category });
  return subcategories
    .map(sc => {
      const inSub = ranked.filter(i => i.subcategory === sc.id);
      return {
        id: sc.id,
        label: sc.label,
        parent: sc.parent || null,
        items: inSub.slice(0, perGroup),
        total: inSub.length,
        high: inSub.filter(i => i.signal === 'high').length,
        rising: inSub.filter(i => i.signal === 'rising').length,
      };
    })
    .filter(g => g.total > 0);
}

/** Counts for a window, for the "N spiking" summary line. */
export function velocitySummary(items, windowHours = DEFAULT_WINDOW_HOURS) {
  const pool = withinWindow(items, windowHours);
  return {
    total: pool.length,
    high: pool.filter(i => i.signal === 'high').length,
    rising: pool.filter(i => i.signal === 'rising').length,
    moderate: pool.filter(i => i.signal === 'moderate').length,
  };
}
