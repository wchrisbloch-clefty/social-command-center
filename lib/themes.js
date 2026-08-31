// lib/themes.js — what are my sources actually posting about?
//
// Points the existing pipeline INWARD. Discover asks "which of my signals are
// spiking"; this asks "which THEMES recur across them, and is one of them big
// enough to deserve a category of its own".
//
// ── DELIBERATELY NOT NLP ────────────────────────────────────────────────────
// Keyword and bigram frequency over already-normalized signals, weighted by how
// many DISTINCT sources use each term. No model, no embedding, no external
// call — AetherHub stays decoupled, and a frequency table is something you can
// read and argue with. A theme that only one source talks about is that
// source's hobby horse, not a category.
//
// Everything here is ADVISORY. Nothing creates or moves anything; the manager
// does that, and only on your tap.

import { withinWindow, DEFAULT_WINDOW_HOURS } from './velocity.js';
import { CATEGORIES } from '../config/categories.js';

// Words that carry no topical signal. Frequency alone would rank these top.
const STOP = new Set(`
a about above after again against all also am an and any are aren as at be because been
before being below between both but by can cant cannot could couldnt did didnt do does
doesnt doing dont down during each few for from further had hadnt has hasnt have havent
having he her here hers herself him himself his how i if in into is isnt it its itself
just me more most must my myself no nor not now of off on once only or other ought our
ours ourselves out over own same she should shouldnt so some such than that the their
theirs them themselves then there these they this those through to too under until up
very was wasnt we were werent what when where which while who whom why will with wont
would wouldnt you your yours yourself yourselves
new news latest first best top get got make makes made take takes way ways thing things
time times day days week weeks year years today one two three like just really much many
big small good great need needs know knows say says said talk talks going go goes come
comes back look looks video watch episode podcast full part show shows live update
updates via ft feat featuring guest interview discussion thread
sponsor sponsored promo code discount offer listeners listener subscribe
patreon merch tickets tour dates apple spotify youtube channel link links
episode episodes season part welcome back today talking joined joins host
hosts hosted conversation chat sits down breaks down dives deep
`.trim().split(/\s+/));

const MIN_TERM = 4;
const MAX_TERM = 22;

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= MIN_TERM && w.length <= MAX_TERM && !STOP.has(w) && !/^\d+$/.test(w));
}

/** Unigrams plus adjacent bigrams — "grid storage" is a theme, "grid" alone is noise. */
function terms(text) {
  const words = tokenize(text);
  const out = new Set(words);
  for (let i = 0; i < words.length - 1; i++) out.add(`${words[i]} ${words[i + 1]}`);
  return [...out];
}

/**
 * Rank recurring themes across a normalized feed.
 *
 * @returns {object[]} { term, posts, sources, categories, examples, score }
 */
