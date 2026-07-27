/**
 * Validation and normalization — the loose input shape narrowed to the strict
 * stored shape.
 *
 * Intentionally lenient about *quality* and strict about *structure*. The
 * counts `voice-builder` specifies (3-5 topic pillars, 3-5 tone attributes) are
 * guidance for the interview, not invariants of the data — a half-finished
 * profile still has to round-trip so the UI can save drafts. Empty entries are
 * dropped rather than rejected; only structural violations and a missing
 * `nameAndRole` are hard errors.
 */

import {
  VOICE_PROFILE_SCHEMA_VERSION,
  type AboutMe,
  type Evidence,
  type HookPattern,
  type NormalizedVoiceProfile,
  type ValidationIssue,
  type Voice,
  type VoiceProfile,
  type VoiceRule,
  type WritingSample,
} from './types.ts';

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

  /**
   * Evidence is a measurement, so it is checked like one: whole numbers, a
   * non-zero denominator, and `observed` within `total`. `{observed: 7, total: 5}`
   * is not a rounding error, it is a bug upstream, and letting it through would
   * render "7 of 5 samples" into a file a skill then reads as fact.
   */
  evidence(v: unknown, path: string): Evidence | undefined {
    if (v == null) return undefined;
    if (!isRecord(v)) {
      this.issues.push({
        path,
        message: `expected { observed, total }, got ${Array.isArray(v) ? 'array' : typeof v}`,
      });
      return undefined;
    }

    const num = (raw: unknown, key: string): number | undefined => {
      if (typeof raw !== 'number' || !Number.isInteger(raw)) {
        this.issues.push({ path: `${path}.${key}`, message: 'expected a whole number' });
        return undefined;
      }
      if (raw < 0) {
        this.issues.push({ path: `${path}.${key}`, message: 'cannot be negative' });
        return undefined;
      }
      return raw;
    };

    const observed = num(v.observed, 'observed');
    const total = num(v.total, 'total');
    if (observed === undefined || total === undefined) return undefined;

    if (total < 1) {
      this.issues.push({ path: `${path}.total`, message: 'must be at least 1' });
      return undefined;
    }
    if (observed > total) {
      this.issues.push({
        path,
        message: `observed (${observed}) cannot exceed total (${total})`,
      });
      return undefined;
    }
    return { observed, total };
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
      // A bare string is accepted and treated as an unmeasured rule, so
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
      const evidence = this.evidence(item.evidence, `${p}.evidence`);
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

  sampleList(v: unknown, path: string): WritingSample[] {
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
 * Validate and normalize arbitrary input.
 *
 * Throws `VoiceProfileValidationError` carrying *every* issue found, not just
 * the first — a form submitting eight bad fields should surface eight messages.
 */
export function parseVoiceProfileInput(input: unknown): NormalizedVoiceProfile {
  const v = new Validator();

  if (!isRecord(input)) {
    throw new VoiceProfileValidationError([
      {
        path: '',
        message: `expected an object, got ${input === null ? 'null' : typeof input}`,
      },
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

  const samples = v.sampleList(input.samples, 'samples');

  if (v.issues.length) throw new VoiceProfileValidationError(v.issues);

  return { aboutMe, voice, samples };
}

/**
 * Validate a fully-formed stored profile.
 *
 * Used on the way *out* of a store as well as in: a row may predate a schema
 * change or have been edited by hand in a SQL console, and neither is a reason
 * to hand unvalidated data to a renderer.
 */
export function parseVoiceProfile(input: unknown): VoiceProfile {
  const base = parseVoiceProfileInput(input);
  const rec = input as Record<string, unknown>;

  const schemaVersion =
    typeof rec.schemaVersion === 'number' && Number.isInteger(rec.schemaVersion)
      ? rec.schemaVersion
      : VOICE_PROFILE_SCHEMA_VERSION;

  const updatedAt =
    typeof rec.updatedAt === 'string' && !Number.isNaN(Date.parse(rec.updatedAt))
      ? rec.updatedAt
      : new Date(0).toISOString();

  return {
    schemaVersion,
    aboutMe: base.aboutMe,
    voice: base.voice,
    samples: base.samples,
    updatedAt,
  };
}

/**
 * True when the profile carries enough signal to be worth injecting into a
 * prompt. A profile with a name and nothing else is worse than none — it spends
 * tokens telling the model almost nothing.
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
