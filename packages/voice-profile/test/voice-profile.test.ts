import assert from 'node:assert/strict';
import test from 'node:test';

import {
  VoiceProfileValidationError,
  createMemoryVoiceStore,
  createPostgresVoiceStore,
  formatEvidence,
  isUsable,
  parseVoiceProfile,
  parseVoiceProfileInput,
  renderMarkdown,
  renderSyncArtifacts,
  renderSystemPreamble,
  syncVoiceFiles,
  type SqlExecutor,
  type VoiceProfile,
  type VoiceProfileInput,
} from '../src/index.ts';

const FIXTURE: VoiceProfileInput = {
  aboutMe: {
    nameAndRole: 'Chris Bloch, founder',
    audience: 'Founders and operators who post to build a pipeline.',
    topicPillars: ['AI tooling', 'Building in public', 'Personal brand'],
    pointOfView: 'Most content advice optimizes for reach, not revenue.',
    brandPromise: 'Posting should compound into pipeline, not applause.',
    offLimits: ['Politics', 'Hot takes on other founders'],
  },
  voice: {
    whoISoundLike: 'Direct, specific, allergic to abstraction.',
    tone: { hits: ['blunt', 'concrete', 'dry'], never: ['motivational', 'breathless'] },
    sentenceRhythm: 'Short declaratives. Rarely over 20 words. Blank line between beats.',
    hookPatterns: {
      observed: [
        { type: 'counterintuitive claim', example: 'Reach is a vanity metric.' },
        { type: 'specific number', example: '$2.1M ARR, no employees.' },
      ],
      absent: ['rhetorical question', 'imagine a world where'],
    },
    howIOpen: 'A claim that the reader will want to argue with.',
    howIClose: 'A concrete next action. No CTA to "follow for more".',
    signaturePhrases: ['the uncomfortable part', 'here is the actual number'],
    offLimits: [
      { rule: 'no em dashes', evidence: { observed: 0, total: 5 } },
      { rule: 'no hashtags', evidence: { observed: 0, total: 5 } },
    ],
    neverDoes: [
      { rule: 'never uses the "not X, but Y" construction', evidence: { observed: 0, total: 5 } },
      'never opens with a greeting',
    ],
  },
  samples: [{ label: 'LinkedIn, Mar 2026', text: 'Reach is a vanity metric.' }],
};

// ─── Schema ───────────────────────────────────────────────────────────────────

test('parses a complete profile and normalizes bare-string rules', () => {
  const parsed = parseVoiceProfileInput(FIXTURE);
  assert.equal(parsed.aboutMe.nameAndRole, 'Chris Bloch, founder');
  assert.deepEqual(parsed.voice.neverDoes[1], { rule: 'never opens with a greeting' });
  assert.equal(parsed.samples?.length, 1);
});

test('requires nameAndRole but tolerates a half-finished profile', () => {
  const partial = parseVoiceProfileInput({
    aboutMe: { nameAndRole: 'Someone' },
    voice: {},
  });
  assert.equal(partial.aboutMe.audience, '');
  assert.deepEqual(partial.voice.tone.hits, []);
});

test('reports every issue at once, not just the first', () => {
  try {
    parseVoiceProfileInput({
      aboutMe: { nameAndRole: 42, topicPillars: 'not an array' },
      voice: { whoISoundLike: {} },
    });
    assert.fail('expected a validation error');
  } catch (err) {
    assert.ok(err instanceof VoiceProfileValidationError);
    const paths = err.issues.map((i) => i.path);
    assert.ok(paths.includes('aboutMe.nameAndRole'));
    assert.ok(paths.includes('aboutMe.topicPillars'));
    assert.ok(paths.includes('voice.whoISoundLike'));
  }
});

test('isUsable rejects a name-only profile', async () => {
  const store = createMemoryVoiceStore();
  await store.saveProfile({ aboutMe: { ...FIXTURE.aboutMe, audience: '', topicPillars: [] }, voice: { ...FIXTURE.voice, whoISoundLike: '', tone: { hits: [], never: [] } } });
  assert.equal(isUsable(await store.getProfile()), false);

  await store.saveProfile(FIXTURE);
  assert.equal(isUsable(await store.getProfile()), true);
});

// ─── Rendering ────────────────────────────────────────────────────────────────

test('renders exactly the headings voice-builder emits', async () => {
  const store = createMemoryVoiceStore({ initial: FIXTURE });
  const files = await store.renderMarkdown();
  assert.ok(files);

  const about = files['about-me.md'];
  for (const h of [
    '# About Me',
    '## Name and role',
    '## Audience',
    '## Topic pillars',
    '## Point of view',
    '## Brand promise',
    '## Off limits',
  ]) {
    assert.ok(about.includes(h), `about-me.md missing ${h}`);
  }

  const voice = files['voice.md'];
  for (const h of [
    '# Voice Profile',
    '## Who I sound like',
    '## Tone',
    '## Sentence rhythm',
    '## Hook patterns',
    '## How I open',
    '## How I close',
    '## Signature phrases',
    '## Off-limits',
    '## What this voice never does',
  ]) {
    assert.ok(voice.includes(h), `voice.md missing ${h}`);
  }
});

