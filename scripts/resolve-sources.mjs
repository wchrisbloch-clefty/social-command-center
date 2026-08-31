#!/usr/bin/env node
// scripts/resolve-sources.mjs — run the staged queue through the resolver.
//
//   npm run sources:resolve                 report only, changes nothing
//   npm run sources:resolve -- --write      wire the VERIFIED ones
//   npm run sources:resolve -- --audit      re-verify what is already wired
//   npm run sources:resolve -- --name "Jay Egg" --category energy
//
// ── WHY THIS IS A COMMAND AND NOT A BUILD STEP ──────────────────────────────
// Verification is a real network call to the YouTube Data API and to RSSHub.
// The build sandbox can reach neither (googleapis.com 403, everything else 000),
// and CI should not spend API quota on every push. So this runs where the
// network works — your machine — with YOUTUBE_API_KEY set:
//
//     YOUTUBE_API_KEY=... npm run sources:resolve -- --write
//
// ── WHAT --write IS ALLOWED TO DO ───────────────────────────────────────────
// Append a source to config/sources.js, and only when the route actually
// returned content. An unverified result is reported and left in the queue. The
// line it writes comes from lib/recommend.js `configLineFor` — the same builder
// the radar's "Add to Follow" uses — so an auto-resolved add, a radar add and a
// hand-typed line are byte-identical apart from the provenance comment.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RESOLVE_QUEUE, FLAGGED_FOR_DECISION } from '../config/resolve-queue.js';
import { resolveSource, MODES } from '../lib/source-resolver.js';
import { configLineFor } from '../lib/recommend.js';
import { SOCIAL_SOURCES, YOUTUBE_SOURCES } from '../config/sources.js';

const ROOT = process.cwd();
const CONFIG_PATH = join(ROOT, 'config', 'sources.js');

// ── Arguments ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const valueOf = f => {
  const i = argv.indexOf(f);
  return i === -1 ? null : argv[i + 1] || null;
};

const WRITE = has('--write');
const AUDIT = has('--audit');
const ONE_NAME = valueOf('--name');

const bold = s => `\x1b[1m${s}\x1b[0m`;
const dim = s => `\x1b[2m${s}\x1b[0m`;
const out = s => process.stdout.write(s);

// ── Preflight ───────────────────────────────────────────────────────────────
// Say up front what can and cannot be checked, so a run that verifies nothing
// is never mistaken for a run that found nothing.
const KEY = process.env.YOUTUBE_API_KEY || '';
const RSSHUB = (process.env.RSSHUB_BASE_URL || 'https://rsshub.app').replace(/\/+$/, '');
const publicRsshub = /rsshub\.app$/.test(RSSHUB);

out(`\n${bold('Source resolver')}  ${dim(WRITE ? 'verify-then-wire (--write)' : 'report only')}\n`);
out(`  YouTube   ${KEY ? 'API key present — verification is real' : 'NO YOUTUBE_API_KEY — YouTube cannot be verified'}\n`);
out(`  X         ${publicRsshub
  ? 'free public RSSHub — /twitter/* needs a token ON THE INSTANCE, so X resolves as unverifiable'
  : `self-hosted RSSHub (${RSSHUB}) — X verification is real`}\n`);
out(`  LinkedIn  company pages only; an individual has no route\n\n`);

if (WRITE && !KEY) {
  out(`  ${bold('Refusing to --write')}: with no YOUTUBE_API_KEY nothing can be verified,\n`);
  out(`  and wiring an unverified handle is the exact failure this exists to prevent.\n`);
  out(`  Set YOUTUBE_API_KEY and run again.\n\n`);
  process.exit(2);
}

// ── Report one result ───────────────────────────────────────────────────────
function render(entry, r) {
  const head = `  ${bold(entry.person)}  ${dim(`→ ${entry.category}`)}`;
  if (r.verified) {
    const ref = r.channelId ? r.channelId : `@${r.handle}`;
    return `${head}\n    VERIFIED  ${r.platform} ${ref}  ${r.itemCount} item(s)  confidence ${r.confidence}\n`;
  }
  const notes = (r.notes || []).map(n => `    ${dim(`note: ${n}`)}\n`).join('');
  return `${head}\n    ${r.blocked ? 'BLOCKED  ' : 'NOT WIRED'}  ${r.reason}\n` + notes +
         `    ${dim(`tried: ${r.tried.slice(0, 6).join(', ')}${r.tried.length > 6 ? `, +${r.tried.length - 6} more` : ''}`)}\n`;
}

