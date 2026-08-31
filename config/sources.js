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

// ─── Categories ──────────────────────────────────────────────────────────────
// Categories are a first-class, editable collection now — see
// config/categories.js. Re-exported here so every existing importer keeps
// working; there is still exactly one definition.
export {
  CATEGORIES, CATEGORY_IDS, PALETTE, DEFAULT_CATEGORIES, FALLBACK_CATEGORY_ID,
  sortedCategories, categoryById, categoryLabel, makeCategoryId,
  normalizeOrder, categoryStyleSheet,
} from './categories.js';

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
  // Podcasts are their own tier, not a flavour of the other two. A long-form
  // interview show is neither a vetted publisher nor an anonymous street
  // account: it is a named host talking at length, and the reader judges it on
  // that basis. Folding it into 'mainstream' would have said something false
  // about it, so the tier vocabulary grew by one instead.
  Podcast:   'podcast',
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
  // Re-sorted business → tech: Chambers is a technology-industry figure
  // (Cisco chairman emeritus, JC2 Ventures backing tech companies), not a
  // generalist markets commentator.
  { platform: 'X', person: 'John Chambers', route: '/twitter/user/JohnTChambers', label: '@JohnTChambers', category: 'tech', limit: 5 },
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

  // Sports sources live in SPORTS_SOURCES below and are concatenated here at
  // the end of this file — same array, same pipeline, just grouped for reading.
];

// ═══════════════════════════════════════════════════════════════════════════
//  TOPIC SOURCES — keyword/hashtag radar. Seeded in Part B.
// ═══════════════════════════════════════════════════════════════════════════
// A topic source pulls from a SEARCH or HASHTAG rather than an account. Same
// shape as any other source plus `topic: true`, so it flows through the exact
// same fetch → normalizeSignal → tier pipeline and needs no special-casing
// anywhere downstream.
//
// ── ROUTE PATTERNS PER PLATFORM ──────────────────────────────────────────────
//
//  Reddit search — NATIVE RSS, no RSSHub, works free. The backbone here.
//    https://www.reddit.com/search.rss?q=<query>&sort=new&t=week
//    https://www.reddit.com/r/<sub>/search.rss?q=<q>&restrict_sr=1&sort=new
//
//  Instagram hashtag — RSSHub, no login, but antiCrawler: rate-limits hard.
//    /instagram/2/tags/<hashtag>
//
//  X keyword — RSSHub, needs TWITTER_AUTH_TOKEN on the instance. Degrades on
//  the free tier exactly like the X account sources.
//    /twitter/keyword/<query>
//
//  YouTube search — official Data API, via TRACKED_QUERIES below rather than
//  here, because it uses the API path instead of a feed URL.
//
// ASSUMPTION: every entry below is a seed for one of your money domains, chosen
// to be a query that actually returns signal rather than noise. Tune the query
// strings; the shape is what matters.
export const TOPIC_SOURCES = [
  // ── ERCOT / grid ──────────────────────────────────────────────────────────
  { platform: 'Reddit', topic: true, query: 'ERCOT grid',
    route: 'https://www.reddit.com/search.rss?q=ERCOT&sort=new&t=week',
    label: 'ERCOT', category: 'energy', limit: 5 },
  { platform: 'X', topic: true, query: 'ERCOT',
    route: '/twitter/keyword/ERCOT',
    label: 'ERCOT on X', category: 'energy', limit: 5 },

  // ── Multifamily real estate ───────────────────────────────────────────────
  { platform: 'Reddit', topic: true, query: 'multifamily real estate',
    route: 'https://www.reddit.com/search.rss?q=multifamily&sort=new&t=week',
    label: 'Multifamily RE', category: 'business', limit: 5 },

  // ── Dividends / covered calls ─────────────────────────────────────────────
  { platform: 'Reddit', topic: true, query: 'covered calls',
    route: 'https://www.reddit.com/r/thetagang/search.rss?q=covered+call&restrict_sr=1&sort=new',
    label: 'Covered calls', category: 'business', limit: 5 },

  // ── Longevity ─────────────────────────────────────────────────────────────
  { platform: 'Reddit', topic: true, query: 'longevity',
    route: 'https://www.reddit.com/r/longevity/hot/.rss',
    label: 'r/longevity', category: 'health', limit: 5 },

  // ── AI for business development ───────────────────────────────────────────
  { platform: 'Reddit', topic: true, query: 'AI sales prospecting',
    route: 'https://www.reddit.com/search.rss?q=AI+sales+prospecting&sort=new&t=week',
    label: 'AI for BD', category: 'tech', limit: 5 },
];


