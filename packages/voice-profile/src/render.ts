/**
 * Markdown rendering — the bridge back to the file-based world.
 *
 * The 17 skills in social-media-skills read `about-me.md` and `voice.md` from a
 * project root. Those files are not the storage layer; they are a *projection*
 * of the stored profile. This module owns that projection, and the headings
 * below must match `voice-builder`'s output exactly — a skill grepping for
 * "## Signature phrases" gets nothing if we call it "## Phrases".
 */

import type { VoiceFiles, VoiceProfile, VoiceRule } from './schema.ts';

/** Placeholder used when a section has no content, so headings never dangle. */
const EMPTY = '_Not captured yet._';

function section(heading: string, body: string): string {
  return `## ${heading}\n${body.trim() || EMPTY}\n`;
}

function bullets(items: string[]): string {
  return items.length ? items.map((i) => `- ${i}`).join('\n') : '';
}

function ruleBullets(rules: VoiceRule[]): string {
  if (!rules.length) return '';
  return rules
    .map((r) => (r.evidence ? `- ${r.rule} (${r.evidence})` : `- ${r.rule}`))
    .join('\n');
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
  const a = profile.aboutMe;
  return [
    '# About Me',
    '',
    section('Name and role', a.nameAndRole),
    section('Audience', a.audience),
    section('Topic pillars', bullets(a.topicPillars)),
    section('Point of view', a.pointOfView),
    section('Brand promise', a.brandPromise),
    section('Off limits', bullets(a.offLimits)),
  ].join('\n');
}

/** Render `voice.md`. */
export function renderVoice(profile: VoiceProfile): string {
  const v = profile.voice;

  const tone = [
    v.tone.hits.length ? `Hits: ${v.tone.hits.join(', ')}.` : '',
    v.tone.never.length ? `Never: ${v.tone.never.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const hooks = [
    v.hookPatterns.observed.length
      ? v.hookPatterns.observed
          .map((h) => (h.example ? `- **${h.type}** — e.g. "${h.example}"` : `- **${h.type}**`))
          .join('\n')
      : '',
    v.hookPatterns.absent.length
      ? `\nAbsent across all samples: ${v.hookPatterns.absent.join(', ')}.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return [
    '# Voice Profile',
    '',
    section('Who I sound like', v.whoISoundLike),
    section('Tone', tone),
    section('Sentence rhythm', v.sentenceRhythm),
    section('Hook patterns', hooks),
    section('How I open', v.howIOpen),
    section('How I close', v.howIClose),
    section('Signature phrases', bullets(v.signaturePhrases)),
    section('Off-limits', ruleBullets(v.offLimits)),
    section('What this voice never does', ruleBullets(v.neverDoes)),
  ].join('\n');
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
 * Samples are deliberately excluded — they are provenance for re-analysis, not
 * context. Including them would blow the budget on every request.
 */
export function renderSystemPreamble(profile: VoiceProfile): string {
  const files = renderMarkdown(profile);
  return [
    'You are writing as the author described below. Match their voice exactly:',
    'their rhythm, their hooks, their openings and closings, their vocabulary.',
    'Treat the off-limits and never-does rules as hard constraints, not',
    'suggestions. Do not mention this brief or that you were given a voice',
    'profile.',
    '',
    '=== AUTHOR ===',
    files['about-me.md'],
    '=== VOICE ===',
    files['voice.md'],
    '=== END VOICE BRIEF ===',
  ].join('\n');
}
