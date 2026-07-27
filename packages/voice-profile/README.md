# @aetherhub/voice-profile

A portable model of "who I am and how I write", with swappable persistence.

**Zero runtime dependencies.** Nothing here imports from AetherHub, Next.js,
React, Vercel, or a database driver. The whole directory lifts out and publishes
as-is.

---

## Why it exists

The `social-media-skills` suite reads two files from a project root:
`about-me.md` and `voice.md`. All 17 skills depend on them. That works when you
are sitting in a Claude Code session with the repo checked out, and not at all
on a phone.

This package treats those files as a **projection**, not a storage layer. The
profile lives in a database; `renderMarkdown()` produces the files a skill
expects, and `renderSystemPreamble()` produces the prompt prefix an API route
expects. One source, two surfaces, no drift.

```
                    ┌──────────────────────┐
                    │     VoiceProfile     │  ← the canonical record
                    └──────────┬───────────┘
                 ┌─────────────┴─────────────┐
      renderMarkdown()               renderSystemPreamble()
                 │                           │
      about-me.md + voice.md          LLM system preamble
      (Claude Code session)           (phone, cron, API route)
```

## Usage

```ts
import {
  createPostgresVoiceStore,
  renderSystemPreamble,
} from '@aetherhub/voice-profile';

// Bring your own driver. This adapter never imports one.
const store = createPostgresVoiceStore({
  sql: (text, params) => pool.query(text, params),
});

await store.migrate();               // idempotent DDL
await store.saveProfile({ aboutMe, voice });

const files = await store.renderMarkdown();
// → { 'about-me.md': '# About Me\n…', 'voice.md': '# Voice Profile\n…' }

const profile = await store.getProfile();
if (profile) prompt = `${renderSystemPreamble(profile)}\n\n${prompt}`;
```

## Design decisions

**No id parameter, anywhere.** This deployment is single-tenant: one profile,
env-gated, no auth. `getProfile()` takes no arguments. An interface that cannot
express "which profile" cannot grow an accidental multi-tenant code path. The
Postgres table enforces the same thing at the database level — `id` is a boolean
primary key constrained to `true`, so a second row is not representable.

**The driver is injected, not imported.** `SqlExecutor` is a one-method type
matching `client.query(text, params)`. node-postgres satisfies it directly;
postgres.js and Drizzle need a one-line wrapper. This is what keeps the
dependency count at zero, keeps the package publishable, and lets the tests run
against a fake executor with no database.

**Input is looser than storage.** A rule can be written as a bare string when
there is no evidence to attach, and every field except the author's name can be
omitted, so a half-finished interview still saves as a draft.
`parseVoiceProfileInput` narrows the loose form to the strict one, and reports
*every* problem it finds rather than only the first.

**Rules carry evidence.** `voice-builder` insists that off-limits and never-does
entries come from observed absence across the samples — "no em dashes (0 of 5
samples)" — not from a generic banned-words list. `VoiceRule.evidence` makes
that a field rather than a convention, and it survives into the rendered
markdown.

**Rows are validated on read, not trusted.** Stored JSON may predate a schema
change or have been edited by hand in a SQL console.

**Headings are the real contract.** The strings in `render.ts` must match
`voice-builder`'s output exactly. A skill grepping for `## Signature phrases`
finds nothing if it is renamed. The test suite asserts every heading in both
files for this reason.

## Layout

```
src/
  schema.ts            types + validation, no I/O
  render.ts            VoiceProfile → markdown / system preamble
  store.ts             the VoiceStore interface
  adapters/
    postgres.ts        plain SQL over an injected executor
    memory.ts          for tests, and proof the seam is real
test/
  voice-profile.test.ts
```

## Tests

```bash
npm test          # from the repo root
```

Node's built-in runner with native TypeScript stripping. No test framework, no
build step, no database.

## Extracting this package

1. `git mv packages/voice-profile ../voice-profile`
2. Drop the `@voice-profile/*` path aliases from the root `tsconfig.json`.
3. Add a build step (`tsc`) and point `main`/`types` at `dist/`. Relative
   imports use explicit `.ts` extensions, so switch on
   `rewriteRelativeImportExtensions` or change them to `.js`.

Nothing else. There are no host imports to unpick — that was the point.

## Not covered yet

`newsletter-voice` produces a third file, `newsletter-voice.md`, layered on top
of `voice.md`. It is a natural extension — a `newsletter?: NewsletterVoice`
branch on `VoiceProfile` plus a third renderer — but it is out of scope until
the base profile is in use.