export function extractThemes(items, { windowHours = DEFAULT_WINDOW_HOURS, minSources = 2, minPosts = 3 } = {}) {
  const pool = withinWindow(items, windowHours);
  const table = new Map();

  for (const item of pool) {
    const from = item.sourceLabel || item.author || 'unknown';
    for (const term of terms(`${item.title || ''} ${item.content || ''}`)) {
      if (!table.has(term)) {
        table.set(term, { term, posts: 0, sources: new Set(), categories: new Map(), examples: [] });
      }
      const t = table.get(term);
      t.posts++;
      t.sources.add(from);
      t.categories.set(item.category, (t.categories.get(item.category) || 0) + 1);
      if (t.examples.length < 4) t.examples.push({ title: item.title, source: from, category: item.category });
    }
  }

  // ── Boilerplate suppression ───────────────────────────────────────────────
  // A term present in more than half of ALL items is not a theme, it is
  // furniture: RSS footers, "subscribe", a channel's stock description. It
  // scores top on both volume and breadth precisely BECAUSE it is meaningless.
  // Real themes are concentrated; boilerplate is everywhere.
  // ASSUMPTION: 0.5 of items is the cut. Anything a genuine theme reaches in
  // more than half your feed has effectively become your whole feed anyway.
  const boilerplateAt = Math.max(3, pool.length * 0.5);

  return [...table.values()]
    .filter(t => t.sources.size >= minSources && t.posts >= minPosts)
    .filter(t => t.posts < boilerplateAt)
    .map(t => ({
      term: t.term,
      posts: t.posts,
      sources: [...t.sources],
      sourceCount: t.sources.size,
      categories: [...t.categories.entries()].sort((a, b) => b[1] - a[1]),
      examples: t.examples,
      // Breadth over volume: a term used by four sources beats one used forty
      // times by a single source. Squaring the source count says so.
      score: t.sources.size * t.sources.size * Math.log2(t.posts + 1),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Prefer the specific term over the vague one.
 *
 * A unigram always has at least as many hits as any bigram containing it, so
 * ranking on frequency alone surfaces "Data" and "Center" as two separate
 * suggestions and never "Data Center" — which is the only one of the three that
 * is actually a category. So: if a bigram containing this word has comparable
 * support, the single word is suppressed in its favour.
 *
 * ASSUMPTION: "comparable" is 60% of the unigram's posts. Below that the two
 * really are different themes and both deserve to be seen.
 */
function supersededByPhrase(single, all) {
  if (single.term.includes(' ')) return false;
  return all.some(t =>
    t.term.includes(' ') &&
    t.term.split(' ').includes(single.term) &&
    t.posts >= single.posts * 0.6);
}

/** Two phrases sharing a word are the same theme said twice; keep the first. */
function overlapsKept(term, kept) {
  const words = new Set(term.split(' '));
  return kept.some(k => k.term.split(' ').some(w => words.has(w)));
}

/**
 * Turn themes into category suggestions.
 *
 * A theme is only worth a category if it is NOT already well covered by one:
 * if 80% of a theme's posts already sit in a single category, that category is
 * doing its job and a new one would just split it.
 */
export function suggestCategories(items, {
  windowHours = 168,          // a week — a category is a slower question than a spike
  minSources = 2,
  minPosts = 3,
  limit = 6,
  existing = CATEGORIES,
  dismissed = [],
} = {}) {
  const dismissedSet = new Set(dismissed.map(d => String(d).toLowerCase()));
  const existingLabels = new Set(existing.map(c => c.label.toLowerCase()));
  const themes = extractThemes(items, { windowHours, minSources, minPosts });

  // Phrases first, then any single word a phrase did not already cover. Without
  // this the list is all vague unigrams and the useful phrases never surface.
  const ordered = [
    ...themes.filter(t => t.term.includes(' ')),
    ...themes.filter(t => !t.term.includes(' ') && !supersededByPhrase(t, themes)),
  ].sort((a, b) => b.score - a.score);

  const kept = [];
  for (const t of ordered) {
    if (kept.length >= limit) break;
    if (dismissedSet.has(t.term)) continue;
    if (existingLabels.has(t.term)) continue;
    if (overlapsKept(t.term, kept)) continue;

    const [topCat, topCount] = t.categories[0] || [null, 0];
    const concentration = topCount / t.posts;
    // Already well served by one category — suggesting it would fragment, not clarify.
    if (concentration >= 0.8 && t.categories.length === 1) continue;

    const label = t.term.replace(/\b\w/g, ch => ch.toUpperCase());
    kept.push({
      term: t.term,
      label,
      posts: t.posts,
      sourceCount: t.sourceCount,
      sources: t.sources,
      spanningCategories: t.categories.map(([id, n]) => ({ id, count: n })),
      // Stated as evidence, not a score. You should be able to disagree with it.
      reason: `${t.posts} posts across ${t.sourceCount} of your sources` +
              (t.categories.length > 1 ? `, spanning ${t.categories.length} categories` : ''),
      // Which sources would plausibly move — advisory, never applied.
      candidateSources: t.sources.slice(0, 6),
      examples: t.examples.slice(0, 3),
      concentration: Number(concentration.toFixed(2)),
    });
  }
  return kept;
}


// ═══════════════════════════════════════════════════════════════════════════
//  CROSS-SHOW TOPICS
// ═══════════════════════════════════════════════════════════════════════════
// "What are my shows talking about?" is the same question Discover asks of the
// feed and the category manager asks of everything — which theme recurs across
// DISTINCT sources — so it runs on the same engine rather than a second one.
// extractThemes already weights breadth over volume, which is exactly right
// here: a subject three different shows raise independently is a real topic;
// one show's recurring segment is that show's format.
//
// The podcast-specific parts are two:
//
//   1. minSources is raised to 2 SHOWS, not two episodes. Ten episodes of one
//      podcast about one thing is a series, not a cross-show topic, and the
//      generic miner would happily rank it top.
//
//   2. Thin-notes shows are reported, not silently dropped. A show that
//      publishes one sentence per episode contributes almost no text and so can
//      barely appear in any topic — that is a property of the feed, and hiding
//      it would make the topic strip look more complete than it is.

/**
 * Themes appearing across MULTIPLE shows.
 *
 * @param {object[]} episodes  normalized signals with platform 'Podcast'
 * @returns {{ topics: object[], mined: object, limits: string[] }}
 */
export function crossShowTopics(episodes, { windowHours = 336, limit = 8, minShows = 2 } = {}) {
  const pods = (episodes || []).filter(e => e?.platform === 'Podcast');
  const showOf = e => e.podcast?.show || e.sourceLabel || 'unknown';
  const shows = [...new Set(pods.map(showOf))];

  // Which shows can actually contribute? A show with almost no notes is present
  // in the feed and absent from the text, and the difference has to be stated.
  const textByShow = new Map();
  for (const e of pods) {
    const s = showOf(e);
    textByShow.set(s, (textByShow.get(s) || 0) + (e.podcast?.notesChars || (e.content || '').length));
  }
  // ASSUMPTION: under 200 chars of notes per episode averaged is "thin" — the
  // same threshold lib/podcast-summary.js uses to decline to summarise.
  const thin = shows.filter(s => {
    const eps = pods.filter(e => showOf(e) === s).length || 1;
    return (textByShow.get(s) || 0) / eps < 200;
  });

  // The generic miner counts DISTINCT sources via item.sourceLabel, which for a
  // podcast episode is already the show. So "2 sources" means "2 shows" without
  // any special-casing — the property that makes reuse honest here rather than
  // merely convenient.
  const raw = extractThemes(pods, { windowHours, minSources: minShows, minPosts: 2 });

  // Phrases first, then any single word a phrase has not already covered, then
  // no two topics sharing a word. This is the SAME de-fragmentation
  // suggestCategories uses, and for the same reason: ranking on frequency alone
  // surfaces "Datacenter" and "Buildout" as two topics and never "Datacenter
  // Buildout", which is the only one of the three a reader would call a topic.
  const ordered = [
    ...raw.filter(t => t.term.includes(' ')),
    ...raw.filter(t => !t.term.includes(' ') && !supersededByPhrase(t, raw)),
  ].sort((a, b) => b.score - a.score);

  const deduped = [];
  for (const t of ordered) {
    if (deduped.length >= limit) break;
    if (overlapsKept(t.term, deduped)) continue;
    deduped.push(t);
  }

  const topics = deduped.map(t => ({
    term: t.term,
    label: t.term.replace(/\b\w/g, c => c.toUpperCase()),
    episodes: t.posts,
    shows: t.sources,
    showCount: t.sourceCount,
    examples: t.examples.slice(0, 3),
    // Evidence, not a score. The reader should be able to disagree with it.
    reason: `${t.posts} episodes across ${t.sourceCount} shows`,
  }));

  const limits = [];
  if (shows.length < 2) {
    limits.push('Cross-show topics need at least two shows publishing — there is only one here.');
  }
  if (thin.length) {
    limits.push(`${thin.join(', ')} publish very short show notes, so they contribute little text and rarely appear in a topic. That is the feed, not a gap in the analysis.`);
  }
  if (!topics.length && shows.length >= 2) {
    limits.push('No subject appeared across two or more shows in this window. Your shows are not overlapping right now.');
  }
  limits.push('Topics are mined from show notes only — nothing here reflects what was said in the audio.');

  return {
    topics,
    mined: { episodes: pods.length, shows: shows.length, windowHours, thinShows: thin },
    limits,
  };
}
