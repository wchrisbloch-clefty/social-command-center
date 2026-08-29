// config/sources.js — THE one file you edit to change what AetherHub pulls.
//
// Nothing here is hardcoded anywhere else. Add a line, remove a line, change a
// category — the feed, the category nav, and the right rail all follow.
//
// ═══════════════════════════════════════════════════════════════════════════
//  HOW A SOURCE IS SHAPED
// ═══════════════════════════════════════════════════════════════════════════
//
//   { platform, route, label, category, limit }
//
//   platform  One of the keys in PLATFORM_TIER below. Decides the badge, the
//             accent colour, and the tier (mainstream vs street). Never set the
//             tier by hand — it is derived, so it can never disagree with itself.
//   route     Where the feed comes from. Two forms:
//               '/twitter/user/sama'   → relative: joined onto RSSHUB_BASE_URL
//               'https://…/.rss'       → absolute: fetched directly, no RSSHub
//             See the per-platform patterns below.
//   label     What the card shows as the source ('@sama', 'r/energy').
//   category  One of the CATEGORIES ids below. Drives the category nav filter.
//   limit     Max items this source may contribute per refresh. Default 5.
//             This matters: Reddit and other high-volume feeds will otherwise
//             flood a category and bury the platforms that return 2–3 items.
//
// ═══════════════════════════════════════════════════════════════════════════
//  RSSHUB ROUTE PATTERNS — verified against DIYgod/RSSHub @ lib/routes/*
// ═══════════════════════════════════════════════════════════════════════════
//
//  These were read out of the RSSHub source, not guessed. The `requireConfig`
//  column is what decides whether the FREE PUBLIC instance can serve it.
//
//  ┌── INSTAGRAM ──────────────────────────────────────────────────────────┐
//  │ /instagram/2/user/:username     user profile  (web API, no login)     │
//  │ /instagram/2/tags/:hashtag      hashtag feed  (web API, no login)     │
//  │ /instagram/user/:username       private API — needs IG_USERNAME +     │
//  │                                 IG_PASSWORD, SELF-HOSTED ONLY         │
//  │ Use the /2/ form on the public instance. Note it is flagged           │
//  │ antiCrawler:true upstream, so it is the most likely to rate-limit.    │
//  └───────────────────────────────────────────────────────────────────────┘
//
//  ┌── LINKEDIN ───────────────────────────────────────────────────────────┐
//  │ /linkedin/company/:company_id/posts    requireConfig: FALSE           │
//  │ The `/posts` suffix is REQUIRED — /linkedin/company/google is a 404.  │
//  │ :company_id is the slug from the profile URL:                         │
//  │   linkedin.com/company/google → 'google'                              │
//  │ There is NO person/profile route. LinkedIn only exposes companies to  │
//  │ RSSHub; to follow a person, follow the company they post under.       │
//  └───────────────────────────────────────────────────────────────────────┘
//
//  ┌── X / TWITTER ────────────────────────────────────────────────────────┐
//  │ /twitter/user/:id               user timeline                         │
//  │ /twitter/keyword/:keyword       search                                │
//  │ /twitter/list/:id               list timeline                         │
//  │ ⚠ requireConfig: TWITTER_AUTH_TOKEN (or consumer key/secret, or a     │
//  │   TWITTER_THIRD_PARTY_API). The public instance frequently CANNOT     │
//  │   serve these. Expect X to be the one that falls back. It will fail   │
//  │   gracefully and the rest of the feed still renders — that is the     │
//  │   whole point of the fallback path. Self-host + a token fixes it.     │
//  └───────────────────────────────────────────────────────────────────────┘
//
//  ┌── REDDIT ─────────────────────────────────────────────────────────────┐
//  │ RSSHub has NO reddit namespace — Reddit serves native RSS itself.     │
//  │ ASSUMPTION: going direct is strictly better than proxying, so Reddit  │
//  │ sources use an absolute URL and skip RSSHub entirely. Patterns:       │
//  │   https://www.reddit.com/r/:sub/hot/.rss                              │
//  │   https://www.reddit.com/r/:sub/new/.rss                              │
//  │   https://www.reddit.com/r/:sub/top/.rss?t=day                        │
//  │   https://www.reddit.com/user/:name/.rss                              │
//  └───────────────────────────────────────────────────────────────────────┘
//
//  Swapping to a self-hosted RSSHub later: set RSSHUB_BASE_URL and change
//  nothing here. Every relative route re-points automatically. See README.

// ─── Categories — mirrors MyNewsHub's nav, in nav order ──────────────────────
export const CATEGORIES = [
  { id: 'general',    label: 'General'            },
  { id: 'business',   label: 'Business & Markets' },
  { id: 'energy',     label: 'Energy'             },
  { id: 'tech',       label: 'AI & Tech'          },
  { id: 'sports',     label: 'Sports'             },
  { id: 'health',     label: 'Health'             },
  { id: 'popculture', label: 'Pop Culture'        },
  // ASSUMPTION: 'Ancient Mysteries' covers lost civilisations, archaeology,
  // anomalous history, UAP/fringe science and unexplained-story creators — the
  // cluster that has no home in the other seven.
  { id: 'ancient',    label: 'Ancient Mysteries'   },
];

