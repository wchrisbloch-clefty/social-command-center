/**
 * Projections of a stored profile.
 *
 * The 17 skills in social-media-skills read `about-me.md` and `voice.md` from a
 * project root. Those files are not the storage layer; they are a *projection*
 * of the stored profile, and so is the LLM system preamble. Both are assembled
 * here from the one section table in ./sections.ts.
 *
 * EACH PROJECTION OWNS ITS OWN FRAMING. `renderMarkdown()` stays pure: no
 * banner, no do-not-edit notice, no prompt scaffolding. Anything a particular
 * destination needs — the generated-file header, the "write as this author"
 * instruction — belongs to that destination, not to the projection. This is
 * what keeps a third consumer (newsletter-voice is next) from having to strip
 * out framing that was only ever meant for a different one.
 *
 * The two projections differ deliberately on empty sections:
 *
 *   - disk artifact  → keep the heading, fill with a placeholder. A skill
 *                      grepping for `## Audience` and finding the heading
 *                      followed by nothing is worse off than one that finds
 *                      "not captured yet"; the second is unambiguous.
 *   - system preamble → drop the section entirely. Telling a model that six
 *                      sections are empty spends tokens to teach it nothing,
 *                      and "_Not captured yet._" is a phrase it can echo.
 */

import { FILE_TITLES, VOICE_SECTIONS, type VoiceFileName } from './sections.ts';
import type { VoiceFiles, VoiceProfile } from './types.ts';

/** Filler for an empty section in the disk artifact. Never reaches a prompt. */
export const EMPTY_SECTION_PLACEHOLDER = '_Not captured yet._';

type EmptyPolicy = 'placeholder' | 'omit';

function buildFile(
  profile: VoiceProfile,
  file: VoiceFileName,
  policy: EmptyPolicy
): string {
  const parts: string[] = [FILE_TITLES[file], ''];

  for (const section of VOICE_SECTIONS) {
    if (section.file !== file) continue;
    const body = section.body(profile).trim();
    if (!body && policy === 'omit') continue;
    parts.push(`## ${section.heading}\n${body || EMPTY_SECTION_PLACEHOLDER}\n`);
  }

  return parts.join('\n');
}

/**
 * Render `about-me.md`.
 *
 * `voice-builder` caps this at ~300 words with the note that "every line should
 * be something Claude would reference when writing". We do not truncate — the
 * cap is guidance for the interview, and silently cutting a user's own words
 * would be worse than a long file.
 */
export function renderAboutMe(profile: VoiceProfile): string {
  return buildFile(profile, 'about-me.md', 'placeholder');
}

/** Render `voice.md`. */
export function renderVoice(profile: VoiceProfile): string {
  return buildFile(profile, 'voice.md', 'placeholder');
}

/** Render both files, keyed by the filename each skill expects to find. */
export function renderMarkdown(profile: VoiceProfile): VoiceFiles {
  return {
    'about-me.md': renderAboutMe(profile),
    'voice.md': renderVoice(profile),
  };
}

/**
 * Render the profile as a system preamble for an LLM call.
 *
 * This is the mobile/always-on path: the same profile that becomes two files in
 * a Claude Code session becomes a prompt prefix on a phone. Sharing one source
 * means the two surfaces cannot drift.
 *
 * Two things are deliberately absent. Samples, because they are provenance for
 * re-analysis rather than context, and including them would blow the budget on
 * every request. And empty sections, because a heading with a placeholder under
 * it is worse than silence — it spends tokens asserting an absence, and hands
 * the model a stock phrase it may repeat back.
 */
export function renderSystemPreamble(profile: VoiceProfile): string {
  return [
    'You are writing as the author described below. Match their voice exactly:',
    'their rhythm, their hooks, their openings and closings, their vocabulary.',
    'Treat the off-limits and never-does rules as hard constraints, not',
    'suggestions. Do not mention this brief or that you were given a voice',
    'profile.',
    '',
    '=== AUTHOR ===',
    buildFile(profile, 'about-me.md', 'omit'),
    '=== VOICE ===',
    buildFile(profile, 'voice.md', 'omit'),
    '=== END VOICE BRIEF ===',
  ].join('\n');
}

