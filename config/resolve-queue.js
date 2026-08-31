// config/resolve-queue.js — sources STAGED FOR VERIFICATION. Not wired. Not live.
//
// ═══════════════════════════════════════════════════════════════════════════
//  THIS IS NOT A PARALLEL SOURCE LIST
// ═══════════════════════════════════════════════════════════════════════════
// config/sources.js remains the only thing the app reads. Nothing in this file
// is fetched, rendered, counted, or categorised. It is a to-do list for one
// command:
//
//     npm run sources:resolve -- --write
//
// which resolves each entry through lib/source-resolver.js, VERIFIES the route
// actually returns content, and appends only the verified ones into
// config/sources.js. Entries that fail verification are reported and stay here.
// An entry leaves this file exactly when it enters that one.
//
// ── WHY A QUEUE EXISTS AT ALL ───────────────────────────────────────────────
// Two categories are thin: AI & Tech has 2 sources and Pop Culture has 0. The
// instruction is verify-then-wire — never inject an unverified source. But the
// build sandbox has no route to any verification endpoint:
//
//     googleapis.com  → 403      youtube.com  → 000
//     rsshub.app      → 000      reddit.com   → 000
//
// So identity resolution (which handle belongs to which person) was done here
// by search and is recorded below with its evidence. Content verification (does
// that handle actually return videos) cannot run here and is deferred to the
// command above, which you run once with YOUTUBE_API_KEY set.
//
// The alternative was wiring four plausible handles and hoping. Three of the
// first fifteen handles guessed that way were wrong, so: no.

/**
 * @typedef {object} QueuedSource
 * @property {string}  person      the human or entity
 * @property {string}  category    a CATEGORIES id from config/categories.js
 * @property {string}  label       what the card would show
 * @property {object[]} hints      candidates to try FIRST, highest confidence first
 * @property {string}  evidence    how the handle was identified, and by whom
 * @property {number}  [limit]     item cap, defaults per platform
 */

/** @type {QueuedSource[]} */
export const RESOLVE_QUEUE = [
  // ═══ AI & TECH ════════════════════════════════════════════════════════════
  // Currently 2 sources (John Chambers on X, one Reddit keyword sweep). X cannot
  // be verified on the free public RSSHub, so in practice this category renders
  // one working source. These five are the fix.

  {
    person: 'Marques Brownlee', category: 'tech', label: 'MKBHD', limit: 3,
    hints: [{ platform: 'youtube', handle: 'mkbhd' }],
    evidence: 'youtube.com/@mkbhd resolves to the Marques Brownlee channel. ' +
              'Consumer hardware, the highest-volume tech reviewer on the platform.',
  },
  {
    person: 'AI Explained', category: 'tech', label: 'AI Explained', limit: 3,
    hints: [{ platform: 'youtube', handle: 'aiexplained-official' }],
    evidence: 'youtube.com/@aiexplained-official — frontier-model analysis, author ' +
              'of SimpleBench. Note the "-official" suffix: several impostor ' +
              'channels use near-identical names, which is exactly why this is ' +
              'staged for verification rather than typed from memory.',
  },
  {
    person: 'Matthew Berman', category: 'tech', label: 'Matthew Berman', limit: 3,
    hints: [{ platform: 'youtube', handle: 'matthew_berman' }],
    evidence: 'youtube.com/@matthew_berman — model releases and agent tooling. ' +
              'A separate @MatthewBermanClips channel exists; this is the main one.',
  },
  {
    person: 'Two Minute Papers', category: 'tech', label: 'Two Minute Papers', limit: 3,
    hints: [
      { platform: 'youtube', handle: 'TwoMinutePapers' },
      // The legacy username, in case the handle did not carry over.
      { platform: 'youtube', handle: 'keeroyz' },
    ],
    evidence: 'youtube.com/@TwoMinutePapers (Károly Zsolnai-Fehér). Research-paper ' +
              'summaries — the slowest-moving and most durable of the five.',
  },
  {
    person: 'Dwarkesh Patel', category: 'tech', label: 'Dwarkesh Podcast', limit: 3,
    hints: [
      { platform: 'youtube', handle: 'DwarkeshPatel' },
      { platform: 'x', handle: 'dwarkesh_sp' },
    ],
    evidence: 'Long-form interviews with AI researchers and economists. The ' +
              'YouTube handle is the lower-confidence of the two hints — resolve ' +
              'it, do not assume it.',
  },

  // ═══ ENERGY — the one unresolved name from the approved roster ═════════════
  {
    person: 'Jay Egg', category: 'energy', label: 'Egg Geo', limit: 3,
    hints: [
      { platform: 'youtube', handle: 'EggGeothermal' },
      { platform: 'x',       handle: 'GeoJayegg' },
    ],
    evidence: 'UNRESOLVED. Search surfaces only the legacy form ' +
              'youtube.com/user/EggGeothermal with no modern @handle. Wired today ' +
              'as `handle: EggGeothermal` on the assumption YouTube minted a ' +
              'matching handle from the legacy username — an assumption this ' +
              'command exists to settle. If both hints fail, this needs a human ' +
              'decision: park it or replace it.',
  },
];

// ── POP CULTURE ─────────────────────────────────────────────────────────────
// Deliberately empty, and flagged for a DELETE DECISION rather than filled.
//
// The approved 35-name roster contains zero pop-culture figures. Every one of
// the 46 wired sources is business, energy, tech, sports, health or ancient
// history. Filling this category would mean inventing an interest the roster
// does not show — which is the same failure as inventing a handle, one level up.
//
// It is a live nav tab that renders an empty feed. Two honest options:
//
//   DELETE   POST /api/categories { action:'delete', id:'popculture',
//                                  reassignTo:'general' } — nothing to reassign,
//            since it holds no sources. The tab disappears, no data is lost.
//   FILL     name 3–5 people you actually follow and they go through the queue
//            above like any other source.
//
// Documented in config/parking-lot.md. Awaiting your call — shipping a dead tab
// is not one of the options.
export const FLAGGED_FOR_DECISION = [
  {
    categoryId: 'popculture',
    label: 'Pop Culture',
    sources: 0,
    reason: 'No source in the approved roster belongs here, and none can be ' +
            'added without inventing an interest.',
    options: ['delete', 'fill-from-your-names'],
  },
];
