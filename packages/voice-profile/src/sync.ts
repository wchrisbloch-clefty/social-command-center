/**
 * The write step: store → `about-me.md` + `voice.md` on disk.
 *
 * ONE WAY, ALWAYS. The app database is canonical. These files are build
 * artifacts — regenerated, overwritten without warning, gitignored, and never
 * read back. There is no import path, no merge, no conflict resolution, because
 * there is no second writer. Editing them by hand is not "editing your voice";
 * it is editing a file that the next sync deletes.
 *
 * Server-only: this is the one module in the package that touches `node:fs`.
 * Import it from a script or a route handler, never from a client component.
 */

import { renderMarkdown } from './render.ts';
import { describeSection, missingSections } from './sections.ts';
import type { VoiceStore } from './store.ts';
import type { VoiceFiles, VoiceProfile } from './types.ts';

/** Raised when `requireComplete` is set and the profile has empty sections. */
export class IncompleteProfileError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `Refusing to sync an incomplete profile — ${missing.length} section(s) empty:\n` +
        missing.map((k) => `  - ${describeSection(k)}`).join('\n')
    );
    this.name = 'IncompleteProfileError';
    this.missing = missing;
  }
}

/** Injectable so tests can assert on writes without touching a filesystem. */
export type FileWriter = (absolutePath: string, contents: string) => Promise<void>;

export interface SyncOptions {
  /** Directory to write into — the project root the skills read from. */
  dir: string;
  /** Defaults to `node:fs/promises` `writeFile`, creating nothing else. */
  writeFile?: FileWriter;
  /** Defaults to `path.join`. Overridden only in tests. */
  join?: (dir: string, file: string) => string;
  /**
   * Throw `IncompleteProfileError` instead of writing a profile with empty
   * sections.
   *
   * Off by default: a half-built profile on disk is still more useful to a
   * skill than no file at all, and blocking the first sync of a work in
   * progress would be obnoxious. Callers that would rather not ship a
   * half-voice — a deploy step, a scheduled job — turn it on. Either way
   * `SyncResult.missing` is populated, so a caller that does not opt in still
   * has everything it needs to warn loudly.
   */
  requireComplete?: boolean;
}

export interface SyncResult {
  /** False when the store holds no profile yet; nothing was written. */
  profileFound: boolean;
  /** Absolute paths written, in order. */
  written: string[];
  /** The profile's `updatedAt`, stamped into each banner. */
  updatedAt?: string;
  /**
   * Section keys that rendered empty. Always populated when a profile was
   * found, whether or not `requireComplete` was set — the caller decides how
   * loud to be about it. Pass each through `describeSection()` for a
   * human-readable `voice.md § Tone`.
   */
  missing: string[];
}

/**
 * Prepended to every generated file.
 *
 * Deliberately *not* part of `renderMarkdown`: the projection stays pure so the
 * same function can feed an LLM preamble without shipping it a do-not-edit
 * notice. The banner belongs to the artifact, not to the content.
 *
 * An HTML comment because markdown hides it from readers but every skill
 * reading raw text still sees it — which is the point. Anyone who opens the
 * file to edit it gets told, in the first line, not to.
 */
function banner(file: string, profile: VoiceProfile): string {
  return [
    '<!--',
    `  ${file} — GENERATED FILE. Do not edit.`,
    '',
    '  The app database is the source of truth for this content. This file is a',
    '  one-way projection of it and will be overwritten on the next sync.',
    '  To change it, edit the voice profile in the app, then re-run the sync.',
    '',
    `  schemaVersion: ${profile.schemaVersion}`,
    `  profile updated: ${profile.updatedAt}`,
    '-->',
    '',
  ].join('\n');
}

/** Render with banners applied. Exported so callers can preview without writing. */
export function renderSyncArtifacts(profile: VoiceProfile): VoiceFiles {
  const files = renderMarkdown(profile);
  return {
    'about-me.md': banner('about-me.md', profile) + files['about-me.md'],
    'voice.md': banner('voice.md', profile) + files['voice.md'],
  };
}

async function defaultWriteFile(absolutePath: string, contents: string): Promise<void> {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(absolutePath, contents, 'utf8');
}

async function nodeJoin(): Promise<(dir: string, file: string) => string> {
  const { join } = await import('node:path');
  return join;
}

/**
 * Project the stored profile onto disk.
 *
 * Writes nothing when there is no profile. It does not delete stale files in
 * that case either: an empty database is far more likely to mean "not set up
 * yet" than "deliberately cleared", and destroying a working author's files on
 * a bad connection string would be an unforced error.
 */
export async function syncVoiceFiles(
  store: VoiceStore,
  options: SyncOptions
): Promise<SyncResult> {
  const profile = await store.getProfile();
  if (!profile) return { profileFound: false, written: [], missing: [] };

  const missing = missingSections(profile);
  if (missing.length && options.requireComplete) {
    throw new IncompleteProfileError(missing);
  }

  const write = options.writeFile ?? defaultWriteFile;
  const join = options.join ?? (await nodeJoin());

  const artifacts = renderSyncArtifacts(profile);
  const written: string[] = [];

  for (const file of ['about-me.md', 'voice.md'] as const) {
    const target = join(options.dir, file);
    await write(target, artifacts[file]);
    written.push(target);
  }

  return { profileFound: true, written, updatedAt: profile.updatedAt, missing };
}
