// lib/source-resolver.js — resolve a person to a real, VERIFIED source.
//
// ═══════════════════════════════════════════════════════════════════════════
//  CANDIDATE FOR STANDALONE EXTRACTION
//  Nothing here is AetherHub-specific except the route shapes in PLATFORMS.
//  It takes a name and configuration, returns a structured result, and touches
//  no app state. If a second project needs handle resolution, lift this file,
//  swap PLATFORMS, and it works. Keep it that way: no imports from app/, no
//  reads of config/sources.js, no writes anywhere.
//
//  ONE dependency, added with the podcast platform: ./feed-parser.js, which is
//  a sibling lib with the same no-app-state discipline. It travels with this
//  file if this file is lifted. Nothing else was added.
// ═══════════════════════════════════════════════════════════════════════════
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
// Handles were being guessed from names. Three of the first fifteen guesses
// were wrong (@AmericanAlchemy, @DanielPink, @davidsinclairpodcast), and a wrong
// handle is worse than a missing one: it looks wired, renders nothing, and the
// failure is indistinguishable from a source being temporarily down.
//
// So: never wire a guess. Resolve, then VERIFY the route actually returns
// content, and only then hand back something wireable.
//
// ── PLATFORM ORDER ──────────────────────────────────────────────────────────
// YouTube → X → LinkedIn, deliberately:
//   YouTube    free, official API, verification is a real content check
//   X          needs TWITTER_AUTH_TOKEN on the RSSHub instance; on the free
//              public instance a correct handle STILL cannot be verified, so it
//              resolves as `unverifiable` rather than failing
//   LinkedIn   company pages only — there is no person route, so an individual
//              can never resolve here. Included so the result says that.
//
// ── TWO MODES ───────────────────────────────────────────────────────────────
//   verify-then-wire   (active today) — only verified sources come back wireable
//   suggest-for-approval (scaffolded)  — see MODE_APPROVAL below

/** @typedef {'youtube'|'x'|'linkedin'} PlatformKey */

/**
 * @typedef {object} ResolutionResult
 * @property {string}  query            what was asked for
 * @property {?string} platform         'YouTube' | 'X' | 'LinkedIn', null if unresolved
 * @property {?string} handle           resolved handle, without '@'
 * @property {?string} channelId        YouTube only, when the handle is unknown but the channel is not
 * @property {'high'|'medium'|'low'|'none'} confidence
 * @property {boolean} verified         did the route actually return content
 * @property {?string} reason           why it is unverified, when it is
 * @property {number}  itemCount        items seen during verification
 * @property {string[]} tried           every candidate attempted, for your review
 * @property {boolean} blocked          verification could not RUN (missing credential),
 *                                      as opposed to running and failing
 * @property {string[]} notes            structural facts learned on the way, e.g.
 *                                      that LinkedIn has no route for a person
 * @property {?object} wireable         a config-ready source line, ONLY when verified
 */

import { parseEpisodes, feedTitle, feedArtwork } from './feed-parser.js';

export const MODES = {
  /** Today. Resolve, verify, and only return wireable when content came back. */
  VERIFY_THEN_WIRE: 'verify-then-wire',
  /**
   * Future UI mode. Same resolution and verification, but the result is
   * proposed for one-tap approval instead of being wired.
   * ── APPROVAL HOOK ────────────────────────────────────────────────────────
   * Attach the approval UI here. `resolveSource(..., { mode: MODES.SUGGEST })`
   * already returns everything a Recommended-to-Follow style card needs —
   * platform, handle, confidence, verified, itemCount, reason. The only
   * difference in behaviour is that the caller must not auto-write; route the
   * result through POST /api/sources on the user's tap, exactly as
   * Recommended-to-Follow does today.
   * Deliberately NOT active: nothing in this repo calls it yet.
   */
  SUGGEST: 'suggest-for-approval',
};

