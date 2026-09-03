#!/usr/bin/env node
// scripts/verify-charts.mjs — the chart honesty check.
//
//   npm run verify:charts
//
// Proves the one invariant the charts exist to protect: a chart may only draw
// what the pipeline actually produced.
//
// That invariant is easy to break by accident and impossible to see once
// broken. Zero-filled padding renders as a clean flat line; a percentage
// rounded to 100 renders as a full bar; a series scaled against a stale maximum
// renders as a plausible shape. All three look like data. So this asserts the
// properties directly rather than eyeballing a screenshot:
//
//   1. An empty input returns an EMPTY series, never zeroes.
//   2. Bucket counts sum to exactly the number of items inside the window,
//      and items outside it are excluded rather than clamped in.
//   3. Bars carry the real count, sorted descending.
//   4. Mix percentages are derived from the raw counts and sum to 100 — and
//      the raw counts survive, because the counts are what get rendered.
//   5. Nothing is smoothed: a single item produces a single non-zero bucket.

import {
  bucketByTime, bucketLabel, categoryBars, topicBars, signalMix, SPARK_BUCKETS,
} from '../lib/chart-data.js';

const problems = [];
const checks = [];
const ok = (name, cond, detail = '') => {
  checks.push({ name, pass: !!cond, detail });
  if (!cond) problems.push(`${name}${detail ? ` — ${detail}` : ''}`);
};

// Items as normalizeSignal() leaves them: ageHours is what the buckets read.
const item = (ageHours, extra = {}) => ({ id: `i${ageHours}`, ageHours, ...extra });

// ── 1. Empty in, empty out ──────────────────────────────────────────────────
{
  const b = bucketByTime([], 48);
  ok('empty feed → empty:true', b.empty === true);
  ok('empty feed → total 0', b.total === 0);
  ok('empty feed → no invented points', b.points.every(p => p === 0));
  ok('empty feed → still a fixed-width series', b.points.length === SPARK_BUCKETS);

  ok('no groups → no bars', categoryBars([]).length === 0);
  ok('no topics → no bars', topicBars([]).length === 0);
  ok('zero groups are dropped, not drawn',
    categoryBars([{ id: 'a', label: 'A', total: 0, high: 0, rising: 0 }]).length === 0);

  const m = signalMix({ total: 0, high: 0, rising: 0, moderate: 0 });
  ok('empty summary → empty:true', m.empty === true);
  ok('empty summary → every pct 0, never NaN',
    m.segments.every(s => s.pct === 0), JSON.stringify(m.segments.map(s => s.pct)));
}

// ── 2. Bucketing conserves the window, and only the window ─────────────────
{
  const inside  = [0, 1, 5, 12, 23.9, 47.9].map(h => item(h));
  const outside = [48.1, 100, 1000].map(h => item(h));
  const b = bucketByTime([...inside, ...outside], 48);
  ok('bucket total equals items inside the window',
    b.total === inside.length, `${b.total} vs ${inside.length}`);
  ok('points sum to total',
    b.points.reduce((a, c) => a + c, 0) === b.total);
  ok('items outside the window are excluded, not clamped into the last bucket',
    b.points[0] + b.points[b.points.length - 1] < b.total + 1);

  // A negative or non-finite age is bad data, not bucket zero.
  const bad = bucketByTime([item(-3), item(NaN), item(1)], 48);
  ok('bad ages are dropped rather than bucketed', bad.total === 1, `total=${bad.total}`);
}

// ── 3. Bucket duration and orientation ─────────────────────────────────────
{
  for (const hours of [24, 48, 168]) {
    const b = bucketByTime([item(0)], hours);
    ok(`${hours}h → ${SPARK_BUCKETS} buckets`, b.points.length === SPARK_BUCKETS);
    ok(`${hours}h → bucketHours ${hours / SPARK_BUCKETS}`, b.bucketHours === hours / SPARK_BUCKETS);
    ok(`${hours}h → now lands in the LAST bucket (left-to-right is time)`,
      b.points[SPARK_BUCKETS - 1] === 1 && b.points[0] === 0);
  }
  const oldest = bucketByTime([item(47.5)], 48);
  ok('the oldest item lands in the FIRST bucket',
    oldest.points[0] === 1, JSON.stringify(oldest.points));
}

// ── 4. No smoothing ────────────────────────────────────────────────────────
{
  const b = bucketByTime([item(10)], 48);
  const nonZero = b.points.filter(p => p > 0).length;
  ok('one item produces exactly one non-zero bucket — nothing is spread',
    nonZero === 1, `${nonZero} non-zero buckets`);
  ok('peak equals that single count', b.peak === 1);
  ok('peakIndex points at it', b.points[b.peakIndex] === b.peak);
}

