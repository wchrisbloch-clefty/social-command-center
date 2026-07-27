export {
  VOICE_PROFILE_SCHEMA_VERSION,
  type AboutMe,
  type AboutMeInput,
  type Evidence,
  type HookPattern,
  type NormalizedVoiceProfile,
  type ValidationIssue,
  type Voice,
  type VoiceFiles,
  type VoiceInput,
  type VoiceProfile,
  type VoiceProfileInput,
  type VoiceRule,
  type VoiceRuleInput,
  type WritingSample,
  type WritingSampleInput,
} from './types.ts';

export {
  VoiceProfileValidationError,
  isUsable,
  parseVoiceProfile,
  parseVoiceProfileInput,
} from './validate.ts';

export {
  formatEvidence,
  renderAboutMe,
  renderMarkdown,
  renderSystemPreamble,
  renderVoice,
} from './render.ts';

export {
  VoiceStoreError,
  type MigratableVoiceStore,
  type VoiceStore,
} from './store.ts';

export {
  createPostgresVoiceStore,
  type PostgresVoiceStoreOptions,
  type SqlExecutor,
} from './adapters/postgres.ts';

export {
  createMemoryVoiceStore,
  type MemoryVoiceStoreOptions,
} from './adapters/memory.ts';

// Server-only. Touches node:fs — do not import from a client component.
export {
  renderSyncArtifacts,
  syncVoiceFiles,
  type FileWriter,
  type SyncOptions,
  type SyncResult,
} from './sync.ts';