// ── Platform definitions ────────────────────────────────────────────────────
// The one AetherHub-shaped part of this file. Swap for another app's routes.
export const PLATFORMS = {
  youtube: {
    name: 'YouTube',
    /** Verification hits the official Data API — a real content check. */
    async verify(candidate, ctx) {
      const key = ctx.youtubeApiKey;
      // Blocked, not wrong. "I could not check" and "that handle does not exist"
      // are different answers and must never be collapsed into one message.
      if (!key) {
        return { ok: false, count: 0, blocked: true,
          reason: 'YOUTUBE_API_KEY not set, so YouTube could not be verified' };
      }
      const params = candidate.channelId
        ? { part: 'contentDetails', id: candidate.channelId }
        : { part: 'contentDetails', forHandle: candidate.handle };
      const chan = await ctx.getJson(
        `https://www.googleapis.com/youtube/v3/channels?${new URLSearchParams({ ...params, key })}`);
      const uploads = chan?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploads) return { ok: false, count: 0, reason: 'no channel found for that handle or id' };
      const list = await ctx.getJson(
        `https://www.googleapis.com/youtube/v3/playlistItems?${new URLSearchParams({ part: 'snippet', maxResults: '3', playlistId: uploads, key })}`);
      const count = (list?.items || []).length;
      return count > 0
        ? { ok: true, count }
        : { ok: false, count: 0, reason: 'channel exists but has published nothing' };
    },
    wire: c => ({
      platform: 'YouTube', array: 'YOUTUBE_SOURCES',
      ...(c.channelId ? { channelId: c.channelId } : { handle: c.handle }),
    }),
  },

  x: {
    name: 'X',
    async verify(candidate, ctx) {
      const url = `${ctx.rsshubBase}/twitter/user/${candidate.handle}`;
      const res = await ctx.getText(url);
      if (!res.ok) {
        // A correct handle on the free public instance still cannot be proven,
        // because /twitter/* needs a token on the INSTANCE. Say which of the
        // two it is rather than reporting a wrong handle.
        const publicInstance = /rsshub\.app/.test(ctx.rsshubBase);
        return {
          ok: false, count: 0,
          unverifiable: publicInstance,
          blocked: publicInstance,
          reason: publicInstance
            ? 'X cannot be verified on the free public RSSHub — needs TWITTER_AUTH_TOKEN on the instance'
            : `route returned ${res.status}`,
        };
      }
      const count = (res.text.match(/<item[\s>]/gi) || []).length;
      return count > 0 ? { ok: true, count } : { ok: false, count: 0, reason: 'route returned no items' };
    },
    wire: c => ({ platform: 'X', array: 'SOCIAL_SOURCES', route: `/twitter/user/${c.handle}` }),
  },


  // ── PODCAST ───────────────────────────────────────────────────────────────
  // Different in kind from the three above, and the difference matters.
  //
  // A person has a HANDLE you can guess at ("@joerogan"), so those platforms
  // generate candidates mechanically and test them. A show has a FEED URL you
  // cannot guess — https://feeds.megaphone.fm/GLT1412515089 is not derivable
  // from "Joe Rogan Experience" by any rule. So podcasts resolve by DIRECTORY
  // LOOKUP instead: the public iTunes Search API is the canonical podcast
  // index, needs no key, and returns the real feedUrl.
  //
  // This is also what answers "did I get the right show?". Name collisions are
  // the normal case, not the exception — search "Morning Wire" and several
  // unrelated shows come back. Verification therefore returns the feed's OWN
  // channel title, its publisher and its latest episode, so a human can confirm
  // the match instead of trusting a name.
  podcast: {
    name: 'Podcast',
    async verify(candidate, ctx) {
      // A feed URL supplied directly skips the directory entirely.
      let feedUrl = candidate.feedUrl || '';
      let directory = null;

      if (!feedUrl) {
        const found = await searchPodcastDirectory(candidate.query || candidate.handle, ctx);
        if (!found.length) {
          return { ok: false, count: 0,
            reason: `no podcast in the iTunes directory matches "${candidate.query || candidate.handle}"` };
        }
        directory = found[0];
        feedUrl = directory.feedUrl;
        // More than one plausible match is not a failure — it is the thing the
        // confirmation step exists for. Carried through so the UI can show it.
        if (found.length > 1) candidate.alternatives = found.slice(1, 5);
      }

      const res = await ctx.getText(feedUrl);
      if (!res.ok) {
        return { ok: false, count: 0, reason: `feed returned ${res.status || 'no response'}` };
      }

      const episodes = parseEpisodes(res.text).slice(0, 5);
      if (!episodes.length) {
        return { ok: false, count: 0, reason: 'feed parsed but contains no episodes' };
      }

      // The feed's own title beats the directory's and beats the query: it is
      // what the publisher calls the show.
      const showTitle = feedTitle(res.text) || directory?.collectionName || '';
      const latest = episodes[0];

      return {
        ok: true,
        count: episodes.length,
        feedUrl,
        showTitle,
        publisher: directory?.artistName || '',
        artwork: directory?.artworkUrl600 || feedArtwork(res.text) || '',
        // The confirmation payload. "Is this the right show?" is answerable
        // only with evidence, and this is the evidence.
        latestEpisode: {
          title: latest.title,
          publishedAt: latest.pubDate,
          notesChars: (latest.notes || '').length,
        },
        alternatives: candidate.alternatives || [],
      };
    },
    wire: c => ({
      platform: 'Podcast', array: 'PODCAST_SOURCES', feedUrl: c.feedUrl || '',
    }),
  },

  linkedin: {
    name: 'LinkedIn',
    async verify(candidate, ctx) {
      // Structural, not a network failure: RSSHub's LinkedIn namespace exposes
      // /linkedin/company/:id/posts and nothing else. A PERSON has no route.
      if (!candidate.isCompany) {
        // True for every candidate, not just this one — blocked, so the loop
        // does not re-derive the same structural fact ten times.
        return { ok: false, count: 0, structural: true, blocked: true,
          reason: 'RSSHub exposes LinkedIn company pages only — an individual has no route' };
      }
      const url = `${ctx.rsshubBase}/linkedin/company/${candidate.handle}/posts`;
      const res = await ctx.getText(url);
      if (!res.ok) return { ok: false, count: 0, reason: `route returned ${res.status}` };
      const count = (res.text.match(/<item[\s>]/gi) || []).length;
      return count > 0 ? { ok: true, count } : { ok: false, count: 0, reason: 'route returned no items' };
    },
    wire: c => ({ platform: 'LinkedIn', array: 'SOCIAL_SOURCES', route: `/linkedin/company/${c.handle}/posts` }),
  },
};