test('carries evidence through to the rendered rules', async () => {
  const store = createMemoryVoiceStore({ initial: FIXTURE });
  const files = await store.renderMarkdown();
  assert.ok(files!['voice.md'].includes('- no em dashes (0 of 5 samples)'));
});

test('never leaves a dangling heading when a section is empty', () => {
  const profile: VoiceProfile = {
    ...parseVoiceProfileInput({ aboutMe: { nameAndRole: 'X' }, voice: {} }),
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
  };
  const files = renderMarkdown(profile);
  assert.ok(files['about-me.md'].includes('## Audience\n_Not captured yet._'));
});

test('system preamble includes the voice but excludes the samples', () => {
  const profile: VoiceProfile = {
    ...parseVoiceProfileInput(FIXTURE),
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
  };
  // The sample is stored — the preamble just declines to spend tokens on it.
  assert.equal(profile.samples.length, 1);

  const preamble = renderSystemPreamble(profile);
  assert.ok(preamble.includes('## Signature phrases'));
  assert.ok(preamble.includes('no em dashes'));
  assert.ok(!preamble.includes('LinkedIn, Mar 2026'));
});

// ─── Memory adapter ───────────────────────────────────────────────────────────

test('memory store round-trips and overwrites the single profile', async () => {
  const store = createMemoryVoiceStore({ now: () => new Date('2026-07-27T00:00:00Z') });
  assert.equal(await store.getProfile(), null);
  assert.equal(await store.renderMarkdown(), null);

  const saved = await store.saveProfile(FIXTURE);
  assert.equal(saved.updatedAt, '2026-07-27T00:00:00.000Z');
  assert.equal(saved.schemaVersion, 1);

  await store.saveProfile({ ...FIXTURE, aboutMe: { ...FIXTURE.aboutMe, nameAndRole: 'Renamed' } });
  const after = await store.getProfile();
  assert.equal(after?.aboutMe.nameAndRole, 'Renamed');
});

// ─── Postgres adapter ─────────────────────────────────────────────────────────

/** Records every statement so we can assert on the SQL without a database. */
function fakeSql() {
  const calls: { text: string; params?: readonly unknown[] }[] = [];
  let stored: { data: unknown; schema_version: number; updated_at: string } | null = null;

  const sql: SqlExecutor = async (text, params) => {
    calls.push({ text, params });
    if (/^\s*create table/i.test(text)) return { rows: [] as never[] };
    if (/^\s*select/i.test(text)) return { rows: (stored ? [stored] : []) as never[] };
    if (/^\s*insert/i.test(text)) {
      stored = {
        data: JSON.parse(String(params?.[0])),
        schema_version: Number(params?.[1]),
        updated_at: '2026-07-27T00:00:00.000Z',
      };
      return { rows: [stored] as never[] };
    }
    throw new Error(`unexpected statement: ${text}`);
  };

  return { sql, calls };
}

test('postgres adapter round-trips through parameterized SQL', async () => {
  const { sql, calls } = fakeSql();
  const store = createPostgresVoiceStore({ sql });

  await store.migrate();
  assert.equal(await store.getProfile(), null);

  const saved = await store.saveProfile(FIXTURE);
  assert.equal(saved.aboutMe.nameAndRole, 'Chris Bloch, founder');
  assert.equal(saved.updatedAt, '2026-07-27T00:00:00.000Z');

  const reread = await store.getProfile();
  assert.deepEqual(reread?.voice.signaturePhrases, FIXTURE.voice.signaturePhrases);

  const files = await store.renderMarkdown();
  assert.ok(files!['about-me.md'].includes('Chris Bloch, founder'));

  // The profile is never interpolated into SQL text.
  const insert = calls.find((c) => /insert/i.test(c.text));
  assert.ok(insert);
  assert.ok(!insert.text.includes('Chris Bloch'));
  assert.ok(String(insert.params?.[0]).includes('Chris Bloch'));
});

test('migration enforces single-tenancy in the database, not by convention', async () => {
  const { sql, calls } = fakeSql();
  await createPostgresVoiceStore({ sql }).migrate();
  const ddl = calls[0].text;
  assert.match(ddl, /id\s+boolean\s+primary key default true/);
  assert.match(ddl, /check \(id\)/);
});

test('rejects an unsafe table name instead of interpolating it', () => {
  const { sql } = fakeSql();
  assert.throws(
    () => createPostgresVoiceStore({ sql, table: 'voice_profile; drop table users' }),
    /Unsafe table name/
  );
});

test('validation runs before any write reaches the database', async () => {
  const { sql, calls } = fakeSql();
  const store = createPostgresVoiceStore({ sql });
  await assert.rejects(
    () => store.saveProfile({ aboutMe: {}, voice: {} } as unknown as VoiceProfileInput),
    VoiceProfileValidationError
  );
  assert.equal(calls.length, 0);
});