// ── Resolve ─────────────────────────────────────────────────────────────────
const queue = ONE_NAME
  ? [{ person: ONE_NAME, category: valueOf('--category') || 'general', label: ONE_NAME, hints: [] }]
  : RESOLVE_QUEUE;

const verified = [];
const unresolved = [];

if (!AUDIT) {
  out(`${bold(`Queue — ${queue.length} staged`)}\n\n`);
  for (const entry of queue) {
    const r = await resolveSource(entry.person, {
      hints: entry.hints || [],
      mode: MODES.VERIFY_THEN_WIRE,
      context: { rsshubBase: RSSHUB, youtubeApiKey: KEY },
    });
    out(render(entry, r));
    (r.verified ? verified : unresolved).push({ entry, result: r });
  }
}

// ── Audit what is already wired ─────────────────────────────────────────────
// A handle that verified six months ago is not a handle that verifies today.
if (AUDIT) {
  const wired = [
    ...YOUTUBE_SOURCES.map(s => ({ ...s, hint: { platform: 'youtube', handle: s.handle, channelId: s.channelId } })),
    ...SOCIAL_SOURCES.filter(s => s.platform === 'X' && !s.topic)
      .map(s => ({ ...s, hint: { platform: 'x', handle: (s.route || '').split('/').pop() } })),
  ];
  out(`${bold(`Audit — ${wired.length} wired source(s)`)}\n\n`);
  let ok = 0, bad = 0;
  for (const s of wired) {
    const r = await resolveSource(s.person || s.label, {
      hints: [s.hint],
      // Hints only: an audit asks "does THIS still work", not "find me another".
      order: [],
      context: { rsshubBase: RSSHUB, youtubeApiKey: KEY },
    });
    if (r.verified) { ok++; out(`  ok    ${s.label}  ${dim(`${r.itemCount} item(s)`)}\n`); }
    else { bad++; out(`  ${bold('FAIL')}  ${s.label}  ${r.reason}\n`); }
  }
  out(`\n  ${ok} verified, ${bad} not returning content\n\n`);
  process.exit(bad ? 1 : 0);
}

// ── Wire the verified ones ──────────────────────────────────────────────────
if (WRITE && verified.length) {
  let src = await readFile(CONFIG_PATH, 'utf8');
  const day = new Date().toISOString().slice(0, 10);
  let written = 0;

  for (const { entry, result } of verified) {
    const built = configLineFor(
      {
        display: entry.label || entry.person,
        handle: result.handle,
        platform: result.platform,
        category: entry.category,
        reason: 'x',
      },
      { category: entry.category }
    );
    if (!built) continue;

    // Same line, honest provenance. `configLineFor` stamps its own
    // "Added via Recommended to Follow" comment; this one actually came from the
    // resolver, and the item count is the evidence it was verified.
    const line = built.line.replace(
      /^ {2}\/\/ .*$/m,
      `  // Resolved and verified by \`npm run sources:resolve\` ${day} — ` +
      `${result.platform} returned ${result.itemCount} item(s), confidence ${result.confidence}.`
    );

    const anchor = `export const ${built.array} = [`;
    const at = src.indexOf(anchor);
    if (at === -1) { out(`  could not find ${built.array} — paste this yourself:\n${line}\n`); continue; }
    const insertAt = at + anchor.length;
    src = src.slice(0, insertAt) + '\n' + line + src.slice(insertAt);
    written++;
  }

  await writeFile(CONFIG_PATH, src, 'utf8');
  out(`\n${bold(`Wired ${written} verified source(s)`)} into config/sources.js.\n`);
  out(`  Remove them from config/resolve-queue.js — a source lives in exactly one list.\n`);
} else if (verified.length) {
  out(`\n${bold(`${verified.length} would be wired`)}. Re-run with --write.\n`);
}

// ── Close the loop honestly ─────────────────────────────────────────────────
if (unresolved.length) {
  out(`\n${bold(`${unresolved.length} still unresolved`)} — staying in the queue, not guessed at:\n`);
  for (const { entry, result } of unresolved) out(`  ${entry.person} — ${result.reason}\n`);
}

if (FLAGGED_FOR_DECISION.length) {
  out(`\n${bold('Awaiting your decision')}\n`);
  for (const f of FLAGGED_FOR_DECISION) {
    out(`  ${f.label} (${f.sources} sources) — ${f.reason}\n    options: ${f.options.join(' | ')}\n`);
  }
}
out('\n');
