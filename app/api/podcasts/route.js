// app/api/podcasts/route.js — podcast episodes, straight from each show's RSS.
//
// GET /api/podcasts             every configured show
// GET /api/podcasts?category=   just that category
//
// ── WHY THIS IS THE SIMPLEST INGESTION PATH IN THE APP ──────────────────────
// A podcast IS an RSS feed. There is no intermediary to configure, no key to
// obtain, no instance to self-host: the publisher serves the feed, we fetch it.
// Instagram needs RSSHub, X needs a token on that instance, YouTube needs a
// Data API key — podcasts need nothing, which is why this route degrades far
// less than the others.
//
// It uses the SAME fetcher as /api/social (lib/feed-fetch.js), so it inherits
// the per-host pacing, the response cache and the 429/Retry-After handling the
// Reddit work produced. Megaphone and Simplecast behave better than reddit.com,
// but they are still someone else's servers.
//
// Degradation contract, identical to every other route: a dead feed is a normal
// state. Log it loudly server-side, return 200 with per-source `ok: false` and
// a reason, and let the UI render it honestly.

import { PODCAST_SOURCES, limitOf } from '../../../config/sources.js';
import { normalizeSignal } from '../../../lib/adapters.js';
import { fetchFeed } from '../../../lib/feed-fetch.js';
import { parseEpisodes, feedTitle, feedArtwork } from '../../../lib/feed-parser.js';
// The SAME classifier the source map and Add-to-Follow use. A second
// categorisation implementation would drift from the first, and an episode
// filed differently from the source that produced it is worse than no
// classification at all.
import { classifyEpisode, THIN_NOTES_CHARS } from '../../../lib/categorize.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

// A feed that has not published in this long is reported as QUIET rather than
// broken. A show on hiatus is not a wiring error, and conflating the two sends
// you chasing a bug that does not exist.
// ASSUMPTION: 45 days. Weekly shows skip weeks; six weeks of silence means the
// show has stopped or moved.
const STALE_DAYS = 45;

/** One show → up to `limit` normalized episode signals. Never throws. */
async function loadShow(source) {
  const limit = limitOf(source);
  const tag = `Podcast/${source.label}`;
  const res = await fetchFeed(source.feedUrl);

  const degraded = (status, error) => ({
    items: [],
    report: {
      label: source.label, show: source.show, platform: 'Podcast',
      category: source.category, ok: false, status, error, count: 0,
      pendingVerification: Boolean(source.pendingVerification),
    },
  });

  if (!res.ok) {
    console.warn(`[podcasts] ${tag} FAIL status=${res.status} (${res.err}) url=${source.feedUrl}`);
    return degraded(res.status, res.err);
  }

  const episodes = parseEpisodes(res.text);
  if (!episodes.length) {
    console.warn(`[podcasts] ${tag} parsed 0 episodes — reachable but empty, or not a podcast feed`);
    return degraded(200, 'feed returned no episodes');
  }

  // The feed's OWN title, so a wired feed that turns out to be a different show
  // is visible at runtime. This is the name-collision check surviving past the
  // resolver into every refresh.
  const actualTitle = feedTitle(res.text);
  const artwork = feedArtwork(res.text);

  const items = episodes.slice(0, limit).map(ep => {
    const placement = classifyEpisode(ep, source.category);
    return normalizeSignal({
    platform: 'Podcast',
    // The episode's OWN topic category, not the show's. This is what makes an
    // episode appear in the category feed where it belongs while staying one
    // signal — the Podcasts tab and that feed render the same object.
    category: placement.category,
    categorySource: placement.categorySource,
    categoryConfidence: placement.categoryConfidence,
    categoryMatched: placement.categoryMatched,
    title: ep.title,
    // Show notes are the content, and the ONLY text a summary can be built
    // from. See lib/podcast-summary.js for what that does and does not permit.
    content: ep.notes || ep.desc || '',
    notesChars: (ep.notes || '').length,
    url: ep.link,
    pubDate: ep.pubDate,
    author: source.show,
    show: source.show,
    duration: ep.duration,
    audioUrl: ep.audioUrl,
    episodeImg: ep.episodeImg || artwork,
    // Today every episode's text provenance is the publisher's own notes.
    // Nothing in this repo produces any other value.
    provenance: 'show-notes',
  }, { platform: 'Podcast', label: source.label, category: source.category });
  });

  const newest = items[0] ? new Date(items[0].publishedAt).getTime() : 0;
  const staleDays = newest ? Math.floor((Date.now() - newest) / 86_400_000) : null;
  const avgNotes = Math.round(
    items.reduce((n, i) => n + (i.podcast?.notesChars || 0), 0) / Math.max(items.length, 1));

  const shortTitle = String(source.show || '').toLowerCase().slice(0, 12);
  const shortActual = String(actualTitle || '').toLowerCase().slice(0, 12);

  return {
    items,
    report: {
      label: source.label, show: source.show, platform: 'Podcast',
      category: source.category, ok: true, status: 200, count: items.length,
      // Reported, never silently corrected. If these disagree the wired feed is
      // probably the wrong show, and that must be seen rather than papered over
      // with the label the user typed.
      feedTitle: actualTitle,
      titleMismatch: Boolean(actualTitle && shortTitle &&
        !actualTitle.toLowerCase().includes(shortTitle) &&
        !String(source.show).toLowerCase().includes(shortActual)),
      artwork,
      avgNotesChars: avgNotes,
      thinNotes: avgNotes < THIN_NOTES_CHARS,
      staleDays,
      quiet: staleDays !== null && staleDays > STALE_DAYS,
      pendingVerification: Boolean(source.pendingVerification),
    },
  };
}