export const DEFAULT_ORDER = ['youtube', 'x', 'linkedin'];

/**
 * Resolve a show NAME to real feeds via the public iTunes Search API.
 *
 * No key, no account, documented and stable. Returns every plausible match
 * rather than the top one, because picking silently is exactly the failure the
 * confirmation step exists to prevent.
 *
 * ASSUMPTION: the directory is authoritative for "which feed is this show".
 * A publisher who never listed their show is invisible here — for that case the
 * caller supplies the RSS URL directly, which is why feedUrl short-circuits.
 */
export async function searchPodcastDirectory(term, ctx, { limit = 6 } = {}) {
  const q = String(term || '').trim();
  if (!q) return [];
  const url = `https://itunes.apple.com/search?${new URLSearchParams({
    media: 'podcast', entity: 'podcast', limit: String(limit), term: q,
  })}`;
  const data = await ctx.getJson(url);
  return (data?.results || [])
    .filter(r => r.feedUrl)
    .map(r => ({
      feedUrl: r.feedUrl,
      collectionName: r.collectionName || '',
      artistName: r.artistName || '',
      artworkUrl600: r.artworkUrl600 || r.artworkUrl100 || '',
      trackCount: r.trackCount || 0,
      genre: r.primaryGenreName || '',
    }));
}

// ── Candidate generation ────────────────────────────────────────────────────

/**
 * Plausible handles for a name. Deliberately mechanical: these are things to
 * TEST, not answers. Verification is what decides, so a wide net costs only
 * time and a narrow one costs a missed source.
 */
export function candidateHandles(name) {
  const clean = String(name || '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const joined = parts.join('');
  const lower = joined.toLowerCase();
  const [first = '', last = ''] = parts;

  const out = [
    joined, lower,
    parts.join('_').toLowerCase(),
    `${first}${last}`.toLowerCase(),
    `${first[0] || ''}${last}`.toLowerCase(),
    `${lower}official`,
    `the${lower}`,
    `${lower}tv`,
    `${lower}podcast`,
  ];
  return [...new Set(out.filter(h => h && h.length >= 3 && h.length <= 30))];
}

// ── Fetch helpers, injectable so this stays testable and portable ───────────

function defaultContext(overrides = {}) {
  const timeout = overrides.timeoutMs || 9000;
  return {
    rsshubBase: (overrides.rsshubBase || process.env.RSSHUB_BASE_URL || 'https://rsshub.app').replace(/\/+$/, ''),
    youtubeApiKey: overrides.youtubeApiKey ?? process.env.YOUTUBE_API_KEY ?? '',
    async getJson(url) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(timeout), cache: 'no-store' });
        return r.ok ? await r.json() : null;
      } catch { return null; }
    },
    async getText(url) {
      try {
        const r = await fetch(url, {
          headers: { 'User-Agent': 'AetherHub-SourceResolver/1.0', Accept: '*/*' },
          signal: AbortSignal.timeout(timeout), cache: 'no-store', redirect: 'follow',
        });
        return { ok: r.ok, status: r.status, text: r.ok ? await r.text() : '' };
      } catch (e) {
        return { ok: false, status: 0, text: '', error: e?.message };
      }
    },
    ...overrides,
  };
}