// ═══════════════════════════════════════════════════════════════════════════
//  PODCASTS — the show's own RSS feed. No RSSHub, no API key, no account.
// ═══════════════════════════════════════════════════════════════════════════
//
// A podcast IS an RSS feed by definition — that is what the medium is. So this
// is the one source type with no intermediary at all: AetherHub fetches the
// publisher's feed directly, through the same paced/cached fetcher every other
// source uses (lib/feed-fetch.js).
//
//   { platform: 'Podcast', show, feedUrl, label, category, limit }
//
//   feedUrl   the show's RSS feed, absolute. NOT derivable from the show name —
//             https://feeds.megaphone.fm/GLT1412515089 does not follow from
//             "Joe Rogan Experience" by any rule, which is why podcasts resolve
//             by DIRECTORY LOOKUP rather than by guessing a handle.
//   show      the publisher's own name for the show, used on the card.
//
// ── HOW THESE WERE RESOLVED, AND WHAT IS STILL PENDING ──────────────────────
// Every URL below has TWO independent sources: the user's own production
// intelligence-hub config (feeds in live use), and a web search confirming the
// same URL and identifying the publisher. That is evidence, and it is why these
// are wired rather than parked.
//
// It is NOT content-verification. The build sandbox cannot reach a single
// podcast host or the iTunes directory:
//
//     itunes.apple.com     → 403 (CONNECT rejected by the egress policy)
//     feeds.megaphone.fm   → 403
//     feeds.simplecast.com → 403
//
// So the last step — fetch the feed, confirm it parses to real recent episodes,
// confirm the channel title is the show we think it is — runs with one command
// where the network works:
//
//     npm run podcasts:verify          report only
//     npm run podcasts:verify -- --fix  correct any feed that resolved elsewhere
//
// Until then each source carries `pendingVerification: true`, the UI says so,
// and a feed that turns out wrong degrades honestly instead of rendering
// someone else's show under the right name.
export const PODCAST_SOURCES = [
  // ASSUMPTION (identity solid, content-verification pending): Megaphone feed
  // in live use in intelligence-hub. The long-form interview show.
  { platform: 'Podcast', show: 'The Joe Rogan Experience',
    feedUrl: 'https://feeds.megaphone.fm/GLT1412515089',
    label: 'Joe Rogan Experience', category: 'popculture', limit: 4,
    pendingVerification: true },

  // ASSUMPTION: Libsyn feed, in live use in intelligence-hub. Chamath,
  // Sacks, Friedberg and Calacanis on markets and technology.
  { platform: 'Podcast', show: 'All-In with Chamath, Jason, Sacks & Friedberg',
    feedUrl: 'https://allinchamathjason.libsyn.com/rss',
    label: 'All-In', category: 'business', limit: 4,
    pendingVerification: true },

  // ASSUMPTION: Simplecast feed, in live use in intelligence-hub. Ben Gilbert
  // and David Rosenthal on company histories — the deepest show notes of the
  // five, which makes it the best case for episode summaries.
  { platform: 'Podcast', show: 'Acquired',
    feedUrl: 'https://feeds.simplecast.com/jeNJI0r9',
    label: 'Acquired', category: 'business', limit: 4,
    pendingVerification: true },

  // ASSUMPTION: Megaphone feed. Corroborated by search, which also resolved the
  // full title — the show is listed as "Andrew Schulz's Flagrant with Akaash
  // Singh", so "Flagrant" alone is the short name, not the feed's title.
  { platform: 'Podcast', show: "Andrew Schulz's Flagrant",
    feedUrl: 'https://feeds.megaphone.fm/APPI6857213837',
    label: 'Flagrant', category: 'popculture', limit: 4,
    pendingVerification: true },

  // ASSUMPTION: Megaphone feed. THE NAME-COLLISION CASE, and the reason
  // verify-then-wire exists: "Morning Wire" matches several unrelated shows in
  // any directory. Search confirmed this ID is The Daily Wire's news briefing
  // hosted by John Bickley (Apple id 1576594336) — not another show of the same
  // name. Verification will re-confirm the channel title matches.
  { platform: 'Podcast', show: 'Morning Wire',
    feedUrl: 'https://feeds.megaphone.fm/BVDWV8747925072',
    label: 'Morning Wire', category: 'general', limit: 4,
    pendingVerification: true },
];

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
  // Resolved by search: youtube.com/@MichaelButton1 ("Ancient History BA",
  // ~250K subs). This REPLACES an earlier channelId guess that was never
  // confirmed. Identity is now solid; content-verification runs via
  // `npm run sources:resolve` once YOUTUBE_API_KEY is available.
  { platform: 'YouTube', person: 'Michael Button',    handle: 'MichaelButton1',      label: 'Michael Button',        category: 'ancient',  limit: 3 },
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
  const all = [...SOCIAL_SOURCES, ...YOUTUBE_SOURCES, ...PODCAST_SOURCES];
  if (!category) return all;
  return all.filter(s => s.category === category);
}

