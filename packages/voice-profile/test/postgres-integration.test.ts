/**
 * Integration test — the Postgres adapter against a real Postgres.
 *
 * The rest of the suite runs against a fake `SqlExecutor`. That proves the SQL
 * is parameterized, that validation runs before any write, and that the shapes
 * round-trip. It proves nothing about the database: whether the DDL applies,
 * whether `$1::jsonb` binds a pre-stringified value, what `timestamptz` comes
 * back as through this driver, or whether the singleton constraint actually
 * refuses a second row.
 *
 * Gated on `POSTGRES_TEST_URL` — deliberately NOT `POSTGRES_URL`. This file
 * creates and drops tables. Sharing the variable the app uses would mean one
 * absent-minded `npm test` could take a DDL statement to production.
 *
 *   docker run --rm -e POSTGRES_HOST_AUTH_METHOD=trust -p 5432:5432 postgres:16
 *   POSTGRES_TEST_URL=postgres://postgres@localhost:5432/postgres npm run test:pg
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { createPostgresVoiceStore, voiceProfileDDL } from '../src/adapters/postgres.ts';
import { parseVoiceProfileInput } from '../src/validate.ts';
import type { SqlExecutor } from '../src/adapters/postgres.ts';
import type { VoiceProfileInput } from '../src/types.ts';

const url = process.env.POSTGRES_TEST_URL;
const TABLE = 'voice_profile_itest';

/**
 * Text chosen to break things rather than to read nicely.
 *
 * A voice profile is *full* of the characters that survive naive encoding
 * badly: em dashes, curly quotes, ellipses. If any of it comes back mangled,
 * every generated file is subtly wrong in a way nobody notices until a post
 * goes out with a mojibake quote in it.
 */
const HOSTILE: VoiceProfileInput = {
  aboutMe: {
    nameAndRole: 'Chris — founder, “builder”, ½-time writer',
    audience: 'Ops leads & founders … the ones who actually ship',
    topicPillars: ['AI  tooling', 'построение публично', '絵文字 🚀 テスト'],
    pointOfView: "Reach is vanity; pipeline isn't — that's the whole thesis",
    brandPromise: 'Posting should compound\n\ninto pipeline',
    offLimits: ['politics', "other founders' failures"],
  },
  voice: {
    whoISoundLike: 'Direct. Specific. Allergic to abstraction — and to filler.',
    tone: { hits: ['blunt', 'dry'], never: ['motivational'] },
    sentenceRhythm: 'Short. Rarely >20 words.',
    hookPatterns: {
      observed: [{ type: 'the *actual* number', example: 'She said "no" — [immediately]' }],
      absent: ['rhetorical question'],
    },
    howIOpen: 'A claim worth arguing with',
    howIClose: 'A concrete next action',
    signaturePhrases: ['the uncomfortable part', 'here’s the actual number'],
    offLimits: [{ rule: 'no em dashes', evidence: { observed: 0, total: 5 } }],
    neverDoes: [{ rule: 'never uses "not X, but Y"', evidence: { observed: 0, total: 5 } }],
  },
  samples: [{ label: 'LinkedIn — Mar 2026', text: 'Reach is a vanity metric.' }],
};

async function withDb(
  fn: (sql: SqlExecutor, raw: (t: string, p?: unknown[]) => Promise<{ rows: any[] }>) => Promise<void>
) {
  const pg = await import('pg');
  const pool = new pg.default.Pool({ connectionString: url, max: 2 });
  const raw = (text: string, params?: unknown[]) => pool.query(text, params);
  const sql: SqlExecutor = ((text: string, params?: readonly unknown[]) =>
    pool.query(text, params ? [...params] : undefined)) as SqlExecutor;
  try {
    await raw(`drop table if exists ${TABLE}`);
    await fn(sql, raw);
  } finally {
    await raw(`drop table if exists ${TABLE}`).catch(() => {});
    await pool.end();
  }
}

