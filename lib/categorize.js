// lib/categorize.js — local categorization + duplicate detection.
//
// Assigns a category to a source and flags near-duplicates, using nothing but
// this file. NO external calls: AetherHub stays fully decoupled, so the keyword
// tables below are replicated locally rather than fetched from any hub.
//
// It is deliberately dumb and inspectable. A keyword table you can read and
// correct beats a model you have to trust — and every assignment carries a
// confidence so a weak guess is visible rather than silently authoritative.
//
// Used by:
//   scripts/build-source-map.mjs  → config/source-map.md (your review artifact)
//   the radar's Add-to-Follow     → best-guess category for a new source

import { CATEGORY_IDS, DEFAULT_CATEGORY } from '../config/sources.js';

// ── Category signals ────────────────────────────────────────────────────────
// Weighted terms per category. Matched against a source's name, handle, label,
// bio/notes and recent item titles — whatever the caller can supply.
//
// ASSUMPTION: these weights are hand-tuned starting points, not tuned against a
// labelled set. Two-point terms are near-decisive; one-point terms are hints.
export const CATEGORY_SIGNALS = {
  energy: {
    2: ['ercot', 'lng', 'oilfield', 'upstream', 'midstream', 'opec', 'refinery',
        'geothermal', 'grid', 'megawatt', 'gigawatt', 'nuclear', 'solar', 'wind power',
        'oil and gas', 'petroleum', 'shale', 'energy transition', 'decarbon'],
    1: ['energy', 'power', 'utility', 'emissions', 'carbon', 'climate', 'battery',
        'data center', 'datacenter', 'cooling', 'hvac'],
  },
  business: {
    2: ['venture capital', 'private equity', 'earnings', 'macro', 'hedge fund',
        'covered call', 'dividend', 'multifamily', 'real estate', 'negotiation',
        'valuation', 'ipo', 'm&a', 'portfolio'],
    1: ['market', 'markets', 'invest', 'startup', 'founder', 'ceo', 'strategy',
        'business', 'economics', 'trading', 'finance', 'leadership', 'sales',
        'geopolit', 'supply chain'],
  },
  tech: {
    2: ['artificial intelligence', 'machine learning', 'llm', 'semiconductor',
        'software engineering', 'cybersecurity', 'developer'],
    1: ['ai', 'tech', 'technology', 'robot', 'compute', 'chip', 'saas', 'cloud',
        'automation', 'agent'],
  },
  health: {
    2: ['longevity', 'epigenetic', 'healthspan', 'nad+', 'sleep science',
        'neuroscience', 'nutrition', 'metabolic'],
    1: ['health', 'fitness', 'training', 'performance', 'mindset', 'discipline',
        'psychology', 'wellness', 'medicine', 'biohack', 'stoic'],
  },
  sports: {
    2: ['nba', 'nfl', 'mlb', 'premier league', 'championship', 'athlete'],
    1: ['sport', 'sports', 'football', 'basketball', 'coach', 'team'],
  },
  popculture: {
    2: ['celebrity', 'box office', 'streaming series', 'red carpet'],
    1: ['culture', 'music', 'film', 'movie', 'entertainment', 'viral', 'creator'],
  },
  ancient: {
    2: ['ancient', 'archaeolog', 'lost civilization', 'lost civilisation',
        'megalith', 'pyramid', 'prehistor', 'anomal', 'uap', 'ufo', 'declassified',
        'unexplained', 'paranormal', 'cryptid', 'antediluvian', 'göbekli',
        'gobekli', 'atlantis', 'mystery', 'mysteries'],
    1: ['history', 'origins', 'artifact', 'ruins', 'myth', 'cosmology',
        'astronomy', 'strange', 'conspiracy', 'esoteric'],
  },
  general: { 2: [], 1: ['news', 'current affairs', 'commentary'] },
};

