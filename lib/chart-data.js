// lib/chart-data.js — turn normalized signals into chart-ready series.
//
// ═══════════════════════════════════════════════════════════════════════════
//  PURE. NO REACT, NO DOM, NO FETCHING.
// ═══════════════════════════════════════════════════════════════════════════
// Every function here takes items that have already been through
// normalizeSignal() and returns plain arrays. That keeps the charts testable
// without a browser and keeps the maths out of app/page.jsx, which is already
// long enough.
//
// ── THE RULE THESE FUNCTIONS EXIST TO ENFORCE ───────────────────────────────
// A chart may only draw what the pipeline actually produced. Every series
// returned here carries the real count it was built from, and returns an EMPTY
// array rather than zero-filled padding when there is nothing to show — so a
// caller cannot accidentally render a flat line or a row of empty bars and
// imply "we measured nothing" when the truth is "we measured nothing yet".
//
// There is deliberately no smoothing, no interpolation and no projection.

import { withinWindow, DEFAULT_WINDOW_HOURS } from './velocity.js';

/** Fixed point count for every sparkline, whatever the window. */
export const SPARK_BUCKETS = 24;

/**
 * Bucket items into a fixed number of equal time slices across the window.
 *
 * 24 buckets regardless of window keeps the drawing code trivial and the shape
 * comparable when you switch 24h/48h/7d: the line always has the same
 * resolution, only the bucket duration changes.
 *   24h → 1h buckets · 48h → 2h · 7d → 7h
 *
 * Index 0 is the OLDEST bucket, so the line reads left-to-right as time.
 *
 * @returns {{points: number[], bucketHours: number, total: number, peak: number,
 *            peakIndex: number, empty: boolean}}
 */
export function bucketByTime(items, windowHours = DEFAULT_WINDOW_HOURS, buckets = SPARK_BUCKETS) {
  const pool = withinWindow(items || [], windowHours);
  const bucketHours = windowHours / buckets;
  const points = new Array(buckets).fill(0);

  for (const item of pool) {
    const age = Number(item.ageHours);
    if (!Number.isFinite(age) || age < 0) continue;
    // age 0 is NOW, which belongs in the last bucket.
    const fromEnd = Math.floor(age / bucketHours);
    const idx = buckets - 1 - Math.min(fromEnd, buckets - 1);
    points[idx]++;
  }

  const total = points.reduce((a, b) => a + b, 0);
  const peak = points.reduce((a, b) => Math.max(a, b), 0);
  return {
    points,
    bucketHours,
    total,
    peak,
    peakIndex: points.indexOf(peak),
    // No items in the window at all. The caller must show an empty state
    // rather than a flat line, which would read as "measured, and it was zero".
    empty: total === 0,
  };
}

/** Human label for one bucket, used in the sparkline's text summary. */
export function bucketLabel(index, bucketHours, buckets = SPARK_BUCKETS) {
  const endAgo = (buckets - 1 - index) * bucketHours;
  const startAgo = endAgo + bucketHours;
  const fmt = h => (h < 1 ? `${Math.round(h * 60)}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`);
  return endAgo === 0 ? `last ${fmt(bucketHours)}` : `${fmt(startAgo)}–${fmt(endAgo)} ago`;
}

/**
 * Category groups → bar rows, sorted descending.
 *
 * Descending sort is the skill's guidance for Compare Categories and it is also
 * just correct: the ranking IS the insight, so the eye should not have to hunt.
 *
 * `catId` is passed through so the bar can carry data-cat and inherit --cat —
 * the same custom property the card's left stripe uses. That is what makes this
 * chart add zero new colour.
 */
export function categoryBars(groups) {
  return (groups || [])
    .filter(g => g.total > 0)
    .map(g => ({
      id: g.id,
      catId: g.id,
      label: g.label,
      value: g.total,
      // Stated as text next to the bar, never as a second colour.
      detail: [g.high ? `${g.high} High` : null, g.rising ? `${g.rising} Rising` : null]
        .filter(Boolean).join(' · '),
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

/**
 * Cross-show topics → bar rows, sorted descending.
 *
 * ASSUMPTION: topic bars are NEUTRAL, not category-coloured. A topic spans
 * several shows and often several categories, so painting it with one
 * category's hue would assert a relationship the data does not have. Neutral is
 * the honest choice and keeps the category palette meaning exactly one thing.
 */
export function topicBars(topics) {
  return (topics || [])
    .filter(t => (t.episodes || 0) > 0)
    .map(t => ({
      id: t.term,
      catId: null,
      label: t.label || t.term,
      value: t.episodes,
      // WHICH shows, named. A cross-show topic is only interesting because
      // several shows reached it independently, so the show list is the
      // evidence for the bar and belongs beside it — not behind a tooltip.
      detail: [
        `${t.showCount} show${t.showCount === 1 ? '' : 's'}`,
        ...(t.shows || []),
      ].join(' · '),
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

/**
 * velocitySummary → segments for a single 100%-stacked strip.
 *
 * Deliberately NOT a pie or donut. The skill's own "when NOT to use" for
 * part-to-whole lists accessibility-first contexts, and a pie would be the one
 * decorative shape on an otherwise rectangular desk.
 *
 * Order is fixed high → rising → moderate so the strip reads the same every
 * time and the eye can compare across window switches.
 */
export function signalMix(summary) {
  const s = summary || {};
  const segments = [
    { id: 'high',     label: 'High',     value: Number(s.high) || 0 },
    { id: 'rising',   label: 'Rising',   value: Number(s.rising) || 0 },
    { id: 'moderate', label: 'Moderate', value: Number(s.moderate) || 0 },
  ];
  const total = segments.reduce((n, x) => n + x.value, 0);
  return {
    total,
    empty: total === 0,
    // Percentages are for WIDTH only. Every segment also carries its raw count,
    // which is what gets rendered as text — the width is the supplement.
    segments: segments.map(x => ({ ...x, pct: total ? (x.value / total) * 100 : 0 })),
  };
}
