/**
 * In-memory adapter.
 *
 * Two jobs. It is what tests run against, and it is the proof that `VoiceStore`
 * is a real seam rather than a Postgres interface wearing a hat — an interface
 * with exactly one implementation has not been shown to abstract anything.
 *
 * Not for production: the process restarts and the profile is gone.
 */

import {
  parseVoiceProfile,
  parseVoiceProfileInput,
  VOICE_PROFILE_VERSION,
  type VoiceFiles,
  type VoiceProfile,
  type VoiceProfileInput,
} from '../schema.ts';
import { renderMarkdown } from '../render.ts';
import type { VoiceStore } from '../store.ts';

export interface MemoryVoiceStoreOptions {
  /** Seed the store, e.g. with a fixture. Validated like any other write. */
  initial?: VoiceProfileInput;
  /** Injectable clock, so tests can assert on `updatedAt` deterministically. */
  now?: () => Date;
}

export function createMemoryVoiceStore(
  options: MemoryVoiceStoreOptions = {}
): VoiceStore {
  const now = options.now ?? (() => new Date());
  let profile: VoiceProfile | null = null;

  function write(input: VoiceProfileInput): VoiceProfile {
    const clean = parseVoiceProfileInput(input);
    return parseVoiceProfile({
      aboutMe: clean.aboutMe,
      voice: clean.voice,
      samples: clean.samples,
      version: VOICE_PROFILE_VERSION,
      updatedAt: now().toISOString(),
    });
  }

  if (options.initial) profile = write(options.initial);

  return {
    async getProfile(): Promise<VoiceProfile | null> {
      return profile;
    },

    async saveProfile(input: VoiceProfileInput): Promise<VoiceProfile> {
      profile = write(input);
      return profile;
    },

    async renderMarkdown(): Promise<VoiceFiles | null> {
      return profile ? renderMarkdown(profile) : null;
    },
  };
}