/**
 * Score every category against free text and return the best fit.
 *
 * @param {string} text  name + handle + bio + recent titles, concatenated
 * @param {string} [hint] a caller-supplied category to break ties toward
 * @returns {{category, confidence, scores, matched}}
 */
export function categorize(text, hint = null) {
  const hay = String(text || '').toLowerCase();
  const scores = {};
  const matched = {};

  for (const [cat, bands] of Object.entries(CATEGORY_SIGNALS)) {
    let score = 0;
    const hits = [];
    for (const [weight, terms] of Object.entries(bands)) {
      for (const term of terms) {
        if (hay.includes(term)) { score += Number(weight); hits.push(term); }
      }
    }
    scores[cat] = score;
    if (hits.length) matched[cat] = hits;
  }

  if (hint && CATEGORY_IDS.includes(hint)) scores[hint] = (scores[hint] || 0) + 1.5;

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topCat, topScore] = ranked[0] || [DEFAULT_CATEGORY, 0];
  const runnerUp = ranked[1]?.[1] ?? 0;

  // Confidence is about SEPARATION, not raw score: a source matching one
  // category strongly and nothing else is a confident call; one matching two
  // categories equally is a coin flip and should say so.
  let confidence;
  if (topScore === 0)                      confidence = 'low';
  else if (topScore >= 4 && topScore - runnerUp >= 2) confidence = 'high';
  else if (topScore >= 2 && topScore > runnerUp)      confidence = 'medium';
  else                                     confidence = 'low';

  return {
    category: topScore === 0 ? DEFAULT_CATEGORY : topCat,
    confidence,
    scores,
    matched: matched[topCat] || [],
  };
}

// ── Duplicate detection ─────────────────────────────────────────────────────

/** Normalise a handle for comparison: strip @, punctuation, case. */
export function normalizeHandle(h) {
  return String(h || '').toLowerCase().replace(/^@/, '').replace(/[^a-z0-9]/g, '');
}

/** Normalise a person's name: lowercase, drop punctuation and initials-dots. */
export function normalizeName(n) {
  return String(n || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Find sources that are the same person or the same feed twice.
 *
 * Three kinds of collision, in decreasing certainty:
 *   exact-route   the same route string — literally the same feed
 *   same-handle   the same handle on the same platform
 *   same-person   the same display name across different platforms, which is
 *                 usually intentional but worth surfacing before it doubles
 *                 someone's volume in the feed
 */
export function findDuplicates(sources) {
  const byRoute = new Map();
  const byHandle = new Map();
  const byPerson = new Map();
  const dupes = [];

  for (const s of sources) {
    const route = String(s.route || s.handle || '').toLowerCase();
    const handleKey = `${s.platform}:${normalizeHandle(s.handle || s.label)}`;
    const personKey = normalizeName(s.person || s.label);

    if (route && byRoute.has(route)) {
      dupes.push({ kind: 'exact-route', a: byRoute.get(route), b: s, detail: route });
    } else if (route) byRoute.set(route, s);

    if (byHandle.has(handleKey)) {
      dupes.push({ kind: 'same-handle', a: byHandle.get(handleKey), b: s, detail: handleKey });
    } else byHandle.set(handleKey, s);

    if (personKey && personKey.includes(' ')) {
      if (byPerson.has(personKey)) {
        dupes.push({ kind: 'same-person', a: byPerson.get(personKey), b: s, detail: personKey });
      } else byPerson.set(personKey, s);
    }
  }
  return dupes;
}

/** True when `candidate` is already represented in `sources`. */
export function alreadyFollowed(sources, candidate) {
  const route = String(candidate.route || '').toLowerCase();
  const handleKey = `${candidate.platform}:${normalizeHandle(candidate.handle || candidate.label)}`;
  return sources.some(s =>
    String(s.route || '').toLowerCase() === route ||
    `${s.platform}:${normalizeHandle(s.handle || s.label)}` === handleKey);
}