function buildLimits(sources) {
  const limits = [];
  const dead = sources.filter(s => !s.ok);
  const thin = sources.filter(s => s.ok && s.thinNotes);
  const quiet = sources.filter(s => s.ok && s.quiet);
  const mismatch = sources.filter(s => s.titleMismatch);
  const pending = sources.filter(s => s.pendingVerification);

  if (dead.length) {
    limits.push(`${dead.length} show${dead.length > 1 ? 's' : ''} returned no feed: ${dead.map(s => s.label).join(', ')}.`);
  }
  if (thin.length) {
    limits.push(`${thin.map(s => s.label).join(', ')} publish very short show notes, so their summaries are brief and they contribute little to cross-show topics. That is the feed, not a fault.`);
  }
  if (quiet.length) {
    limits.push(`${quiet.map(s => `${s.label} (${s.staleDays}d)`).join(', ')} have not published recently.`);
  }
  if (mismatch.length) {
    limits.push(`Feed title does not match the wired show name for ${mismatch.map(s => `${s.label} → "${s.feedTitle}"`).join(', ')} — the feed may be the wrong show.`);
  }
  if (pending.length) {
    limits.push(`${pending.length} feed${pending.length > 1 ? 's have' : ' has'} not been content-verified — run \`npm run podcasts:verify\` where the network reaches podcast hosts.`);
  }
  return limits;
}

export async function GET(request) {
  const category = request.nextUrl.searchParams.get('category');
  // Every show is fetched whatever the filter, because the filter now applies
  // to EPISODES and an episode's category is not its show's. Filtering shows
  // first would hide the exact items dual-surfacing exists to reveal: the
  // Acquired episode that belongs in Tech lives behind a business-filed show.
  //
  // The cost is bounded — five feeds, all cached by lib/feed-fetch.js, and the
  // unfiltered call the Podcasts tab makes warms the same cache.
  try {
    const settled = await Promise.all(PODCAST_SOURCES.map(s =>
      loadShow(s).catch(e => ({
        items: [],
        report: {
          label: s.label, show: s.show, platform: 'Podcast', category: s.category,
          ok: false, status: 0, count: 0, error: e?.message || 'failed',
          pendingVerification: Boolean(s.pendingVerification),
        },
      }))));

    const all = settled.flatMap(r => r.items);
    // 'general' is the everything page, not a bucket — same rule the feed uses.
    const filtering = Boolean(category && category !== 'general');
    const items = filtering ? all.filter(i => i.category === category) : all;

    // Source reports follow the filter. In the Podcasts tab (no filter) every
    // show is reported, failures included — that is where a dead feed must be
    // seen. Inside a topic tab only the shows that actually contributed an
    // episode to THAT topic are reported, with their per-topic counts:
    // "Acquired · HTTP 404" in the Sports source list is noise, and
    // "Acquired · 4 items" next to a Sports feed containing none of them would
    // be a lie.
    const sources = filtering
      ? settled
          .map(r => ({ ...r.report, count: r.items.filter(i => i.category === category).length }))
          .filter(r => r.count > 0)
      : settled.map(r => r.report);
    const ok = sources.filter(s => s.ok).length;
    console.warn(
      `[podcasts] ${ok}/${sources.length} shows ok, ${all.length} episodes` +
      (category ? ` (${items.length} in ${category})` : ''));

    return Response.json({
      items, sources,
      limits: buildLimits(sources),
      // Asserted by the API itself, so no client can present a summary as more
      // than it is. Changes only when transcription is actually attached.
      textSource: 'show-notes',
    });
  } catch (err) {
    console.warn(`[podcasts] EXCEPTION ${err?.message}`);
    return Response.json({ items: [], sources: [], limits: ['Podcast ingestion failed.'], textSource: 'show-notes' });
  }
}