/** A source's effective item cap. */
export function limitOf(source) {
  const n = Number(source?.limit);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_LIMIT;
}


// ═══════════════════════════════════════════════════════════════════════════
//  SPORTS — two-level taxonomy: league → team
// ═══════════════════════════════════════════════════════════════════════════
//
// Sports is the one category with a drill-down. A source carries
// `subcategory: '<league or team id>'`, and lib/velocity.js filters on it — the
// SAME engine Discover uses. There is no separate sports trending system.
//
// SOURCE STRATEGY — Reddit first, and deliberately so:
//   • Reddit serves native RSS. No RSSHub, no token, no rate limit worth
//     worrying about. It is the only sports source that is reliable today.
//   • YouTube official league channels add video signal via the official API.
//   • X handles are NOT wired for sports. The page must not depend on a
//     platform that cannot pull on the free instance, and "trending even if I
//     do not follow it" comes from the velocity/topic engine, not from X.
export const SPORTS_LEAGUES = [
  { id: 'ncaaf',   label: 'NCAAF' },
  { id: 'ncaab',   label: 'NCAAB' },
  { id: 'nfl',     label: 'NFL' },
  { id: 'nba',     label: 'NBA' },
  { id: 'mlb',     label: 'MLB' },
  { id: 'golf',    label: 'Golf' },
  { id: 'racing',  label: 'Horse Racing' },
];

// Your teams. `league` places each under its league in the drill-down.
export const SPORTS_TEAMS = [
  { id: 'clemson-fb',  label: 'Clemson Football',   league: 'ncaaf' },
  { id: 'kentucky-fb', label: 'Kentucky Football',  league: 'ncaaf' },
  { id: 'texans',      label: 'Houston Texans',     league: 'nfl'   },
  { id: 'astros',      label: 'Houston Astros',     league: 'mlb'   },
  { id: 'kentucky-bb', label: 'Kentucky Basketball', league: 'ncaab' },
  { id: 'rockets',     label: 'Houston Rockets',    league: 'nba'   },
];

/** Every sports subcategory, flat — leagues then teams. */
export const SPORTS_SUBCATEGORIES = [
  ...SPORTS_LEAGUES.map(l => ({ ...l, kind: 'league', parent: null })),
  ...SPORTS_TEAMS.map(t => ({ ...t, kind: 'team', parent: t.league })),
];