export const CATEGORY_IDS = CATEGORIES.map(c => c.id);
export const DEFAULT_CATEGORY = 'general';

// ─── Tier — derived from platform, never set per source ──────────────────────
// Per spec: Instagram/LinkedIn are mainstream, X/Reddit are street. YouTube is
// mainstream because it is the official-API source the others are measured against.
export const PLATFORM_TIER = {
  YouTube:   'mainstream',
  Instagram: 'mainstream',
  LinkedIn:  'mainstream',
  X:         'street',
  Reddit:    'street',
};

// ASSUMPTION: an unknown platform is treated as street rather than dropped, so a
// source added here can never render un-tiered even if PLATFORM_TIER is missed.
export const FALLBACK_TIER = 'street';

// Default per-source item cap. Override per line with `limit`.
export const DEFAULT_LIMIT = 5;

// ═══════════════════════════════════════════════════════════════════════════
//  ── ADD / REMOVE / EDIT YOUR SOURCES HERE. One line each. ──
// ═══════════════════════════════════════════════════════════════════════════
//
// ASSUMPTION: every entry below is a PLACEHOLDER chosen to be a real, public,
// high-volume account so the feed shows something on first run. Replace the
// whole list with your own — the shape is all that matters.
export const SOCIAL_SOURCES = [
  // ═══ ENERGY ═══════════════════════════════════════════════════════════════
  // X handles below are VERIFIED but will NOT pull on the free public RSSHub
  // instance — /twitter/* needs TWITTER_AUTH_TOKEN configured on the instance
  // itself. They are wired and correct, and start working the moment you point
  // RSSHUB_BASE_URL at a self-hosted instance with a token. Until then they
  // show as degraded in the source rail with their real HTTP status.
  { platform: 'X', person: 'Daniel Yergin', route: '/twitter/user/DanielYergin', label: '@DanielYergin', category: 'energy', limit: 5 },
  { platform: 'X', person: 'Doug Sheridan', route: '/twitter/user/DougSheridan', label: '@DougSheridan', category: 'energy', limit: 5 },
  { platform: 'X', person: 'Alex Epstein',  route: '/twitter/user/AlexEpstein',  label: '@AlexEpstein',  category: 'energy', limit: 5 },
  { platform: 'X', person: 'Jeff Krimmel',  route: '/twitter/user/JeffKrimmel',  label: '@JeffKrimmel',  category: 'energy', limit: 5 },
  // Rich Miller = Data Center Frontier founder (per your call), not the Bloomberg reporter.
  { platform: 'X', person: 'Rich Miller',   route: '/twitter/user/Tech_Journalism', label: '@Tech_Journalism', category: 'energy', limit: 5 },

  // ═══ BUSINESS & MARKETS ═══════════════════════════════════════════════════
  { platform: 'X', person: 'Jeff Immelt',   route: '/twitter/user/JeffImmelt',   label: '@JeffImmelt',   category: 'business', limit: 5 },
  { platform: 'X', person: 'John Chambers', route: '/twitter/user/JohnTChambers', label: '@JohnTChambers', category: 'business', limit: 5 },
  { platform: 'X', person: 'Eddie Donmez',  route: '/twitter/user/eddiedonmez',  label: '@eddiedonmez',  category: 'business', limit: 5 },

  // ═══ HEALTH ═══════════════════════════════════════════════════════════════
  // ASSUMPTION: @ATTACKATHLETICS is Grover's verified handle on X/Instagram. He
  // has a YouTube presence but no handle I could confirm, and a confirmed
  // handle on a degrading platform beats a guessed one on a working platform —
  // it becomes correct the day you self-host, rather than being a dead feed now
  // AND later.
  { platform: 'X', person: 'Tim Grover',    route: '/twitter/user/ATTACKATHLETICS', label: '@ATTACKATHLETICS', category: 'health', limit: 5 },

  // ═══ ANCIENT MYSTERIES ════════════════════════════════════════════════════
  // No first-party video channel — she appears as a guest. X is her only feed.
  { platform: 'X', person: 'Annie Jacobsen', route: '/twitter/user/AnnieJacobsen', label: '@AnnieJacobsen', category: 'ancient', limit: 5 },

  // ═══ TOPIC / KEYWORD RADAR ════════════════════════════════════════════════
  // Seeded in Part B — see TOPIC_SOURCES below.
];

// ═══════════════════════════════════════════════════════════════════════════
//  TOPIC SOURCES — keyword/hashtag radar. Seeded in Part B.
// ═══════════════════════════════════════════════════════════════════════════
export const TOPIC_SOURCES = [];

