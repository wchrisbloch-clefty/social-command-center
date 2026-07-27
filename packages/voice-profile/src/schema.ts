/**
 * VoiceProfile — the canonical shape of "who I am and how I write".
 *
 * This is a serialization-independent model of the two files the
 * social-media-skills suite reads from a project root: `about-me.md` and
 * `voice.md`. Every field maps to exactly one section heading emitted by the
 * `voice-builder` skill, because those headings are the real contract — 17
 * skills read them. See ./render.ts for the mapping.
 *
 * Zero dependencies. Nothing in this package imports from the host app.
 */

/** Bumped when a migration changes the persisted shape. */
export const VOICE_PROFILE_VERSION = 1;

/**
 * A rule the voice observes, plus the evidence for it.
 *
 * `voice-builder` is emphatic that off-limits and never-does entries come from
 * observed absence across the samples, not from a generic banned-words list
 * ("no em dashes (0 of 5 samples)"). Modelling evidence as a first-class field
 * keeps that discipline enforceable instead of aspirational.
 */
export interface VoiceRule {
  rule: string;
  /** Why this is a rule — ideally an absence count across samples. */
  evidence?: string;
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
  version: number;
  aboutMe: AboutMe;
  voice: Voice;
  /** Optional provenance, so the analysis can be re-run or audited later. */
  samples: WritingSample[];
  /** ISO 8601. Set by the store on write, not by the caller. */
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

/** What a caller supplies to `saveProfile`. The store owns version + updatedAt. */
export type VoiceProfileInput = {
  aboutMe: AboutMeInput;
  voice: VoiceInput;
  samples?: WritingSampleInput[];
};

/** The strict, normalized result of validating a `VoiceProfileInput`. */
export type NormalizedVoiceProfile = Pick<VoiceProfile, 'aboutMe' | 'voice' | 'samples'>;

/** The two rendered files, keyed by the filename each skill expects. */
export interface VoiceFiles {
  'about-me.md': string;
  'voice.md': string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationIssue {
  /** Dot path into the input, e.g. `voice.tone.hits`. */
  path: string;
  message: string;
}

export class VoiceProfileValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    const summary = issues.map((i) => `${i.path}: ${i.message}`).join('; ');
    super(`Invalid voice profile — ${summary}`);
    this.name = 'VoiceProfileValidationError';
    this.issues = issues;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validation is intentionally lenient about *quality* and strict about *shape*.
 *
 * The counts `voice-builder` specifies (3-5 topic pillars, 3-5 tone attributes)
 * are guidance for the interview, not invariants of the data — a half-finished
 * profile still has to round-trip through the store so the UI can save drafts.
 * Anything empty is dropped rather than rejected; only structural violations
 * and a missing `nameAndRole` are hard errors.
 */
class Validator {
  readonly issues: ValidationIssue[] = [];

  str(v: unknown, path: string, { required = false } = {}): string {
    if (typeof v === 'string') return v.trim();
    if (v == null) {
      if (required) this.issues.push({ path, message: 'is required' });
      return '';
    }
    this.issues.push({ path, message: `expected a string, got ${typeof v}` });
    return '';
  }

  strList(v: unknown, path: string): string[] {
    if (v == null) return [];
    if (!Array.isArray(v)) {
      this.issues.push({ path, message: `expected an array, got ${typeof v}` });
      return [];
    }
    return v
      .map((item, i) => this.str(item, `${path}[${i}]`))
      .filter((s) => s.length > 0);
  }

  ruleList(v: unknown, path: string): VoiceRule[] {
    if (v == null) return [];
    if (!Array.isArray(v)) {
      this.issues.push({ path, message: `expected an array, got ${typeof v}` });
      return [];
    }
    const out: VoiceRule[] = [];
    v.forEach((item, i) => {
      const p = `${path}[${i}]`;
      // A bare string is accepted and treated as an evidence-free rule, so
      // hand-written seed data stays cheap to author.
      if (typeof item === 'string') {
        const rule = item.trim();
        if (rule) out.push({ rule });
        return;
      }
      if (!isRecord(item)) {
        this.issues.push({ path: p, message: 'expected a string or { rule, evidence }' });
        return;
      }
      const rule = this.str(item.rule, `${p}.rule`);
      if (!rule) return;
      const evidence = this.str(item.evidence, `${p}.evidence`);
      out.push(evidence ? { rule, evidence } : { rule });
    });
    return out;
  }

  hookList(v: unknown, path: string): HookPattern[] {
    if (v == null) return [];
    if (!Array.isArray(v)) {
      this.issues.push({ path, message: `expected an array, got ${typeof v}` });
      return [];
    }
    const out: HookPattern[] = [];
    v.forEach((item, i) => {
      const p = `${path}[${i}]`;
      if (!isRecord(item)) {
        this.issues.push({ path: p, message: 'expected { type, example }' });
        return;
      }
      const type = this.str(item.type, `${p}.type`);
      if (!type) return;
      out.push({ type, example: this.str(item.example, `${p}.example`) });
    });
    return out;
  }

