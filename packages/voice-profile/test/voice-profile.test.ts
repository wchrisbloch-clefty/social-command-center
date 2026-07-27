import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_SECTION_PLACEHOLDER,
  IncompleteProfileError,
  VoiceProfileValidationError,
  createMemoryVoiceStore,
  createPostgresVoiceStore,
  describeSection,
  formatEvidence,
  isUsable,
  missingSections,
  parseVoiceProfile,
  parseVoiceProfileInput,
  renderMarkdown,
  renderSyncArtifacts,
  renderSystemPreamble,
  syncVoiceFiles,
  voiceProfileDDL,
  type SqlExecutor,
  type VoiceProfile,
  type VoiceProfileInput,
} from '../src/index.ts';

/** A profile with only the one required field — every other section empty. */
const BARE: VoiceProfile = {
  ...parseVoiceProfileInput({ aboutMe: { nameAndRole: 'Only a name' }, voice: {} }),
  schemaVersion: 1,
  updatedAt: new Date(0).toISOString(),
};

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

// ─── Per-projection empty handling ────────────────────────────────────────────

test('the disk artifact keeps empty headings and fills them with a placeholder', () => {
  const files = renderMarkdown(BARE);
  assert.ok(files['about-me.md'].includes(`## Audience\n${EMPTY_SECTION_PLACEHOLDER}`));
  assert.ok(files['voice.md'].includes(`## Tone\n${EMPTY_SECTION_PLACEHOLDER}`));
});

test('the placeholder never reaches the system preamble', () => {
  // The bare profile is 14 of 15 sections empty — the worst case for a leak.
  const preamble = renderSystemPreamble(BARE);
  assert.ok(
    !preamble.includes(EMPTY_SECTION_PLACEHOLDER),
    'placeholder leaked into the preamble'
  );
  assert.ok(!preamble.includes('Not captured'), 'placeholder text leaked in some other form');

  // And it holds for a fully populated profile too, which has no empties at all.
  const full: VoiceProfile = {
    ...parseVoiceProfileInput(FIXTURE),
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
  };
  assert.ok(!renderSystemPreamble(full).includes(EMPTY_SECTION_PLACEHOLDER));
});

test('the preamble drops empty sections entirely rather than emitting the heading', () => {
  const preamble = renderSystemPreamble(BARE);
  assert.ok(preamble.includes('## Name and role'), 'the one populated section survives');
  assert.ok(!preamble.includes('## Audience'), 'an empty heading must not appear at all');
  assert.ok(!preamble.includes('## Tone'));
  // The file titles still frame the two halves.
  assert.ok(preamble.includes('# About Me'));
  assert.ok(preamble.includes('# Voice Profile'));
});

// ─── missingSections ──────────────────────────────────────────────────────────

test('missingSections reports every empty section, and nothing when full', () => {
  assert.deepEqual(missingSections({
    ...parseVoiceProfileInput(FIXTURE),
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
  }), []);

  const missing = missingSections(BARE);
  assert.ok(!missing.includes('aboutMe.nameAndRole'), 'the populated section is not missing');
  assert.ok(missing.includes('aboutMe.audience'));
  assert.ok(missing.includes('voice.tone'));
  assert.ok(missing.includes('voice.hookPatterns'));
  assert.equal(missing.length, 14, 'one section populated out of fifteen');
});

test('missingSections is derived, so it tracks a write without being told', async () => {
  const store = createMemoryVoiceStore();
  await store.saveProfile({ aboutMe: { nameAndRole: 'X' }, voice: {} });
  assert.equal(missingSections((await store.getProfile())!).length, 14);

  await store.saveProfile(FIXTURE);
  assert.deepEqual(missingSections((await store.getProfile())!), []);
});

test('describeSection turns a key into something a human can act on', () => {
  assert.equal(describeSection('voice.tone'), 'voice.md § Tone');
  assert.equal(describeSection('aboutMe.offLimits'), 'about-me.md § Off limits');
  assert.equal(describeSection('voice.offLimits'), 'voice.md § Off-limits');
  assert.equal(describeSection('nonsense'), 'nonsense', 'unknown keys pass through');
});

// ─── Sync gating ──────────────────────────────────────────────────────────────

test('sync reports missing sections without being asked to enforce', async () => {
  const store = createMemoryVoiceStore({ initial: { aboutMe: { nameAndRole: 'X' }, voice: {} } });
  const result = await syncVoiceFiles(store, {
    dir: '/p',
    join: (d, f) => `${d}/${f}`,
    writeFile: async () => {},
  });
  assert.equal(result.profileFound, true);
  assert.equal(result.written.length, 2, 'a partial profile still writes by default');
  assert.equal(result.missing.length, 14);
});

test('requireComplete refuses to write, and names what is missing', async () => {
  const store = createMemoryVoiceStore({ initial: { aboutMe: { nameAndRole: 'X' }, voice: {} } });
  let wrote = false;

  await assert.rejects(
    () =>
      syncVoiceFiles(store, {
        dir: '/p',
        join: (d, f) => `${d}/${f}`,
        writeFile: async () => {
          wrote = true;
        },
        requireComplete: true,
      }),
    (err: unknown) => {
      assert.ok(err instanceof IncompleteProfileError);
      assert.equal(err.missing.length, 14);
      assert.match(err.message, /voice\.md § Tone/);
      return true;
    }
  );
  assert.equal(wrote, false, 'nothing may be written when the gate refuses');
});