// ── The public interface ────────────────────────────────────────────────────

/**
 * Resolve one person/entity to a verified source.
 *
 * @param {string} query                 person or entity name
 * @param {object} [opts]
 * @param {string[]} [opts.order]        platform order, defaults YouTube → X → LinkedIn
 * @param {object[]} [opts.hints]        known candidates to try FIRST, e.g.
 *                                       [{ platform:'youtube', handle:'ChrisWillx' },
 *                                        { platform:'youtube', channelId:'UC…' }]
 * @param {boolean} [opts.isCompany]     LinkedIn only resolves companies
 * @param {string}  [opts.mode]          MODES.VERIFY_THEN_WIRE (default) | MODES.SUGGEST
 * @param {object}  [opts.context]       injected fetchers, for tests
 * @returns {Promise<ResolutionResult>}
 */
export async function resolveSource(query, opts = {}) {
  const {
    order = DEFAULT_ORDER,
    hints = [],
    isCompany = false,
    mode = MODES.VERIFY_THEN_WIRE,
    context: ctxOverrides = {},
  } = opts;

  const ctx = defaultContext(ctxOverrides);
  const tried = [];

  const result = {
    query, platform: null, handle: null, channelId: null,
    confidence: 'none', verified: false, reason: null, blocked: false,
    itemCount: 0, tried, notes: [], wireable: null, mode,
  };

  // Hints first: a handle you already believe is far likelier than a generated
  // one, and trying it first keeps the API budget small.
  const rawPlan = [
    ...hints.map(h => ({ key: h.platform, handle: h.handle, channelId: h.channelId, hinted: true })),
    ...order.flatMap(key =>
      candidateHandles(query).map(handle => ({ key, handle, hinted: false }))),
  ];
  // A hinted candidate and a generated one can collide; trying it twice costs
  // API quota and makes `tried` read like the resolver is confused.
  const seen = new Set();
  const plan = rawPlan.filter(s => {
    const k = `${s.key}:${s.channelId || s.handle}`;
    return seen.has(k) ? false : (seen.add(k), true);
  });

  let softFailure = null;   // blocked / unverifiable — beats a bare miss
  const notes = [];         // structural facts, reported alongside, never instead
  const blocked = new Set(); // platforms that cannot answer AT ALL right now

  for (const step of plan) {
    const platform = PLATFORMS[step.key];
    if (!platform) continue;
    // No credential, no route: every further candidate on this platform returns
    // the same answer. Twenty identical failures is not more information.
    if (blocked.has(step.key)) continue;

    const candidate = { handle: step.handle, channelId: step.channelId, isCompany };
    const ref = step.channelId || `@${step.handle}`;
    const label = `${platform.name} ${ref}`;
    tried.push(label);

    let outcome;
    try {
      outcome = await platform.verify(candidate, ctx);
    } catch (e) {
      outcome = { ok: false, count: 0, reason: e?.message || 'verification threw' };
    }

    if (outcome.ok) {
      result.platform = platform.name;
      result.handle = step.handle || null;
      result.channelId = step.channelId || null;
      result.verified = true;
      result.itemCount = outcome.count;
      // A hinted handle that verifies is as good as it gets. A generated one
      // that verifies is still real content, just found by guesswork.
      result.confidence = step.hinted ? 'high' : 'medium';
      result.wireable = { ...platform.wire(candidate), verified: true, itemCount: outcome.count };
      return result;
    }

    // Remember the most informative failure. "Cannot be checked here" is a
    // different answer from "does not exist", and the caller needs to know which.
    // First one wins, so platform order decides: YouTube's missing key is a more
    // actionable answer than X's missing instance token.
    if (outcome.blocked) blocked.add(step.key);
    // A structural fact ("LinkedIn has no person route") is a note, never the
    // headline: if YouTube actually ran and found no such channel, THAT is what
    // the caller needs to read, not a platform that was never going to work.
    if (outcome.structural) {
      if (!notes.includes(outcome.reason)) notes.push(outcome.reason);
    } else if ((outcome.blocked || outcome.unverifiable) && !softFailure) {
      softFailure = { platform: platform.name, ...outcome, ref };
    }
  }

  if (softFailure) {
    result.platform = softFailure.platform;
    result.handle = softFailure.ref?.replace(/^@/, '') || null;
    result.confidence = 'low';
    result.reason = softFailure.reason;
    // The caller renders these differently: blocked is "give me a credential",
    // unresolved is "this name may be wrong".
    result.blocked = Boolean(softFailure.blocked);
  } else {
    result.reason = `no candidate returned content (${tried.length} tried)`;
  }
  result.notes = notes;
  return result;
}

