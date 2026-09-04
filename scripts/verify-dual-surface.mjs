#!/usr/bin/env node
// scripts/verify-dual-surface.mjs — one signal, two views.
//
//   npm run verify:dual
//
// An episode now appears in TWO places: the Podcasts tab and the topic-category
// feed its show notes place it in. That is a rendering decision, and it is only
// correct if both places render the SAME normalized signal.
//
// The failure mode is silent in the worst way. A duplicated episode does not
// look like a bug — it looks like the show published twice. But it also
// double-counts in every velocity total, every category bar and every
// cross-show topic, so the numbers quietly stop matching the list they sit
// above. Nothing on screen says so.
//
// So this asserts the invariants directly, offline:
//
//   1. dedupeById keeps one signal per id, first occurrence winning.
//   2. An episode's id does not change with its category — the id is derived
//      from the URL, so the same episode is the same signal in both views.
//   3. classifyEpisode never force-assigns: confident text classifies, thin
//      text falls to `general`, and inconclusive-but-present text keeps the
//      show's own category.
//   4. tier stays 'podcast' wherever an episode lands.
//   5. Velocity maths over a deduped feed counts each episode exactly once.

import { normalizeSignal, dedupeById, sortSignals } from '../lib/adapters.js';
import { classifyEpisode, THIN_NOTES_CHARS } from '../lib/categorize.js';
import { velocitySummary, groupByCategory, rankByVelocity } from '../lib/velocity.js';

const checks = [];
const problems = [];
const ok = (name, cond, detail = '') => {
  checks.push({ name, pass: !!cond, detail });
  if (!cond) problems.push(`${name}${detail ? ` — ${detail}` : ''}`);
};

const iso = hoursAgo => new Date(Date.now() - hoursAgo * 3600e3).toISOString();

/** An episode as the podcasts route builds it, category already decided. */
const episode = (url, category, hoursAgo = 2, extra = {}) => normalizeSignal({
  platform: 'Podcast',
  title: extra.title || `Episode at ${url}`,
  content: extra.content || 'some show notes',
  url,
  pubDate: iso(hoursAgo),
  show: extra.show || 'Test Show',
  category,
  ...extra,
}, { platform: 'Podcast', label: extra.show || 'Test Show', category: 'business' });

// ── 1. dedupeById ───────────────────────────────────────────────────────────
{
  const a = episode('https://ex.com/ep1', 'tech');
  const b = episode('https://ex.com/ep1', 'tech');
  const c = episode('https://ex.com/ep2', 'business');
  ok('the same episode twice collapses to one', dedupeById([a, b, c]).length === 2);
  ok('distinct episodes are all kept', dedupeById([a, c]).length === 2);
  ok('first occurrence wins', dedupeById([a, b])[0] === a);
  ok('an empty feed dedupes to empty', dedupeById([]).length === 0);
  ok('null input does not throw', dedupeById(null).length === 0);
  ok('an item with no id is dropped rather than colliding',
    dedupeById([{ id: '' }, { id: null }, a]).length === 1);
}

// ── 2. The id is the episode, not the placement ─────────────────────────────
// This is THE dual-surface invariant. If a category change moved the id, the
// Podcasts tab and the category feed would hold two different objects for one
// episode and every dedupe downstream would miss it.
{
  const url = 'https://ex.com/acquired-disney';
  const inTech     = episode(url, 'tech');
  const inBusiness = episode(url, 'business');
  ok('the same URL yields the same id whatever the category',
    inTech.id === inBusiness.id, `${inTech.id} vs ${inBusiness.id}`);
  ok('the two placements dedupe to one signal',
    dedupeById([inTech, inBusiness]).length === 1);
  ok('but the category really did differ — the test is not vacuous',
    inTech.category !== inBusiness.category);
}