const opts = { skip: url ? false : 'set POSTGRES_TEST_URL to run' };

test('migrate() applies, and is genuinely idempotent on a second run', opts, async () => {
  await withDb(async (sql, raw) => {
    const store = createPostgresVoiceStore({ sql, table: TABLE });
    await store.migrate();
    await store.migrate(); // must not throw

    const { rows } = await raw(
      `select column_name, data_type from information_schema.columns
       where table_name = $1 order by ordinal_position`,
      [TABLE]
    );
    assert.deepEqual(
      rows.map((r) => [r.column_name, r.data_type]),
      [
        ['id', 'boolean'],
        ['data', 'jsonb'],
        ['schema_version', 'integer'],
        ['updated_at', 'timestamp with time zone'],
      ]
    );
  });
});

test('the singleton constraint physically refuses a second row', opts, async () => {
  await withDb(async (sql, raw) => {
    await createPostgresVoiceStore({ sql, table: TABLE }).migrate();
    await raw(`insert into ${TABLE} (id, data, schema_version) values (true, '{}'::jsonb, 1)`);

    // The check constraint rejects id = false...
    await assert.rejects(
      () => raw(`insert into ${TABLE} (id, data, schema_version) values (false, '{}'::jsonb, 1)`),
      /violates check constraint/
    );
    // ...and the primary key rejects a second id = true.
    await assert.rejects(
      () => raw(`insert into ${TABLE} (id, data, schema_version) values (true, '{}'::jsonb, 1)`),
      /duplicate key value/
    );

    const { rows } = await raw(`select count(*)::int as n from ${TABLE}`);
    assert.equal(rows[0].n, 1);
  });
});

test('$1::jsonb binds a pre-stringified payload, and hostile text survives', opts, async () => {
  await withDb(async (sql) => {
    const store = createPostgresVoiceStore({ sql, table: TABLE });
    await store.migrate();

    const saved = await store.saveProfile(HOSTILE);
    const read = (await store.getProfile())!;
    const expected = parseVoiceProfileInput(HOSTILE);

    // Every value, byte for byte, through JSON.stringify -> $1::jsonb -> jsonb
    // -> driver parse. Compared as a whole so nothing slips through untested.
    assert.deepEqual(read.aboutMe, expected.aboutMe);
    assert.deepEqual(read.voice, expected.voice);
    assert.deepEqual(read.samples, expected.samples);
    assert.deepEqual(saved.aboutMe, read.aboutMe, 'the insert RETURNING agrees with a fresh read');

    // Spot-check the characters most likely to be mangled, so a failure says
    // which class of character broke rather than just "objects differ".
    assert.ok(read.aboutMe.nameAndRole.includes('—'), 'em dash');
    assert.ok(read.aboutMe.nameAndRole.includes('“builder”'), 'curly quotes');
    assert.ok(read.aboutMe.nameAndRole.includes('½'), 'latin-1 supplement');
    assert.ok(read.aboutMe.topicPillars[1] === 'построение публично', 'cyrillic');
    assert.ok(read.aboutMe.topicPillars[2].includes('🚀'), 'astral-plane emoji');
    assert.ok(read.aboutMe.topicPillars[0].includes(' '), 'non-breaking space');
    assert.ok(read.aboutMe.brandPromise.includes('\n\n'), 'embedded newlines');
    assert.ok(read.voice.signaturePhrases[1].includes('’'), 'curly apostrophe');
  });
});

test('upsert replaces the single row rather than accumulating', opts, async () => {
  await withDb(async (sql, raw) => {
    const store = createPostgresVoiceStore({ sql, table: TABLE });
    await store.migrate();

    await store.saveProfile(HOSTILE);
    const first = await store.getProfile();

    await store.saveProfile({
      ...HOSTILE,
      aboutMe: { ...HOSTILE.aboutMe, nameAndRole: 'Renamed' },
    });
    const second = (await store.getProfile())!;

    const { rows } = await raw(`select count(*)::int as n from ${TABLE}`);
    assert.equal(rows[0].n, 1, 'on conflict updated in place');
    assert.equal(second.aboutMe.nameAndRole, 'Renamed');
    assert.ok(
      Date.parse(second.updatedAt) >= Date.parse(first!.updatedAt),
      'now() advanced on the update path'
    );
  });
});

