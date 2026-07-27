/**
 * VoiceStore — the persistence seam.
 *
 * Deliberately has no id parameter anywhere. This deployment is single-tenant:
 * there is exactly one profile, and an interface that cannot express "which
 * profile" cannot grow an accidental multi-tenant code path. When multi-tenancy
 * is genuinely wanted, that is a new interface and a visible migration, not a
 * quiet extra argument.
 *
 * Adapters live in ./adapters/*. Nothing here knows about Postgres, Vercel, or
 * the host app.
 */

import type { VoiceFiles, VoiceProfile, VoiceProfileInput } from './types.ts';

export interface VoiceStore {
  /** The stored profile, or null if none has been saved yet. */
  getProfile(): Promise<VoiceProfile | null>;

  /**
   * Validate and persist. Returns the stored profile, including the
   * `updatedAt` and `schemaVersion` the store assigned.
   *
   * Throws `VoiceProfileValidationError` if the input is structurally invalid.
   */
  saveProfile(input: VoiceProfileInput): Promise<VoiceProfile>;

  /**
   * The profile projected into `about-me.md` + `voice.md`, or null if there is
   * no profile yet.
   *
   * On the interface rather than left to callers because every consumer wants
   * the same projection, and one of them writing its own would be the moment
   * the two surfaces start to drift.
   */
  renderMarkdown(): Promise<VoiceFiles | null>;
}

/** Thrown when the backing store itself fails — connection, query, migration. */
export class VoiceStoreError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'VoiceStoreError';
    this.cause = cause;
  }
}

/**
 * A store that can prepare its own backing schema.
 *
 * Separate from `VoiceStore` because it is an operational concern: the memory
 * adapter has nothing to migrate, and callers that only read should not be
 * handed a method that can alter the database.
 */
export interface MigratableVoiceStore extends VoiceStore {
  migrate(): Promise<void>;
}