// ASSUMPTION: subreddit names below are the well-known community for each
// league/team, and YouTube handles are the official channels. Both are my
// resolution, not yours — flag anything wrong and it is a one-line fix.
//
// Kentucky is the one non-obvious mapping: football and basketball share
// r/BigBlueNation, so wiring both to the same route would be a literal
// duplicate feed. Basketball takes the subreddit (its dominant use) and
// football takes a scoped search inside it.
export const SPORTS_SOURCES = [
  // ── Leagues (Reddit native RSS) ──────────────────────────────────────────
  { platform: 'Reddit', route: 'https://www.reddit.com/r/CFB/hot/.rss',                label: 'r/CFB',                category: 'sports', subcategory: 'ncaaf',  limit: 4 },
  { platform: 'Reddit', route: 'https://www.reddit.com/r/CollegeBasketball/hot/.rss',  label: 'r/CollegeBasketball',  category: 'sports', subcategory: 'ncaab',  limit: 4 },
  { platform: 'Reddit', route: 'https://www.reddit.com/r/nfl/hot/.rss',                label: 'r/nfl',                category: 'sports', subcategory: 'nfl',    limit: 4 },
  { platform: 'Reddit', route: 'https://www.reddit.com/r/nba/hot/.rss',                label: 'r/nba',                category: 'sports', subcategory: 'nba',    limit: 4 },
  { platform: 'Reddit', route: 'https://www.reddit.com/r/baseball/hot/.rss',           label: 'r/baseball',           category: 'sports', subcategory: 'mlb',    limit: 4 },
  { platform: 'Reddit', route: 'https://www.reddit.com/r/golf/hot/.rss',               label: 'r/golf',               category: 'sports', subcategory: 'golf',   limit: 4 },
  { platform: 'Reddit', route: 'https://www.reddit.com/r/horseracing/hot/.rss',        label: 'r/horseracing',        category: 'sports', subcategory: 'racing', limit: 4 },

  // ── Teams (Reddit native RSS) ────────────────────────────────────────────
  { platform: 'Reddit', route: 'https://www.reddit.com/r/Clemson/hot/.rss',            label: 'r/Clemson',            category: 'sports', subcategory: 'clemson-fb',  limit: 4 },
  { platform: 'Reddit', route: 'https://www.reddit.com/r/BigBlueNation/search.rss?q=football&restrict_sr=1&sort=new',
    label: 'r/BigBlueNation · football', category: 'sports', subcategory: 'kentucky-fb', limit: 4 },
  { platform: 'Reddit', route: 'https://www.reddit.com/r/BigBlueNation/hot/.rss',      label: 'r/BigBlueNation',      category: 'sports', subcategory: 'kentucky-bb', limit: 4 },
  { platform: 'Reddit', route: 'https://www.reddit.com/r/Texans/hot/.rss',             label: 'r/Texans',             category: 'sports', subcategory: 'texans',      limit: 4 },
  { platform: 'Reddit', route: 'https://www.reddit.com/r/Astros/hot/.rss',             label: 'r/Astros',             category: 'sports', subcategory: 'astros',      limit: 4 },
  { platform: 'Reddit', route: 'https://www.reddit.com/r/rockets/hot/.rss',            label: 'r/rockets',            category: 'sports', subcategory: 'rockets',     limit: 4 },
];

// Official league channels — video signal with real view counts, so these are
// the only sports sources whose velocity is scored on engagement not recency.
// ASSUMPTION: official handles, unverified. NCAAF/NCAAB/racing have no single
// official channel worth wiring, so they stay Reddit-only.
export const SPORTS_YOUTUBE = [
  { platform: 'YouTube', handle: 'NFL',      label: 'NFL',      category: 'sports', subcategory: 'nfl',  limit: 3 },
  { platform: 'YouTube', handle: 'NBA',      label: 'NBA',      category: 'sports', subcategory: 'nba',  limit: 3 },
  { platform: 'YouTube', handle: 'MLB',      label: 'MLB',      category: 'sports', subcategory: 'mlb',  limit: 3 },
  { platform: 'YouTube', handle: 'PGATOUR',  label: 'PGA Tour', category: 'sports', subcategory: 'golf', limit: 3 },
];

/** Teams under a league. */
export function teamsInLeague(leagueId) {
  return SPORTS_TEAMS.filter(t => t.league === leagueId);
}

/** Display label for any sports subcategory id. */
export function subcategoryLabel(id) {
  return SPORTS_SUBCATEGORIES.find(s => s.id === id)?.label || id;
}

// Sports joins the main arrays: one list, one pipeline. Grouped above purely so
// the taxonomy reads in one place.
SOCIAL_SOURCES.push(...SPORTS_SOURCES);
YOUTUBE_SOURCES.push(...SPORTS_YOUTUBE);