/**
 * Resolve several at once, with bounded concurrency.
 * Verification is network-bound and some of it is API-quota-bound, so this
 * deliberately does not fan out wide.
 */
export async function resolveMany(queries, opts = {}) {
  const { concurrency = 3, ...rest } = opts;
  const out = [];
  for (let i = 0; i < queries.length; i += concurrency) {
    const batch = queries.slice(i, i + concurrency);
    out.push(...await Promise.all(batch.map(q =>
      typeof q === 'string' ? resolveSource(q, rest) : resolveSource(q.query, { ...rest, ...q }))));
  }
  return out;
}

/** Render a verified result as a config line. Returns null when unverified. */
export function toConfigLine(result, { person, label, category, limit } = {}) {
  if (!result?.verified || !result.wireable) return null;
  const w = result.wireable;
  const name = person || result.query;
  const shown = label || (w.handle ? `@${w.handle}` : name);
  const cap = limit || (w.array === 'YOUTUBE_SOURCES' ? 3 : 5);
  const ref = w.channelId
    ? `channelId: '${w.channelId}'`
    : w.route ? `route: '${w.route}'` : `handle: '${w.handle}'`;
  return {
    array: w.array,
    line: `  { platform: '${w.platform}', person: '${name}', ${ref}, label: '${shown}', category: '${category || 'general'}', limit: ${cap} },`,
  };
}


// ── Podcast entry point ─────────────────────────────────────────────────────

/**
 * Resolve a podcast by NAME or by RSS URL, and verify it before it is wireable.
 *
 * Separate from resolveSource() because the candidate model is different in
 * kind: resolveSource generates handle permutations and tests them, which is
 * right for a person and meaningless for a show. There is no "guess the feed
 * URL" — there is a directory lookup, or a URL you already have.
 *
 * The result carries the CONFIRMATION payload (`showTitle`, `publisher`,
 * `latestEpisode`, `alternatives`) whether or not it verified, because "I found
 * a show, is it the right one?" is a different question from "I found nothing",
 * and the add-your-own UI has to ask the first one out loud.
 *
 * @param {string} input       a show name, or an http(s) RSS URL
 * @param {object} [options]
 * @returns {Promise<object>}  { verified, feedUrl, showTitle, publisher,
 *                               latestEpisode, alternatives, episodeCount,
 *                               reason, wireable, thinNotes }
 */
export async function resolvePodcast(input, { mode = MODES.VERIFY_THEN_WIRE, context } = {}) {
  const raw = String(input || '').trim();
  const ctx = context || defaultContext();
  const isUrl = /^https?:\/\//i.test(raw);

  const result = {
    query: raw, mode,
    verified: false, feedUrl: isUrl ? raw : '', showTitle: '', publisher: '',
    artwork: '', latestEpisode: null, alternatives: [], episodeCount: 0,
    reason: null, wireable: null, thinNotes: false,
  };

  if (!raw) {
    result.reason = 'no show name or feed URL given';
    return result;
  }

  const candidate = isUrl ? { feedUrl: raw } : { query: raw };
  let outcome;
  try {
    outcome = await PLATFORMS.podcast.verify(candidate, ctx);
  } catch (e) {
    outcome = { ok: false, count: 0, reason: e?.message || 'verification threw' };
  }

  Object.assign(result, {
    feedUrl: outcome.feedUrl || result.feedUrl,
    showTitle: outcome.showTitle || '',
    publisher: outcome.publisher || '',
    artwork: outcome.artwork || '',
    latestEpisode: outcome.latestEpisode || null,
    alternatives: outcome.alternatives || [],
    episodeCount: outcome.count || 0,
  });

  if (!outcome.ok) {
    result.reason = outcome.reason;
    return result;
  }

  result.verified = true;
  // Flagged, not rejected. A show with almost no show notes is still worth
  // following — it just cannot be summarised well, and the UI says so rather
  // than the summariser inventing the missing text.
  // ASSUMPTION: under 200 characters of notes is "thin". That is roughly one
  // sentence, which is not enough to summarise without padding.
  result.thinNotes = (outcome.latestEpisode?.notesChars || 0) < 200;
  result.wireable = {
    ...PLATFORMS.podcast.wire({ feedUrl: outcome.feedUrl }),
    label: outcome.showTitle,
    verified: true,
    itemCount: outcome.count,
  };
  return result;
}