test('requireComplete passes a complete profile through', async () => {
  const store = createMemoryVoiceStore({ initial: FIXTURE });
  const result = await syncVoiceFiles(store, {
    dir: '/p',
    join: (d, f) => `${d}/${f}`,
    writeFile: async () => {},
    requireComplete: true,
  });
  assert.deepEqual(result.missing, []);
  assert.equal(result.written.length, 2);
});

// ─── Markdown escaping ────────────────────────────────────────────────────────

test('hook rendering escapes characters that would break the markup it sits in', () => {
  const profile: VoiceProfile = {
    ...parseVoiceProfileInput({
      aboutMe: { nameAndRole: 'X' },
      voice: {
        hookPatterns: {
          observed: [
            { type: 'the *actual* number', example: 'She said "no" and left [immediately]' },
          ],
          absent: [],
        },
      },
    }),
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
  };

  const voice = renderMarkdown(profile)['voice.md'];
  const line = voice.split('\n').find((l) => l.includes('actual'))!;

  // The bold delimiters must be the only unescaped asterisks on the line, or
  // the emphasis closes early and the rest of the line is mangled.
  assert.ok(line.includes('**the \\*actual\\* number**'), `got: ${line}`);
  assert.ok(line.includes('\\"no\\"'), `got: ${line}`);
  assert.ok(line.includes('\\[immediately\\]'), `got: ${line}`);
});

test('a backslash in user text is escaped before anything else', () => {
  const profile: VoiceProfile = {
    ...parseVoiceProfileInput({
      aboutMe: { nameAndRole: 'X' },
      voice: { hookPatterns: { observed: [{ type: 'a\\b', example: '' }], absent: [] } },
    }),
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
  };
  assert.ok(renderMarkdown(profile)['voice.md'].includes('**a\\\\b**'));
});

// ─── DDL and schema_version authority ─────────────────────────────────────────

test('the DDL is an explicit, inspectable statement', () => {
  const ddl = voiceProfileDDL();
  assert.match(ddl, /create table if not exists voice_profile/);
  assert.match(ddl, /id\s+boolean\s+primary key default true/);
  assert.match(ddl, /schema_version integer\s+not null/);
  assert.match(ddl, /check \(id\)/);
  assert.throws(() => voiceProfileDDL('bad; drop table users'), /Unsafe table name/);
});

test('migrate() runs exactly the exported DDL', async () => {
  const { sql, calls } = fakeSql();
  await createPostgresVoiceStore({ sql }).migrate();
  assert.equal(calls[0].text, voiceProfileDDL());
});

test('the schema_version column is authoritative and a disagreeing payload is fatal', async () => {
  const sql: SqlExecutor = async (text) => {
    if (/^\s*select/i.test(text)) {
      return {
        rows: [
          {
            data: {
              ...parseVoiceProfileInput(FIXTURE),
              schemaVersion: 99, // a second copy, written by some other path
            },
            schema_version: 1,
            updated_at: '2026-07-27T00:00:00.000Z',
          },
        ] as never[],
      };
    }
    throw new Error('unexpected');
  };

  await assert.rejects(
    () => createPostgresVoiceStore({ sql }).getProfile(),
    /schema_version column \(1\) disagrees with data\.schemaVersion \(99\)/
  );
});

test('an agreeing payload copy is tolerated, and the column still wins', async () => {
  const sql: SqlExecutor = async (text) => {
    if (/^\s*select/i.test(text)) {
      return {
        rows: [
          {
            data: { ...parseVoiceProfileInput(FIXTURE), schemaVersion: 1 },
            schema_version: 1,
            updated_at: '2026-07-27T00:00:00.000Z',
          },
        ] as never[],
      };
    }
    throw new Error('unexpected');
  };
  const profile = await createPostgresVoiceStore({ sql }).getProfile();
  assert.equal(profile?.schemaVersion, 1);
});

test('saveProfile does not write schemaVersion into the jsonb payload', async () => {
  const { sql, calls } = fakeSql();
  await createPostgresVoiceStore({ sql }).saveProfile(FIXTURE);
  const insert = calls.find((c) => /insert/i.test(c.text))!;
  const payload = JSON.parse(String(insert.params?.[0]));
  assert.ok(!('schemaVersion' in payload), 'the version belongs to the column, not the payload');
  assert.ok(!('updatedAt' in payload), 'likewise updatedAt — now() is server-side');
  assert.deepEqual(Object.keys(payload).sort(), ['aboutMe', 'samples', 'voice']);
});

// ─── Evidence bounds (explicit confirmation) ──────────────────────────────────

test('Evidence.total must be at least 1', () => {
  for (const total of [0, -1]) {
    assert.throws(
      () =>
        parseVoiceProfileInput({
          aboutMe: { nameAndRole: 'X' },
          voice: { offLimits: [{ rule: 'r', evidence: { observed: 0, total } }] },
        }),
      total === 0 ? /at least 1/ : /cannot be negative/
    );
  }
  // 1 is accepted, and renders in the singular.
  const ok = parseVoiceProfileInput({
    aboutMe: { nameAndRole: 'X' },
    voice: { offLimits: [{ rule: 'r', evidence: { observed: 0, total: 1 } }] },
  });
  assert.deepEqual(ok.voice.offLimits[0].evidence, { observed: 0, total: 1 });
  assert.equal(formatEvidence({ observed: 0, total: 1 }), '0 of 1 sample');
});