  samples(v: unknown, path: string): WritingSample[] {
    if (v == null) return [];
    if (!Array.isArray(v)) {
      this.issues.push({ path, message: `expected an array, got ${typeof v}` });
      return [];
    }
    const out: WritingSample[] = [];
    v.forEach((item, i) => {
      const p = `${path}[${i}]`;
      if (typeof item === 'string') {
        const text = item.trim();
        if (text) out.push({ text });
        return;
      }
      if (!isRecord(item)) {
        this.issues.push({ path: p, message: 'expected a string or { label, text }' });
        return;
      }
      const text = this.str(item.text, `${p}.text`);
      if (!text) return;
      const label = this.str(item.label, `${p}.label`);
      out.push(label ? { label, text } : { text });
    });
    return out;
  }
}

/**
 * Validate and normalize arbitrary input into a `VoiceProfileInput`.
 *
 * Throws `VoiceProfileValidationError` with every issue found, not just the
 * first — a form submitting eight bad fields should surface eight messages.
 */
export function parseVoiceProfileInput(input: unknown): NormalizedVoiceProfile {
  const v = new Validator();

  if (!isRecord(input)) {
    throw new VoiceProfileValidationError([
      { path: '', message: `expected an object, got ${input === null ? 'null' : typeof input}` },
    ]);
  }

  const rawAbout = isRecord(input.aboutMe) ? input.aboutMe : {};
  const rawVoice = isRecord(input.voice) ? input.voice : {};
  if (!isRecord(input.aboutMe)) v.issues.push({ path: 'aboutMe', message: 'is required' });
  if (!isRecord(input.voice)) v.issues.push({ path: 'voice', message: 'is required' });

  const rawTone = isRecord(rawVoice.tone) ? rawVoice.tone : {};
  const rawHooks = isRecord(rawVoice.hookPatterns) ? rawVoice.hookPatterns : {};

  const aboutMe: AboutMe = {
    nameAndRole: v.str(rawAbout.nameAndRole, 'aboutMe.nameAndRole', { required: true }),
    audience: v.str(rawAbout.audience, 'aboutMe.audience'),
    topicPillars: v.strList(rawAbout.topicPillars, 'aboutMe.topicPillars'),
    pointOfView: v.str(rawAbout.pointOfView, 'aboutMe.pointOfView'),
    brandPromise: v.str(rawAbout.brandPromise, 'aboutMe.brandPromise'),
    offLimits: v.strList(rawAbout.offLimits, 'aboutMe.offLimits'),
  };

  const voice: Voice = {
    whoISoundLike: v.str(rawVoice.whoISoundLike, 'voice.whoISoundLike'),
    tone: {
      hits: v.strList(rawTone.hits, 'voice.tone.hits'),
      never: v.strList(rawTone.never, 'voice.tone.never'),
    },
    sentenceRhythm: v.str(rawVoice.sentenceRhythm, 'voice.sentenceRhythm'),
    hookPatterns: {
      observed: v.hookList(rawHooks.observed, 'voice.hookPatterns.observed'),
      absent: v.strList(rawHooks.absent, 'voice.hookPatterns.absent'),
    },
    howIOpen: v.str(rawVoice.howIOpen, 'voice.howIOpen'),
    howIClose: v.str(rawVoice.howIClose, 'voice.howIClose'),
    signaturePhrases: v.strList(rawVoice.signaturePhrases, 'voice.signaturePhrases'),
    offLimits: v.ruleList(rawVoice.offLimits, 'voice.offLimits'),
    neverDoes: v.ruleList(rawVoice.neverDoes, 'voice.neverDoes'),
  };

  if (v.issues.length) throw new VoiceProfileValidationError(v.issues);

  return { aboutMe, voice, samples: v.samples(input.samples, 'samples') };
}

/** Validate a fully-formed stored profile (input + version + updatedAt). */
export function parseVoiceProfile(input: unknown): VoiceProfile {
  const base = parseVoiceProfileInput(input);
  const rec = input as Record<string, unknown>;
  const version = typeof rec.version === 'number' ? rec.version : VOICE_PROFILE_VERSION;
  const updatedAt =
    typeof rec.updatedAt === 'string' ? rec.updatedAt : new Date(0).toISOString();

  return {
    version,
    aboutMe: base.aboutMe,
    voice: base.voice,
    samples: base.samples,
    updatedAt,
  };
}

/**
 * True when the profile carries enough signal to be worth injecting into a
 * prompt. A profile with a name and nothing else is worse than none — it
 * spends tokens telling the model almost nothing.
 */
export function isUsable(profile: VoiceProfile | null): boolean {
  if (!profile) return false;
  const { aboutMe, voice } = profile;
  return Boolean(
    aboutMe.nameAndRole &&
      (aboutMe.audience || aboutMe.topicPillars.length) &&
      (voice.whoISoundLike || voice.tone.hits.length)
  );
}
