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
import { SOCIAL_SOURCES, YOUTUBE_SOURCES, TOPIC_SOURCES, CATEGORY_IDS } from '../../../config/sources.js';
import { alreadyFollowed } from '../../../lib/categorize.js';
import { configLineFor } from '../../../lib/recommend.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CONFIG_PATH = new URL('../../../config/sources.js', import.meta.url);

export async function GET() {
  return Response.json({
    social: SOCIAL_SOURCES,
    youtube: YOUTUBE_SOURCES,
    topics: TOPIC_SOURCES,
    total: SOCIAL_SOURCES.length + YOUTUBE_SOURCES.length + TOPIC_SOURCES.length,
  });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Malformed request body' }, { status: 400 });
  }

  const { platform, handle, label, category, person, reason } = body || {};
  if (!platform || !handle) {
    return Response.json({ error: 'platform and handle are required' }, { status: 400 });
  }
  const cat = CATEGORY_IDS.includes(category) ? category : 'general';

  // Additive only, and never twice.
  const existing = [...SOCIAL_SOURCES, ...YOUTUBE_SOURCES];
  if (alreadyFollowed(existing, { platform, handle, route: '' })) {
    return Response.json({ added: false, duplicate: true, message: `${label || handle} is already in your sources.` });
  }

  const built = configLineFor(
    { display: label || `@${handle}`, handle, platform, category: cat, reason: reason || 'added manually' },
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
