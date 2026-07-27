/**
 * The section table — the single definition of what a projection contains.
 *
 * Every section appears exactly once, with its heading, its file, and the
 * function that renders its body. Both consumers derive from this table:
 *
 *   - ./render.ts assembles files and preambles from it
 *   - `missingSections()` below reports which bodies came back empty
 *
 * That is the point of collapsing them into one table. A section is "missing"
 * precisely when its body renders empty — there is no second list of
 * requiredness to fall out of sync with the first, and adding a section to the
 * profile cannot leave it silently unchecked.
 */

import type { Evidence, VoiceProfile, VoiceRule } from './types.ts';

/**
 * `{ observed: 0, total: 5 }` → `0 of 5 samples`.
 *
 * The exact phrasing `voice-builder` uses in its own examples. The structured
 * form is what gets stored; this is the only place it becomes prose.
 */
export function formatEvidence(evidence: Evidence): string {
  const noun = evidence.total === 1 ? 'sample' : 'samples';
  return `${evidence.observed} of ${evidence.total} ${noun}`;
}

/**
 * Escape the characters that would otherwise be read as markdown structure.
 *
 * Applied where the renderer wraps user text in markup — `**bold**` around a
 * hook type, `"quotes"` around an example. A `*` in a hook type called
 * `the *actual* number` would close the bold early and mangle the rest of the
 * line; a `"` in an example ends the quotation early. Backslash goes first, or
 * it escapes the escapes.
 *
 * Bare bullet text is deliberately left alone: `- some *emphasis*` renders as
 * italics, which is cosmetic, not structural.
 */
export function escapeInline(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/([*_`[\]"])/g, '\\$1');
}

function bullets(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n');
}

function ruleBullets(rules: VoiceRule[]): string {
  return rules
    .map((r) => (r.evidence ? `- ${r.rule} (${formatEvidence(r.evidence)})` : `- ${r.rule}`))
    .join('\n');
}

/** Which generated file a section belongs to. */
export type VoiceFileName = 'about-me.md' | 'voice.md';

export interface VoiceSection {
  /** Stable identifier, matching the field path in `VoiceProfile`. */
  key: string;
  file: VoiceFileName;
  /**
   * The exact `## ` text, verbatim from `voice-builder`'s templates.
   *
   * Note `Off limits` (about-me.md) vs `Off-limits` (voice.md). That
   * inconsistency is upstream's, mirrored here on purpose — matching their
   * spelling is the whole job.
   */
  heading: string;
  body: (profile: VoiceProfile) => string;
}

/** The H1 each file opens with, also verbatim from upstream's templates. */
export const FILE_TITLES: Record<VoiceFileName, string> = {
  'about-me.md': '# About Me',
  'voice.md': '# Voice Profile',
};

export const VOICE_SECTIONS: readonly VoiceSection[] = [
  {
    key: 'aboutMe.nameAndRole',
    file: 'about-me.md',
    heading: 'Name and role',
    body: (p) => p.aboutMe.nameAndRole,
  },
  {
    key: 'aboutMe.audience',
    file: 'about-me.md',
    heading: 'Audience',
    body: (p) => p.aboutMe.audience,
  },
  {
    key: 'aboutMe.topicPillars',
    file: 'about-me.md',
    heading: 'Topic pillars',
    body: (p) => bullets(p.aboutMe.topicPillars),
  },
  {
    key: 'aboutMe.pointOfView',
    file: 'about-me.md',
    heading: 'Point of view',
    body: (p) => p.aboutMe.pointOfView,
  },
  {
    key: 'aboutMe.brandPromise',
    file: 'about-me.md',
    heading: 'Brand promise',
    body: (p) => p.aboutMe.brandPromise,
  },
  {
    key: 'aboutMe.offLimits',
    file: 'about-me.md',
    heading: 'Off limits',
    body: (p) => bullets(p.aboutMe.offLimits),
  },
  {
    key: 'voice.whoISoundLike',
    file: 'voice.md',
    heading: 'Who I sound like',
    body: (p) => p.voice.whoISoundLike,
  },
  {
    key: 'voice.tone',
    file: 'voice.md',
    heading: 'Tone',
    body: (p) =>
      [
        p.voice.tone.hits.length ? `Hits: ${p.voice.tone.hits.join(', ')}.` : '',
        p.voice.tone.never.length ? `Never: ${p.voice.tone.never.join(', ')}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
  },
  {
    key: 'voice.sentenceRhythm',
    file: 'voice.md',
    heading: 'Sentence rhythm',
    body: (p) => p.voice.sentenceRhythm,
  },
  {
    key: 'voice.hookPatterns',
    file: 'voice.md',
    heading: 'Hook patterns',
    body: (p) =>
      [
        p.voice.hookPatterns.observed
          .map((h) =>
            h.example
              ? `- **${escapeInline(h.type)}** — e.g. "${escapeInline(h.example)}"`
              : `- **${escapeInline(h.type)}**`
          )
          .join('\n'),
        p.voice.hookPatterns.absent.length
          ? `\nAbsent across all samples: ${p.voice.hookPatterns.absent.join(', ')}.`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
  },
  {
    key: 'voice.howIOpen',
    file: 'voice.md',
    heading: 'How I open',
    body: (p) => p.voice.howIOpen,
  },
  {
    key: 'voice.howIClose',
    file: 'voice.md',
    heading: 'How I close',
    body: (p) => p.voice.howIClose,
  },
  {
    key: 'voice.signaturePhrases',
    file: 'voice.md',
    heading: 'Signature phrases',
    body: (p) => bullets(p.voice.signaturePhrases),
  },
  {
    key: 'voice.offLimits',
    file: 'voice.md',
    heading: 'Off-limits',
    body: (p) => ruleBullets(p.voice.offLimits),
  },
  {
    key: 'voice.neverDoes',
    file: 'voice.md',
    heading: 'What this voice never does',
    body: (p) => ruleBullets(p.voice.neverDoes),
  },
];

/**
 * Which sections have no content, as stable `key`s.
 *
 * Derived on every call, never stored. A stored completeness flag is a second
 * source of truth that goes stale the moment someone writes to the profile by
 * another path; recomputing costs nothing and cannot lie.
 */
export function missingSections(profile: VoiceProfile): string[] {
  return VOICE_SECTIONS.filter((s) => s.body(profile).trim() === '').map((s) => s.key);
}

/** `voice.tone` → `voice.md § Tone`. For human-facing warnings. */
export function describeSection(key: string): string {
  const section = VOICE_SECTIONS.find((s) => s.key === key);
  return section ? `${section.file} § ${section.heading}` : key;
}
