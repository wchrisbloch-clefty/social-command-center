// app/api/podcasts/resolve/route.js — "is this the right show?", answered.
//
// POST /api/podcasts/resolve  { query }  → a resolution WITH EVIDENCE
//
// Read-only. This route never writes anything: it is the confirmation step that
// runs BEFORE the write, and separating them is the point. The user types a
// name or a feed URL, sees which show actually came back and what it published
// most recently, and only then commits it through /api/sources.
//
// Why a confirmation step exists at all: a show name is not a unique key.
// "Morning Wire" matches several unrelated podcasts in any directory, and
// wiring the top hit silently is how you end up subscribed to a stranger's show
// under a name you recognise. The resolver returns the feed's OWN title, its
// publisher, its latest episode and any alternative matches — enough for a
// human to say yes or pick a different one.

import { resolvePodcast, searchPodcastDirectory } from '../../../../lib/source-resolver.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Malformed request body' }, { status: 400 });
  }

  const query = String(body?.query || '').trim();
  if (!query) {
    return Response.json({ error: 'A show name or RSS URL is required' }, { status: 400 });
  }

  try {
    const result = await resolvePodcast(query);

    // Alternatives matter most when the top hit is WRONG, so they are fetched
    // for a name search even when the first result verified — that is exactly
    // the moment the user needs to see "or did you mean one of these?".
    let alternatives = result.alternatives || [];
    if (!/^https?:\/\//i.test(query) && alternatives.length === 0) {
      try {
        const all = await searchPodcastDirectory(query, defaultCtx());
        alternatives = all.filter(a => a.feedUrl !== result.feedUrl).slice(0, 4);
      } catch { /* the primary answer stands on its own */ }
    }

    return Response.json({
      ...result,
      alternatives,
      // What the UI must show before it offers an Add button. Spelled out here
      // rather than left to the client to remember.
      confirmation: result.verified ? {
        question: 'Is this the right show?',
        show: result.showTitle,
        publisher: result.publisher,
        latestEpisode: result.latestEpisode,
        episodeCount: result.episodeCount,
        thinNotes: result.thinNotes,
        note: result.thinNotes
          ? 'This show publishes very short episode notes, so its AI summaries will be brief and it will rarely appear in cross-show topics.'
          : null,
      } : null,
    });
  } catch (err) {
    console.warn(`[podcasts/resolve] EXCEPTION ${err?.message}`);
    return Response.json({
      verified: false, query,
      reason: 'Resolution failed — the podcast directory or the feed could not be reached.',
      alternatives: [], confirmation: null,
    });
  }
}

// resolvePodcast builds its own default context; this mirrors it for the
// alternatives lookup so both calls share timeout and fetch behaviour.
function defaultCtx() {
  return {
    async getJson(url) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(9000), cache: 'no-store' });
        return r.ok ? await r.json() : null;
      } catch { return null; }
    },
  };
}