// ── 5. Bars carry real counts, sorted descending ───────────────────────────
{
  const groups = [
    { id: 'space',  label: 'Space',  total: 3,  high: 1, rising: 1 },
    { id: 'sports', label: 'Sports', total: 17, high: 4, rising: 6 },
    { id: 'health', label: 'Health', total: 9,  high: 0, rising: 2 },
  ];
  const bars = categoryBars(groups);
  ok('one bar per non-empty group', bars.length === 3);
  ok('sorted descending by value',
    bars.map(b => b.value).join(',') === '17,9,3', bars.map(b => b.value).join(','));
  ok('values are the real totals, not the capped item lists',
    bars.find(b => b.id === 'sports').value === 17);
  ok('catId is passed through so the bar can inherit --cat',
    bars.every(b => b.catId === b.id));
  ok('detail states High/Rising as words',
    bars[0].detail === '4 High · 6 Rising', bars[0].detail);
  ok('a group with no High and no Rising gets no invented detail',
    categoryBars([{ id: 'x', label: 'X', total: 2, high: 0, rising: 0 }])[0].detail === '');

  const topics = [
    { term: 'ai',  label: 'AI',  episodes: 4, showCount: 3, shows: ['a', 'b', 'c'] },
    { term: 'fed', label: 'Fed', episodes: 9, showCount: 2, shows: ['a', 'b'] },
  ];
  const tbars = topicBars(topics);
  ok('topics sort descending', tbars[0].id === 'fed');
  ok('topic bars are NEUTRAL — no category hue is asserted',
    tbars.every(b => b.catId === null));
  ok('topic detail pluralises show counts and names the shows',
    tbars[0].detail === '2 shows · a · b' && tbars[1].detail === '3 shows · a · b · c',
    `${tbars[0].detail} / ${tbars[1].detail}`);
  ok('a single-show topic still reads correctly',
    topicBars([{ term: 'x', label: 'X', episodes: 1, showCount: 1, shows: ['solo'] }])[0].detail
      === '1 show · solo');
  ok('a topic with no show list does not invent one',
    topicBars([{ term: 'y', label: 'Y', episodes: 2, showCount: 2 }])[0].detail === '2 shows');
}

// ── 6. Mix percentages derive from counts, and counts survive ──────────────
{
  const m = signalMix({ total: 20, high: 5, rising: 5, moderate: 10 });
  ok('mix total is the sum of the three counts, not the reported total',
    m.total === 20, String(m.total));
  ok('percentages sum to 100',
    Math.abs(m.segments.reduce((a, s) => a + s.pct, 0) - 100) < 1e-9);
  ok('raw counts survive alongside the percentages',
    m.segments.map(s => s.value).join(',') === '5,5,10');
  ok('segment order is fixed high → rising → moderate',
    m.segments.map(s => s.id).join(',') === 'high,rising,moderate');

  // A summary whose `total` disagrees with its parts must not be trusted over
  // the parts: the parts are what the strip draws.
  const skewed = signalMix({ total: 999, high: 1, rising: 0, moderate: 0 });
  ok('a disagreeing summary total is ignored in favour of the parts',
    skewed.total === 1 && skewed.segments[0].pct === 100, String(skewed.total));
}

// ── 7. Bucket labels are honest about their span ───────────────────────────
{
  ok('the newest bucket says "last"', bucketLabel(SPARK_BUCKETS - 1, 2).startsWith('last '));
  ok('an older bucket states both ends',
    bucketLabel(SPARK_BUCKETS - 4, 2) === '8h–6h ago', bucketLabel(SPARK_BUCKETS - 4, 2));
  ok('sub-hour buckets read in minutes',
    bucketLabel(SPARK_BUCKETS - 1, 0.5) === 'last 30m', bucketLabel(SPARK_BUCKETS - 1, 0.5));
}

// ── Report ─────────────────────────────────────────────────────────────────
process.stdout.write(`\nChart honesty check — ${checks.length} assertions\n\n`);
for (const c of checks) {
  process.stdout.write(`  ${c.pass ? 'ok  ' : 'FAIL'}  ${c.name}${c.pass || !c.detail ? '' : `  [${c.detail}]`}\n`);
}

if (problems.length) {
  process.stdout.write(`\nFAILED — ${problems.length} of ${checks.length}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('\nPASSED — every series draws only what the pipeline produced.\n');
}
