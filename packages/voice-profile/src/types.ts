/**
 * VoiceProfile — the canonical shape of "who I am and how I write".
 *
 * Types only. No logic, no I/O, no imports. Validation lives in ./validate.ts,
 * projection in ./render.ts, persistence in ./adapters/*.
 *
 * This is a serialization-independent model of the two files the
 * social-media-skills suite reads from a project root: `about-me.md` and
 * `voice.md`. Every field maps to exactly one section heading emitted by the
 * `voice-builder` skill, because those headings are the real contract — 17
 * skills read them. See ./render.ts for the mapping.
 */

/**
 * Bumped when a persisted shape changes in a way a reader must know about.
 *
 * Stored alongside every row as `schemaVersion`, so a future migration can tell
 * a v1 payload from a v2 one without guessing from its shape. Cheap now,
 * impossible to add retroactively once there is data in the table.
 */
export const VOICE_PROFILE_SCHEMA_VERSION = 1;

/**
 * Why a rule is a rule, as a count rather than a sentence.
 *
 * `voice-builder` is emphatic that off-limits and never-does entries come from
 * observed absence across the samples, not from a generic banned-words list —
 * "no em dashes (0 of 5 samples)". Storing that as free text makes it a claim;
 * storing it as `{ observed: 0, total: 5 }` makes it a measurement. The
 * rendered string is identical either way, but only the structured form can be
 * recomputed when the sample set changes, filtered on, or checked for staleness.
 */
export interface Evidence {
  /** How many samples exhibited the behaviour. Usually 0 for an absence rule. */
  observed: number;
  /** How many samples were examined. Must be >= 1 and >= `observed`. */
  total: number;
}

/** A rule the voice observes, plus the evidence for it. */
export interface VoiceRule {
  rule: string;
  /** Omitted when the rule was asserted by the author rather than measured. */
  evidence?: Evidence;
}

/** A hook type observed across samples, with one concrete instance. */
export interface HookPattern {
  type: string;
  example: string;
}

/** Provenance for the analysis: the writing the profile was derived from. */
export interface WritingSample {
  /** Free-form label: "LinkedIn, Mar 2026", "newsletter #14". */
  label?: string;
  text: string;
}

/** Maps 1:1 to the six `about-me.md` sections. */
export interface AboutMe {
  /** "## Name and role" */
  nameAndRole: string;
  /** "## Audience" — 2-3 sentences on who the reader is. */
  audience: string;
  /** "## Topic pillars" — 3 to 5, one line each. */
  topicPillars: string[];
  /** "## Point of view" — the contrarian or distinctive belief. */
  pointOfView: string;
  /** "## Brand promise" — the one thought to own in the reader's head. */
  brandPromise: string;
  /** "## Off limits" — topics or angles never to write about. */
  offLimits: string[];
}

/**
 * Maps 1:1 to the nine `voice.md` sections.
 *
 * Deliberately carries no audience or topic pillars: `voice-builder` forbids
 * duplicating those from `about-me.md`, and a shape that cannot express the
 * duplication cannot drift into it.
 */
export interface Voice {
  /** "## Who I sound like" — 2-3 sentences, plain language. */
  whoISoundLike: string;
  /** "## Tone" — attributes the voice hits, and tones it never hits. */
  tone: {
    hits: string[];
    never: string[];
  };
  /** "## Sentence rhythm" — length, pacing, paragraph structure. */
  sentenceRhythm: string;
  /** "## Hook patterns" — observed types, plus types absent everywhere. */
  hookPatterns: {
    observed: HookPattern[];
    absent: string[];
  };
  /** "## How I open" */
  howIOpen: string;
  /** "## How I close" — include CTA style. */
  howIClose: string;
  /** "## Signature phrases" */
  signaturePhrases: string[];
  /** "## Off-limits" — words, punctuation, constructions absent from samples. */
  offLimits: VoiceRule[];
  /** "## What this voice never does" — 3 to 5 specific behaviours. */
  neverDoes: VoiceRule[];
}

/** A stored, validated profile. */
export interface VoiceProfile {
  /** Which version of this schema the payload conforms to. */
  schemaVersion: number;
  aboutMe: AboutMe;
  voice: Voice;
  /** Provenance, so the analysis can be re-run or audited later. */
  samples: WritingSample[];
  /**
   * ISO 8601, assigned by the store on write — never by the caller.
   *
   * Load-bearing beyond bookkeeping: it is what the markdown sync stamps into
   * its banner, and what tells you whether the files on disk are stale.
   */
  updatedAt: string;
}

// ─── Input shapes ─────────────────────────────────────────────────────────────
//
// Input is deliberately looser than storage. A rule may be written as a bare
// string when there is no evidence to attach, and every field except the
// author's name may be omitted so a half-finished interview can still be saved
// as a draft. `parseVoiceProfileInput` narrows the loose form to the strict one;
// these types exist so callers get that latitude from the compiler too, rather
// than discovering it only at runtime.

export type VoiceRuleInput = string | VoiceRule;
export type WritingSampleInput = string | WritingSample;

export interface AboutMeInput {
  nameAndRole: string;
  audience?: string;
  topicPillars?: string[];
  pointOfView?: string;
  brandPromise?: string;
  offLimits?: string[];
}

export interface VoiceInput {
  whoISoundLike?: string;
  tone?: { hits?: string[]; never?: string[] };
  sentenceRhythm?: string;
  hookPatterns?: { observed?: HookPattern[]; absent?: string[] };
  howIOpen?: string;
  howIClose?: string;
  signaturePhrases?: string[];
  offLimits?: VoiceRuleInput[];
  neverDoes?: VoiceRuleInput[];
}

/**
 * What a caller supplies to `saveProfile`.
 *
 * Note what is absent: `schemaVersion` and `updatedAt`. Both are the store's to
 * assign, and accepting them from a caller would let a client backdate a write
 * or claim a schema version it does not conform to.
 */
export type VoiceProfileInput = {
  aboutMe: AboutMeInput;
  voice: VoiceInput;
  samples?: WritingSampleInput[];
};

/** The strict, normalized result of validating a `VoiceProfileInput`. */
export type NormalizedVoiceProfile = Pick<
  VoiceProfile,
  'aboutMe' | 'voice' | 'samples'
>;

/** The two rendered files, keyed by the filename each skill expects. */
export interface VoiceFiles {
  'about-me.md': string;
  'voice.md': string;
}

/** One structural problem found while validating. */
export interface ValidationIssue {
  /** Dot path into the input, e.g. `voice.tone.hits[0].evidence`. */
  path: string;
  message: string;
}
