#!/usr/bin/env node
// scripts/verify-podcasts.mjs — finish the verify-then-wire loop.
//
//   npm run podcasts:verify           report only
//   npm run podcasts:verify -- --fix  rewrite a feed URL the directory corrects
//
// ── WHY THIS IS A COMMAND AND NOT A TEST ────────────────────────────────────
// Verifying a podcast means fetching the publisher's feed and reading real
// episodes out of it. The build sandbox cannot: its egress policy 403s
// itunes.apple.com, feeds.megaphone.fm and feeds.simplecast.com. CI should not
// depend on live third-party feeds either — a show having a bad morning is not
// a broken build.
//
// So this runs where the network works. It checks three things per show, which
// are three different questions:
//
//   1. does the feed respond and parse to real episodes?
//   2. is the feed's OWN title the show we think it is?   ← the collision check
//   3. does it publish enough notes to summarise?         ← the honesty check
//
// Question 2 is the one that matters most and the one a naive check skips.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PODCAST_SOURCES } from '../config/sources.js';
import { resolvePodcast } from '../lib/source-resolver.js';

const CONFIG = join(process.cwd(), 'config', 'sources.js');
const FIX = process.argv.includes('--fix');

const bold = s => `\x1b[1m${s}\x1b[0m`;
const dim  = s => `\x1b[2m${s}\x1b[0m`;
const out  = s => process.stdout.write(s);

out(`\n${bold('Podcast verification')}  ${dim(FIX ? 'will correct feed URLs (--fix)' : 'report only')}\n`);
out(`  ${PODCAST_SOURCES.length} shows wired\n\n`);

const results = [];

for (const src of PODCAST_SOURCES) {
  // Verify the WIRED URL first — that is what the app actually fetches.
  const byUrl = await resolvePodcast(src.feedUrl);

  if (byUrl.verified) {
    // The collision check. A feed can be perfectly healthy and be the wrong
    // show, which is the failure this whole design exists to prevent.
    const actual = (byUrl.showTitle || '').toLowerCase();
    const wired  = (src.show || src.label || '').toLowerCase();
    const match  = actual.includes(wired.slice(0, 12)) || wired.includes(actual.slice(0, 12));

    out(`  ${bold(src.label)}\n`);
    out(`    ${match ? 'OK' : bold('TITLE MISMATCH')}  feed says "${byUrl.showTitle}"${match ? '' : `, wired as "${src.show}"`}\n`);
    out(`    ${byUrl.episodeCount} episodes · latest "${byUrl.latestEpisode?.title || '?'}"\n`);
    out(`    notes: ${byUrl.latestEpisode?.notesChars || 0} chars${byUrl.thinNotes ? dim('  (thin — summaries will be brief)') : ''}\n\n`);
    results.push({ src, ok: true, match, result: byUrl });
    continue;
  }

  // The wired URL failed. Ask the directory whether the show moved, but do NOT
  // silently adopt the answer — a different feed is a different show until a
  // human or --fix says otherwise.
  out(`  ${bold(src.label)}\n`);
  out(`    ${bold('FAILED')}  ${byUrl.reason}\n`);

  const byName = await resolvePodcast(src.show || src.label);
  if (byName.verified) {
    out(`    directory has a live feed for this name: "${byName.showTitle}"${byName.publisher ? ` — ${byName.publisher}` : ''}\n`);
    out(`      ${byName.feedUrl}\n`);
    out(`    ${FIX ? 'rewriting config' : dim('re-run with --fix to adopt it')}\n\n`);
    results.push({ src, ok: false, replacement: byName });
  } else {
    out(`    the directory has no live feed for "${src.show || src.label}" either — this needs a human.\n\n`);
    results.push({ src, ok: false, replacement: null });
  }
}

// ── Apply corrections ───────────────────────────────────────────────────────
if (FIX) {
  let text = await readFile(CONFIG, 'utf8');
  let changed = 0;
  for (const r of results) {
    if (r.ok || !r.replacement) continue;
    if (!text.includes(r.src.feedUrl)) continue;
    text = text.replace(r.src.feedUrl, r.replacement.feedUrl);
    changed++;
  }
  // Clear the pending flag only on shows that actually verified.
  for (const r of results) {
    if (!r.ok || !r.match) continue;
    const line = new RegExp(`(feedUrl: '${r.src.feedUrl.replace(/[.*+?^$()|[\]\\]/g, '\\$&')}'[\\s\\S]{0,240}?)\\n\\s*pendingVerification: true,`);
    if (line.test(text)) { text = text.replace(line, '$1'); changed++; }
  }
  if (changed) {
    await writeFile(CONFIG, text, 'utf8');
    out(`${bold(`Applied ${changed} change(s)`)} to config/sources.js.\n`);
  } else {
    out('Nothing to change.\n');
  }
}

// ── Verdict ─────────────────────────────────────────────────────────────────
const good = results.filter(r => r.ok && r.match).length;
const wrongShow = results.filter(r => r.ok && !r.match);
const dead = results.filter(r => !r.ok);

out(`\n${bold(`${good}/${results.length} verified and matching`)}\n`);
if (wrongShow.length) {
  out(`${bold('Wrong show:')} ${wrongShow.map(r => `${r.src.label} → "${r.result.showTitle}"`).join(', ')}\n`);
  out(`  These feeds work but are not the shows they are labelled as. Fix by hand — a\n`);
  out(`  title mismatch is a judgement call, not something a script should decide.\n`);
}
if (dead.length) out(`${bold('Not returning episodes:')} ${dead.map(r => r.src.label).join(', ')}\n`);
out('\n');

// A wrong show is a failure. A dead feed the directory can replace is not, if
// --fix ran.
process.exit(wrongShow.length || (dead.length && !FIX) ? 1 : 0);