// ═══════════════════════════════════════════════════════════════════════════
//  YOUTUBE — official Data API v3, NOT RSSHub. Left on its own path on purpose.
// ═══════════════════════════════════════════════════════════════════════════
// Handles are the @name from the channel URL, without the '@'.
// Needs YOUTUBE_API_KEY. Without it the route reports needsKey and returns [].
export const YOUTUBE_SOURCES = [
  // Every handle below was verified by search except where marked ASSUMPTION.
  // YouTube is the backbone: it is live, free, and returns real view counts, so
  // these are the only sources whose velocity is scored on actual engagement
  // rather than recency.

  // ═══ BUSINESS & MARKETS ═══════════════════════════════════════════════════
  { platform: 'YouTube', person: 'Peter Zeihan',      handle: 'ZeihanonGeopolitics', label: 'Zeihan on Geopolitics', category: 'business', limit: 4 },
  { platform: 'YouTube', person: 'Harry Stebbings',   handle: '20VC',                label: '20VC',                  category: 'business', limit: 4 },
  { platform: 'YouTube', person: 'Daniel Pink',       handle: 'danielpinktv',        label: 'Daniel Pink',           category: 'business', limit: 3 },
  { platform: 'YouTube', person: 'Christopher Voss',  handle: 'NegotiationMastery',  label: 'Chris Voss',            category: 'business', limit: 3 },
  { platform: 'YouTube', person: 'Chase Hughes',      handle: 'chasehughesofficial', label: 'Chase Hughes',          category: 'business', limit: 3 },

  // ═══ ENERGY ═══════════════════════════════════════════════════════════════
  // ASSUMPTION: "EggGeothermal" is a legacy YouTube username (youtube.com/user/
  // EggGeothermal), not a confirmed @handle. YouTube usually mints a matching
  // handle from a legacy username, but if this 404s the fallback is X @GeoJayegg.
  { platform: 'YouTube', person: 'Jay Egg',           handle: 'EggGeothermal',       label: 'Egg Geo',               category: 'energy',   limit: 3 },

  // ═══ HEALTH ═══════════════════════════════════════════════════════════════
  { platform: 'YouTube', person: 'Chris Williamson',  handle: 'ChrisWillx',          label: 'Modern Wisdom',         category: 'health',   limit: 4 },
  { platform: 'YouTube', person: 'David Sinclair',    handle: 'LifespanOfficial',    label: 'Lifespan',              category: 'health',   limit: 3 },
  { platform: 'YouTube', person: 'Jocko Willink',     handle: 'JockoPodcast',        label: 'Jocko Podcast',         category: 'health',   limit: 3 },

  // ═══ ANCIENT MYSTERIES ════════════════════════════════════════════════════
  { platform: 'YouTube', person: 'MrBallen',          handle: 'MrBallen',            label: 'MrBallen',              category: 'ancient',  limit: 4 },
  { platform: 'YouTube', person: 'Jesse Michels',     handle: 'JesseMichels',        label: 'American Alchemy',      category: 'ancient',  limit: 4 },
  { platform: 'YouTube', person: 'Timothy Alberino',  handle: 'TimothyAlberino',     label: 'Timothy Alberino',      category: 'ancient',  limit: 3 },
  // ASSUMPTION: Button's channel ("Ancient History BA", ~200K subs) resolves to
  // channel id UCRDZ_t_-uHLsz_Otq6iOgyg; I could not confirm an @handle for it.
  // channelId is supported alongside handle precisely for this case.
  { platform: 'YouTube', person: 'Michael Button',    channelId: 'UCRDZ_t_-uHLsz_Otq6iOgyg', label: 'Michael Button', category: 'ancient', limit: 3 },
];

// ═══════════════════════════════════════════════════════════════════════════
//  TRACKED_QUERIES — keyword searches run per category (YouTube search action).
// ═══════════════════════════════════════════════════════════════════════════
// ASSUMPTION: these are the "what's moving in this category" probes. Empty array
// for a category means "sources only, no keyword sweep".
export const TRACKED_QUERIES = {
  general:    [],
  business:   ['markets today'],
  energy:     ['energy transition'],
  tech:       ['AI agents'],
  sports:     [],
  health:     ['longevity research'],
  popculture: [],
  ancient:    [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** All sources (social + YouTube) for a category, or all of them when null. */
export function sourcesForCategory(category = null) {
  const all = [...SOCIAL_SOURCES, ...YOUTUBE_SOURCES];
  if (!category) return all;
  return all.filter(s => s.category === category);
}

/** A source's effective item cap. */
export function limitOf(source) {
  const n = Number(source?.limit);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_LIMIT;
}

/** Display label for a category id. Falls back to the id so nothing renders blank. */
export function categoryLabel(id) {
  return CATEGORIES.find(c => c.id === id)?.label || id || 'General';
}
