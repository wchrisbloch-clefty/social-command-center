/**
 * Postgres adapter — plain SQL, injected driver.
 *
 * There is no `import { sql } from '@vercel/postgres'` here, and there is no
 * `pg` dependency either. The adapter takes a `SqlExecutor` and the host wires
 * whatever driver it likes (node-postgres, postgres.js, Drizzle's raw
 * executor). Three consequences, all of them wanted:
 *
 *   - the package stays at zero runtime dependencies, so it lifts out whole;
 *   - nothing couples to Vercel, so the same code runs against any Postgres;
 *   - tests can pass a fake executor without a database.
 *
 * The target here is Vercel Postgres, which is standard Postgres behind a
 * pooled connection string — nothing below is Vercel-specific.
 */

import {
  VOICE_PROFILE_SCHEMA_VERSION,
  type VoiceFiles,
  type VoiceProfile,
  type VoiceProfileInput,
} from '../types.ts';
import { parseVoiceProfile, parseVoiceProfileInput } from '../validate.ts';
import { renderMarkdown } from '../render.ts';
import { VoiceStoreError, type MigratableVoiceStore } from '../store.ts';

/**
 * The minimum surface this adapter needs from a Postgres driver.
 *
 * Matches node-postgres' `client.query(text, params)` shape, which
 * postgres.js, Drizzle, and most others can satisfy in a one-line wrapper.
 * Parameters are `$1`-style placeholders — never interpolated.
 */
export type SqlExecutor = <R = Record<string, unknown>>(
  text: string,
  params?: readonly unknown[]
) => Promise<{ rows: R[] }>;

export interface PostgresVoiceStoreOptions {
  sql: SqlExecutor;
  /** Defaults to `voice_profile`. Must be a bare identifier. */
  table?: string;
}

/** Guards the one place a caller-supplied string reaches SQL text. */
const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * The schema, as an explicit statement rather than a string buried in a method.
 *
 * Exported so it can be printed, code-reviewed, checked into a migrations
 * directory, or applied by a tool that is not this adapter. `migrate()` runs
 * exactly this and nothing else.
 *
 * `schema_version` is a COLUMN, and the column is authoritative. It is not
 * duplicated inside `data`: the payload holds the profile, the columns hold the
 * metadata about the payload. Keeping the version out of the jsonb means a
 * migration can select and filter on it without unpacking every row, and means
 * there is no second copy to disagree with the first. `getProfile` asserts that
 * separation still holds — see below.
 */
export function voiceProfileDDL(table = 'voice_profile'): string {
  if (!SAFE_IDENTIFIER.test(table)) {
    throw new VoiceStoreError(
      `Unsafe table name ${JSON.stringify(table)} — expected a bare SQL identifier.`
    );
  }
  return `create table if not exists ${table} (
  id             boolean     primary key default true,
  data           jsonb       not null,
  schema_version integer     not null,
  updated_at     timestamptz not null default now(),
  constraint ${table}_singleton check (id)
)`;
}

interface ProfileRow {
  data: unknown;
  schema_version: number;
  updated_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function createPostgresVoiceStore(
  options: PostgresVoiceStoreOptions
): MigratableVoiceStore {
  const { sql } = options;
  const table = options.table ?? 'voice_profile';

  if (!SAFE_IDENTIFIER.test(table)) {
    throw new VoiceStoreError(
      `Unsafe table name ${JSON.stringify(table)} — expected a bare SQL identifier.`
    );
  }

  async function run<R>(what: string, text: string, params?: readonly unknown[]) {
    try {
      return await sql<R>(text, params);
    } catch (cause) {
      throw new VoiceStoreError(`voice-profile: ${what} failed`, cause);
    }
  }

  return {
    /**
     * Apply `voiceProfileDDL()`. Idempotent. Single-tenancy is enforced by the
     * database, not by convention: `id` is a boolean primary key constrained to
     * true, so the table physically cannot hold a second row.
     */
    async migrate(): Promise<void> {
      await run('migrate', voiceProfileDDL(table));
    },

    async getProfile(): Promise<VoiceProfile | null> {
      const { rows } = await run<ProfileRow>(
        'getProfile',
        `select data, schema_version, updated_at from ${table} where id = true`
      );
      const row = rows[0];
      if (!row) return null;

      // The row is validated on the way out, not trusted. It may predate a
      // schema change, or have been edited by hand in a SQL console.
      const data = (row.data ?? {}) as Record<string, unknown>;

      // The column is authoritative and `data` must not carry its own copy. If
      // one appears and disagrees, something wrote this row by a path that is
      // not this adapter, and guessing which value is right would be worse than
      // stopping — the wrong guess silently migrates or fails to migrate real
      // data. Agreement is tolerated so a hand-written seed row is not fatal.
      if ('schemaVersion' in data && data.schemaVersion !== row.schema_version) {
        throw new VoiceStoreError(
          `voice-profile: schema_version column (${row.schema_version}) disagrees with ` +
            `data.schemaVersion (${String(data.schemaVersion)}). The column is ` +
            `authoritative; the payload should not contain the field at all.`
        );
      }

      return parseVoiceProfile({
        ...data,
        schemaVersion: row.schema_version,
        updatedAt: toIso(row.updated_at),
      });
    },

    async saveProfile(input: VoiceProfileInput): Promise<VoiceProfile> {
      // Validate before touching the database, so a bad payload never becomes
      // a partial write.
      const clean = parseVoiceProfileInput(input);
      const payload = {
        aboutMe: clean.aboutMe,
        voice: clean.voice,
        samples: clean.samples,
      };

      const { rows } = await run<ProfileRow>(
        'saveProfile',
        `insert into ${table} (id, data, schema_version, updated_at)
         values (true, $1::jsonb, $2, now())
         on conflict (id) do update
           set data           = excluded.data,
               schema_version = excluded.schema_version,
               updated_at     = excluded.updated_at
         returning data, schema_version, updated_at`,
        [JSON.stringify(payload), VOICE_PROFILE_SCHEMA_VERSION]
      );

      const row = rows[0];
      if (!row) {
        throw new VoiceStoreError('voice-profile: saveProfile returned no row');
      }

      return parseVoiceProfile({
        ...(row.data as Record<string, unknown>),
        schemaVersion: row.schema_version,
        updatedAt: toIso(row.updated_at),
      });
    },

    async renderMarkdown(): Promise<VoiceFiles | null> {
      const profile = await this.getProfile();
      return profile ? renderMarkdown(profile) : null;
    },
  };
}