test('wraps driver failures in VoiceStoreError', async () => {
  const store = createPostgresVoiceStore({
    sql: async () => {
      throw new Error('connection refused');
    },
  });
  await assert.rejects(() => store.getProfile(), /voice-profile: getProfile failed/);
});

// ─── Evidence ─────────────────────────────────────────────────────────────────

test('structured evidence renders to the exact string voice-builder uses', () => {
  assert.equal(formatEvidence({ observed: 0, total: 5 }), '0 of 5 samples');
  assert.equal(formatEvidence({ observed: 2, total: 7 }), '2 of 7 samples');
  // Singular, because "1 of 1 samples" reads as a bug in a file a human opens.
  assert.equal(formatEvidence({ observed: 0, total: 1 }), '0 of 1 sample');
});

test('rejects evidence that is not a real measurement', () => {
  const bad: [unknown, RegExp][] = [
    [{ observed: 7, total: 5 }, /cannot exceed total/],
    [{ observed: -1, total: 5 }, /cannot be negative/],
    [{ observed: 0, total: 0 }, /at least 1/],
    [{ observed: 0.5, total: 5 }, /whole number/],
    [{ observed: 0 }, /whole number/],
    ['0 of 5 samples', /expected \{ observed, total \}/],
  ];
  for (const [evidence, pattern] of bad) {
    assert.throws(
      () =>
        parseVoiceProfileInput({
          aboutMe: { nameAndRole: 'X' },
          voice: { offLimits: [{ rule: 'no em dashes', evidence }] },
        }),
      pattern,
      `expected ${JSON.stringify(evidence)} to be rejected`
    );
  }
});

test('a rule without evidence stays a rule', () => {
  const parsed = parseVoiceProfileInput({
    aboutMe: { nameAndRole: 'X' },
    voice: { neverDoes: ['never opens with a greeting'] },
  });
  assert.deepEqual(parsed.voice.neverDoes, [{ rule: 'never opens with a greeting' }]);
});

// ─── schemaVersion / updatedAt ────────────────────────────────────────────────

test('the store assigns schemaVersion and updatedAt, not the caller', async () => {
  const store = createMemoryVoiceStore({ now: () => new Date('2026-07-27T12:00:00Z') });
  const saved = await store.saveProfile({
    ...FIXTURE,
    // A client trying to backdate the write or claim a schema version.
    schemaVersion: 99,
    updatedAt: '1999-01-01T00:00:00.000Z',
  } as unknown as VoiceProfileInput);

  assert.equal(saved.schemaVersion, 1);
  assert.equal(saved.updatedAt, '2026-07-27T12:00:00.000Z');
});

test('a stored row with a garbage updatedAt falls back rather than propagating it', () => {
  const profile = parseVoiceProfile({
    ...parseVoiceProfileInput(FIXTURE),
    schemaVersion: 2,
    updatedAt: 'not a date',
  });
  assert.equal(profile.schemaVersion, 2, 'an unknown schemaVersion is preserved, not clamped');
  assert.equal(profile.updatedAt, new Date(0).toISOString());
});

// ─── Sync (store → disk) ──────────────────────────────────────────────────────

test('sync writes both files, banner first, and reports what it wrote', async () => {
  const store = createMemoryVoiceStore({
    initial: FIXTURE,
    now: () => new Date('2026-07-27T12:00:00Z'),
  });
  const writes = new Map<string, string>();

  const result = await syncVoiceFiles(store, {
    dir: '/project',
    join: (d, f) => `${d}/${f}`,
    writeFile: async (path, contents) => {
      writes.set(path, contents);
    },
  });

  assert.equal(result.profileFound, true);
  assert.deepEqual(result.written, ['/project/about-me.md', '/project/voice.md']);
  assert.equal(result.updatedAt, '2026-07-27T12:00:00.000Z');

  const about = writes.get('/project/about-me.md')!;
  assert.ok(about.startsWith('<!--'), 'banner must be the first thing in the file');
  assert.ok(about.includes('GENERATED FILE. Do not edit.'));
  assert.ok(about.includes('profile updated: 2026-07-27T12:00:00.000Z'));
  assert.ok(about.includes('# About Me'));
});

test('sync writes nothing when there is no profile, and does not delete', async () => {
  const store = createMemoryVoiceStore();
  let wrote = false;

  const result = await syncVoiceFiles(store, {
    dir: '/project',
    join: (d, f) => `${d}/${f}`,
    writeFile: async () => {
      wrote = true;
    },
  });

  assert.equal(result.profileFound, false);
  assert.deepEqual(result.written, []);
  assert.equal(wrote, false);
});

test('the banner is an artifact concern and never leaks into the LLM preamble', () => {
  const profile: VoiceProfile = {
    ...parseVoiceProfileInput(FIXTURE),
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
  };
  assert.ok(!renderSystemPreamble(profile).includes('GENERATED FILE'));
  assert.ok(!renderMarkdown(profile)['voice.md'].includes('GENERATED FILE'));
  assert.ok(renderSyncArtifacts(profile)['voice.md'].includes('GENERATED FILE'));
});