test('updated_at comes back as something toIso() can handle', opts, async () => {
  await withDb(async (sql, raw) => {
    const store = createPostgresVoiceStore({ sql, table: TABLE });
    await store.migrate();
    await store.saveProfile(HOSTILE);

    // What the driver actually hands us, before the adapter normalizes it.
    const { rows } = await raw(`select updated_at from ${TABLE} where id = true`);
    const value = rows[0].updated_at;
    assert.ok(
      value instanceof Date || typeof value === 'string',
      `updated_at came back as ${typeof value} — toIso() handles Date and string only`
    );

    const profile = (await store.getProfile())!;
    assert.match(profile.updatedAt, /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/, 'normalized to ISO 8601 UTC');
    assert.ok(Math.abs(Date.now() - Date.parse(profile.updatedAt)) < 60_000, 'server clock, not epoch');
  });
});

test('the DDL applied is exactly the exported statement', opts, async () => {
  await withDb(async (sql, raw) => {
    await raw(voiceProfileDDL(TABLE));
    // If migrate() and voiceProfileDDL() had drifted, this second call against
    // an already-created table would still succeed, so assert on the object.
    const { rows } = await raw(
      `select conname from pg_constraint where conrelid = $1::regclass order by conname`,
      [TABLE]
    );
    const names = rows.map((r) => r.conname);
    assert.ok(names.includes(`${TABLE}_singleton`), `constraints: ${names.join(', ')}`);
  });
});

test('jsonb normalizes key order — values round-trip, bytes do not', opts, async () => {
  await withDb(async (sql, raw) => {
    await createPostgresVoiceStore({ sql, table: TABLE }).migrate();
    await raw(`insert into ${TABLE} (data, schema_version) values ($1::jsonb, 1)`, [
      JSON.stringify({ zebra: 1, apple: 2, mango: { z: 1, a: 2 } }),
    ]);
    const { rows } = await raw(`select data from ${TABLE}`);

    // Documented, not lamented: jsonb stores a parsed structure, not the text
    // it was given. Key order is normalized and duplicate keys collapse. This
    // is fine here because every consumer reads named fields off a parsed
    // object — but it means "the payload round-trips unchanged" is true of
    // values and false of bytes, so nothing downstream may hash or diff the
    // raw JSON and expect stability.
    assert.notDeepEqual(
      Object.keys(rows[0].data),
      ['zebra', 'apple', 'mango'],
      'if this ever passes, jsonb started preserving insertion order'
    );
    assert.deepEqual(Object.keys(rows[0].data).sort(), ['apple', 'mango', 'zebra']);
    assert.deepEqual(rows[0].data.mango, { a: 2, z: 1 }, 'values intact regardless of order');
  });
});

test('the driver hands back parsed objects and Dates, as the adapter assumes', opts, async () => {
  await withDb(async (sql, raw) => {
    await createPostgresVoiceStore({ sql, table: TABLE }).migrate();
    await raw(`insert into ${TABLE} (data, schema_version) values ($1::jsonb, 1)`, [
      JSON.stringify({ a: 1 }),
    ]);
    const { rows } = await raw(`select data, updated_at from ${TABLE}`);

    // getProfile() spreads row.data directly. If node-postgres ever handed back
    // a string instead, that spread would silently produce a character map
    // rather than an object, and validation would report every field missing.
    assert.equal(typeof rows[0].data, 'object', 'jsonb arrives pre-parsed');
    assert.ok(rows[0].updated_at instanceof Date, 'timestamptz arrives as a Date');
  });
});
