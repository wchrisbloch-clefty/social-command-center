// app/api/sources/route.js — the ONE writer for config/sources.js.
//
// GET  /api/sources  → the current source list (customization tab reads this)
// POST /api/sources  → append one source
//
// A manual add and a radar "Add to Follow" both land here and produce a line
// that is byte-identical to a hand-written one apart from a provenance comment.
// There is exactly one list; nothing maintains a parallel copy.
//
// ── WHERE THIS WORKS ────────────────────────────────────────────────────────
// Writing to config/sources.js needs a writable filesystem — true locally,
// false on Vercel, where the deployment bundle is read-only. On a read-only
// host the route does NOT pretend to succeed: it returns the exact line to
// paste, with `readOnly: true`, and the UI shows it for copying. Silently
// dropping the write would be the one genuinely bad outcome.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Config paths resolve from the PROJECT ROOT, never from import.meta.url:
// in a production build this module is bundled into .next/server, so a
// module-relative path points at the build output instead of the file you
// actually edit — and the write would appear to succeed while changing nothing.
import { SOCIAL_SOURCES, YOUTUBE_SOURCES, TOPIC_SOURCES, PODCAST_SOURCES, CATEGORY_IDS } from '../../../config/sources.js';
import { alreadyFollowed } from '../../../lib/categorize.js';
import { configLineFor } from '../../../lib/recommend.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CONFIG_PATH = join(process.cwd(), 'config', 'sources.js');

export async function GET() {
  return Response.json({
    social: SOCIAL_SOURCES,
    youtube: YOUTUBE_SOURCES,
    topics: TOPIC_SOURCES,
    podcasts: PODCAST_SOURCES,
    total: SOCIAL_SOURCES.length + YOUTUBE_SOURCES.length + TOPIC_SOURCES.length + PODCAST_SOURCES.length,
  });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Malformed request body' }, { status: 400 });
  }

  const { platform, handle, label, category, person, reason, feedUrl, show, verified } = body || {};

  // ── Podcasts ──────────────────────────────────────────────────────────────
  // Keyed by feed URL, and REFUSED unless the caller states the feed was
  // verified. /api/podcasts/resolve is what produces that flag, by actually
  // fetching the feed and reading its episodes. Accepting an unverified feed
  // here would route around the whole confirmation step, so this is the guard
  // that makes "verify-then-wire" structural rather than a UI convention.
  const isPodcast = platform === 'Podcast';
  if (isPodcast) {
    if (!feedUrl) {
      return Response.json({ error: 'feedUrl is required for a podcast' }, { status: 400 });
    }
    if (!verified) {
      return Response.json({
        added: false, unverified: true,
        error: 'This feed has not been verified. Resolve it through /api/podcasts/resolve first — a feed that has not returned real episodes is never wired.',
      }, { status: 400 });
    }
    if (PODCAST_SOURCES.some(p => p.feedUrl === feedUrl)) {
      return Response.json({ added: false, duplicate: true, message: `${label || show} is already in your shows.` });
    }
  } else if (!platform || !handle) {
    return Response.json({ error: 'platform and handle are required' }, { status: 400 });
  }
  const cat = CATEGORY_IDS.includes(category) ? category : 'general';

  // Additive only, and never twice.
  const existing = [...SOCIAL_SOURCES, ...YOUTUBE_SOURCES];
  if (!isPodcast && alreadyFollowed(existing, { platform, handle, route: '' })) {
    return Response.json({ added: false, duplicate: true, message: `${label || handle} is already in your sources.` });
  }

  const built = configLineFor(
    {
      display: label || show || `@${handle}`,
      handle, platform, feedUrl, show,
      category: cat,
      reason: reason || (isPodcast ? 'added and verified via the podcast resolver' : 'added manually'),
    },
    { category: cat }
  );
  if (!built) {
    return Response.json({ added: false, error: 'That suggestion has no handle, so it cannot become a route.' }, { status: 400 });
  }

  try {
    const src = await readFile(CONFIG_PATH, 'utf8');
    const anchor = `export const ${built.array} = [`;
    const at = src.indexOf(anchor);
    if (at === -1) {
      return Response.json({ added: false, readOnly: true, line: built.line, array: built.array,
        message: `Could not find ${built.array} in config/sources.js — paste the line yourself.` });
    }
    // Insert at the TOP of the array: newest first, and it never has to guess
    // where a trailing comment block ends.
    const insertAt = at + anchor.length;
    const next = src.slice(0, insertAt) + '\n' + built.line + src.slice(insertAt);
    await writeFile(CONFIG_PATH, next, 'utf8');

    console.warn(`[sources] added ${platform} ${handle} → ${built.array} (${cat})`);
    return Response.json({
      added: true, array: built.array, line: built.line,
      message: `${label || handle} added to ${built.array}. It is a normal source now — restart the dev server to pull it.`,
      person: person || null,
    });
  } catch (e) {
    // Read-only filesystem (Vercel) or a permissions problem. Report honestly
    // and hand back the exact line.
    console.warn(`[sources] write failed (${e?.code || e?.message}) — returning line for manual paste`);
    return Response.json({
      added: false, readOnly: true, array: built.array, line: built.line,
      message: 'This deployment has a read-only filesystem, so the line could not be written. Copy it into config/sources.js.',
    });
  }
}