// ── 3. classifyEpisode never force-assigns ─────────────────────────────────
{
  const long = t => `${t} ${'x'.repeat(THIN_NOTES_CHARS)}`;

  const tech = classifyEpisode(
    { title: 'The chipmaker nobody watched',
      notes: long('a deep dive on semiconductor fabrication and machine learning compute') },
    'business');
  ok('clear tech notes move a business show into tech',
    tech.category === 'tech', `${tech.category} (${tech.categoryConfidence})`);
  ok('a moved episode records that the EPISODE decided it',
    tech.categorySource === 'episode', tech.categorySource);
  ok('and names the terms it matched', tech.categoryMatched.length > 0);

  const stays = classifyEpisode(
    { title: 'Valuation, IPO and the private equity playbook',
      notes: long('earnings, venture capital, m&a and portfolio strategy') },
    'business');
  ok('a business episode of a business show stays put', stays.category === 'business');
  ok('and is marked show-confirmed rather than merely inherited',
    stays.categorySource === 'show-confirmed', stays.categorySource);

  const thin = classifyEpisode({ title: 'Ep 412', notes: 'with a guest' }, 'business');
  ok('thin notes are filed general, never forced into a topic',
    thin.category === 'general', thin.category);
  ok('and say WHY they are there',
    thin.categorySource === 'unclassified-thin', thin.categorySource);

  const vague = classifyEpisode(
    { title: 'A conversation', notes: long('we talked about a number of things at some length') },
    'popculture');
  ok('enough text but no signal keeps the SHOW\'s category, not general',
    vague.category === 'popculture', vague.category);
  ok('and records that the show decided it', vague.categorySource === 'show', vague.categorySource);

  ok('a missing category hint still produces a real category',
    typeof classifyEpisode({ title: 'x', notes: 'y' }, undefined).category === 'string');
}

// ── 4. tier survives the journey ───────────────────────────────────────────
{
  for (const cat of ['tech', 'business', 'general', 'sports']) {
    const e = episode(`https://ex.com/${cat}`, cat);
    ok(`an episode filed under ${cat} keeps tier 'podcast'`, e.tier === 'podcast', e.tier);
  }
  const e = episode('https://ex.com/p', 'tech');
  ok('and keeps its podcast payload', e.podcast && e.podcast.show === 'Test Show');
}

// ── 5. Velocity maths counts each episode once ─────────────────────────────
{
  const eps = [
    episode('https://ex.com/a', 'tech', 1),
    episode('https://ex.com/b', 'tech', 2),
    episode('https://ex.com/c', 'business', 3),
  ];
  // The same three episodes seen twice, as a duplicate bug would produce.
  const doubled = [...eps, ...eps];
  const feed = sortSignals(dedupeById(doubled));

  ok('a doubled feed dedupes back to its real size', feed.length === 3, String(feed.length));

  const summary = velocitySummary(feed, 48);
  ok('velocity totals count each episode once', summary.total === 3, String(summary.total));

  const groups = groupByCategory(feed, { windowHours: 48 });
  const tech = groups.find(g => g.id === 'tech');
  const business = groups.find(g => g.id === 'business');
  ok('the tech bar counts 2, not 4', tech?.total === 2, String(tech?.total));
  ok('the business bar counts 1, not 2', business?.total === 1, String(business?.total));
  ok('group totals sum to the feed', groups.reduce((n, g) => n + g.total, 0) === 3);

  ok('ranking returns each episode once',
    new Set(rankByVelocity(feed, { windowHours: 48 }).map(i => i.id)).size === 3);

  // The counterfactual: without the dedupe these would all be doubled. If this
  // fails, the assertions above are passing for the wrong reason.
  ok('WITHOUT dedupe the same input really does double — the guard is load-bearing',
    velocitySummary(sortSignals(doubled), 48).total === 6,
    String(velocitySummary(sortSignals(doubled), 48).total));
}

// ── Report ─────────────────────────────────────────────────────────────────
process.stdout.write(`\nDual-surface check — ${checks.length} assertions\n\n`);
for (const c of checks) {
  process.stdout.write(`  ${c.pass ? 'ok  ' : 'FAIL'}  ${c.name}${c.pass || !c.detail ? '' : `  [${c.detail}]`}\n`);
}
if (problems.length) {
  process.stdout.write(`\nFAILED — ${problems.length} of ${checks.length}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('\nPASSED — one signal, two views, counted once.\n');
}
