#!/usr/bin/env node
/**
 * Project the stored voice profile onto disk as about-me.md + voice.md.
 *
 *   npm run voice:sync
 *
 * ONE WAY. The database is canonical; these files are build artifacts and are
 * gitignored. Run this after editing the profile in the app, and before opening
 * a Claude Code session that needs the skills to see your voice.
 *
 * Reads POSTGRES_URL (Vercel's pooled connection string) or DATABASE_URL.
 * This is the only place a database driver is imported — voice-profile-core
 * takes an injected executor and depends on nothing.
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

import { createPostgresVoiceStore } from '../packages/voice-profile/src/adapters/postgres.ts';
import { describeSection } from '../packages/voice-profile/src/sections.ts';
import { syncVoiceFiles } from '../packages/voice-profile/src/sync.ts';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    'voice:sync — no database configured.\n' +
      '  Set POSTGRES_URL (Vercel → Storage → Postgres → .env.local) or DATABASE_URL.'
  );
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, max: 1 });

try {
  const store = createPostgresVoiceStore({
    // The one-line adapter between node-postgres and SqlExecutor.
    sql: (text, params) => pool.query(text, params ? [...params] : undefined),
  });

  // Warn rather than refuse: a partial profile on disk still beats no file at
  // all, and this is the interactive path. Pass --require-complete in a deploy
  // step or a scheduled job, where shipping half a voice is the worse outcome.
  const result = await syncVoiceFiles(store, {
    dir: projectRoot,
    requireComplete: process.argv.includes('--require-complete'),
  });

  if (!result.profileFound) {
    console.error(
      'voice:sync — no profile stored yet. Build one in the app first (Settings → Voice).'
    );
    process.exit(1);
  }

  // Read back what landed, so the report reflects the filesystem rather than
  // our intent. A silent write failure is the failure mode worth catching here.
  for (const path of result.written) {
    const bytes = (await readFile(path, 'utf8')).length;
    console.log(`  wrote ${path.replace(projectRoot + '/', '')} (${bytes} bytes)`);
  }
  if (result.missing.length) {
    console.warn(
      `\nvoice:sync — WARNING: ${result.missing.length} section(s) are empty and were ` +
        'written as placeholders:'
    );
    for (const key of result.missing) console.warn(`    ${describeSection(key)}`);
    console.warn('  Fill these in the app, then re-run. Re-run with --require-complete to fail instead.\n');
  }

  console.log(`voice:sync — done. Profile last updated ${result.updatedAt}.`);
} catch (error) {
  console.error('voice:sync — failed.');
  console.error(error instanceof Error ? error.message : error);
  if (error && typeof error === 'object' && 'cause' in error && error.cause) {
    console.error('  cause:', error.cause);
  }
  process.exitCode = 1;
} finally {
  await pool.end();
}
