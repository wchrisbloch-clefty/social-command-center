/**
 * Contract test against the upstream skill source.
 *
 * The headings in `voice-builder`'s file templates are the actual interface
 * between this package and 17 skills. Nothing enforces them at runtime: rename
 * `## Signature phrases` and every skill keeps working, silently reading a
 * profile with one section it cannot find. This test is what turns that into a
 * red build.
 *
 * It reads the submodule rather than a copied fixture on purpose. A fixture
 * would freeze the contract at the moment it was copied and pass forever after
 * upstream changed — which is precisely the failure it exists to catch.
 *
 * Skipped, not failed, when the submodule is absent: the package is meant to be
 * extractable, and a consumer who vendors it without social-media-skills has no
 * upstream to check against.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { renderMarkdown } from '../src/render.ts';
import { parseVoiceProfileInput } from '../src/validate.ts';
import type { VoiceProfile } from '../src/types.ts';

const SKILL_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../.agents/social-media-skills/skills/voice-builder/SKILL.md'
);

/** Every `#`/`##` line the renderer actually emits, trimmed. */
function renderedHeadings(): string[] {
  // An empty profile is used deliberately: under the placeholder policy every
  // heading is emitted regardless of content, so this reflects the contract
  // rather than whatever the fixture happens to populate.
  const profile: VoiceProfile = {
    ...parseVoiceProfileInput({ aboutMe: { nameAndRole: 'x' }, voice: {} }),
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
  };
  return Object.values(renderMarkdown(profile))
    .flatMap((file) => file.split('\n'))
    .filter((line) => /^#{1,2} /.test(line))
    .map((line) => line.trim());
}

/**
 * Headings inside fenced code blocks only.
 *
 * The skill's own document structure uses `##` too ("## Step 2. Write
 * about-me.md"). Only the fenced templates describe file contents, so the fence
 * state is what separates the contract from the prose around it.
 */
function upstreamHeadings(source: string): string[] {
  const found: string[] = [];
  let inFence = false;
  for (const line of source.split('\n')) {
    if (line.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence && /^#{1,2} /.test(line)) found.push(line.trim());
  }
  return found;
}

const available = existsSync(SKILL_PATH);

test(
  'every heading in voice-builder appears in renderMarkdown output',
  { skip: available ? false : 'social-media-skills submodule not checked out' },
  () => {
    const headings = upstreamHeadings(readFileSync(SKILL_PATH, 'utf8'));

    // Guard the extractor itself. If a refactor upstream moved the templates
    // out of fenced blocks, `headings` would come back empty and every
    // assertion below would vacuously pass.
    assert.ok(
      headings.length >= 15,
      `expected at least 15 headings in the skill templates, found ${headings.length} — ` +
        'the extractor may no longer match upstream file structure'
    );

    // Compared line-for-line, not by substring: `## Off limits` is a substring
    // of nothing else here, but `# About Me` sits at offset 0 of its file and a
    // newline-padded search would miss it.
    const ours = new Set(renderedHeadings());
    const missing = headings.filter((h) => !ours.has(h));
    assert.deepEqual(
      missing,
      [],
      `voice-builder emits headings that renderMarkdown does not:\n  ${missing.join('\n  ')}\n` +
        'Upstream changed its template. Update src/sections.ts to match.'
    );
  }
);

test(
  'renderMarkdown emits no heading that voice-builder does not',
  { skip: available ? false : 'social-media-skills submodule not checked out' },
  () => {
    const headings = new Set(upstreamHeadings(readFileSync(SKILL_PATH, 'utf8')));
    const extra = renderedHeadings().filter((h) => !headings.has(h));
    assert.deepEqual(
      extra,
      [],
      `renderMarkdown invents headings upstream never asked for:\n  ${extra.join('\n  ')}`
    );
  }
);
