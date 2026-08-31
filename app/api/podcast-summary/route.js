// app/api/podcast-summary/route.js — one episode's AI summary.
//
// POST /api/podcast-summary  { episode }  → { summary, provenance, reason, ... }
//
// Thin wrapper. All the judgement lives in lib/podcast-summary.js, including
// the rule this endpoint exists to enforce: the summary may contain nothing
// that is not in the show notes. An episode with too little text never reaches
// a provider at all — it returns the reason instead, which is why no amount of
// prompt drift can turn a two-sentence episode into four invented paragraphs.
//
// Summaries go through /api/brief (Groq → Gemini → Claude), so a missing key
// degrades exactly the way every other AI panel does: 200, needsKey, and the
// notes shown as-is.

import { summariseEpisode } from '../../../lib/podcast-summary.js';
import { ttlCache } from '../../../lib/ttl-cache.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

// An episode's show notes never change once published, so its summary never
// needs recomputing. This is the longest TTL in the app on purpose: every miss
// is a paid provider call for a result that is by definition stable.
// ASSUMPTION: 6 hours. Long enough to make a browse session free, short enough
// that a corrected episode description is picked up the same day.
const cache = ttlCache('podcast-summary', 6 * 60 * 60 * 1000);

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Malformed request body' }, { status: 400 });
  }

  const episode = body?.episode;
  if (!episode?.title) {
    return Response.json({ error: 'episode with a title is required' }, { status: 400 });
  }

  // Keyed on the episode identity plus note length: if a publisher edits their
  // show notes the length almost always moves, and a stale summary of replaced
  // text is the one wrong answer here.
  const key = `${episode.id || episode.url || episode.title}|${(episode.content || '').length}`;
  const hit = cache.get(key);
  if (hit) return Response.json({ ...hit.value, cachedAt: hit.cachedAt, ageSeconds: hit.ageSeconds });

  try {
    const result = await summariseEpisode(episode, {
      // The app's existing provider chain. One AI path, so a provider change is
      // made once.
      ask: async ({ prompt, type }) => {
        const r = await fetch(new URL('/api/brief', request.nextUrl.origin), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, type }),
          cache: 'no-store',
          signal: AbortSignal.timeout(25_000),
        });
        return r.ok ? await r.json() : {};
      },
      // ── THE SOCKET, LEFT UNPLUGGED ────────────────────────────────────────
      // summariseEpisode accepts `transcribe: (audioUrl) => { text, provenance }`
      // and calls it only when supplied. Nothing is passed here, so provenance
      // stays 'show-notes' and no audio is ever fetched. See the header of
      // lib/podcast-summary.js for what attaching one would involve.
      transcribe: null,
    });

    // Only cache a real answer. Caching "no provider configured" would keep the
    // panel dark for six hours after a key was added.
    if (result.summary) cache.set(key, result);
    return Response.json({ ...result, cachedAt: null, ageSeconds: 0 });
  } catch (err) {
    console.warn(`[podcast-summary] EXCEPTION ${err?.message}`);
    return Response.json({
      summary: '', enough: false, provenance: 'show-notes',
      reason: 'Summarising failed. The show notes are shown instead.',
    });
  }
}
