# AetherHub

A social intelligence dashboard: multi-platform feed, trend discovery, alerts,
and an AI briefing layer with a Groq → Gemini → Claude fallback chain.

Next 16.2.6 · React 19.2.4 · Tailwind 4 · deployed on Vercel.

> The repo and Vercel project are still named `social-command-center`.
> **AetherHub is the product name** — see BRAND.md §9.1. `package.json` has
> been renamed; the repo and deploy slugs are cosmetic and lag deliberately.

---

## Current state — read this first

**The dashboard is deployed and working. All of its data is fabricated.**

Every post, trend, alert, topic count and activity figure is mock data checked
into `app/page.jsx`. There is no platform API integration. That is a deliberate
stage, not an oversight, and the UI says so: every fabricated number carries a
visible amber `DEMO DATA` marker, and the activity banner reads *Simulated*
rather than *LIVE*. The rule is written down in BRAND.md §7.8 so it holds for
components that do not exist yet.

What is real:

| Area | State |
|---|---|
| UI shell, navigation, all five views | Working, responsive, deployed |
| `/api/brief` — Groq → Gemini → Claude | Working. The answering provider is shown in the UI |
| `/api/extract` — URL/article/YouTube ingest | Working |
| Design tokens (`--ah-*`, Tailwind `@theme`) | Landed. Additive — components still style inline |
| `packages/voice-profile` | Built and tested. **Not wired into the app** |
| Feed / trend / alert data | Fabricated, labeled |
| Voice UI (Settings → Voice) | Not built. Step 3 |
| Auth | None. Single-tenant by design |

---

## Quick start

```bash
git clone <repo> && cd social-command-center
git submodule update --init --recursive   # the .agents/* skill sources
npm install
cp .env.example .env.local                # then fill in at least GROQ_API_KEY
npm run dev
```

The submodule step is not optional. Four skill repos live under `.agents/`, and
`test/upstream-contract.test.ts` *skips* rather than fails without them — which
would quietly disable the test that guards our contract with those skills.

Without any API key the app still runs; the AI panels report that no provider
is configured.

## Environment variables

`.env.example` is the canonical list, with a comment on each. Summary:

| Variable | Required | Purpose |
|---|---|---|
| `GROQ_API_KEY` | no | First AI provider. Free tier |
| `GOOGLE_AI_API_KEY` | no | Second provider. Free tier |
| `ANTHROPIC_API_KEY` | no | Last resort. **Paid** |
| `POSTGRES_URL` | not yet | Voice store. Needed for Step 3 |
| `DATABASE_URL` | no | Fallback for non-Vercel Postgres |
| `POSTGRES_TEST_URL` | no | Integration tests only — creates and drops tables |
| `APIFY_API_TOKEN` | no | Vendored skills only, never read by the app |

**`GOOGLE_AI_API_KEY` is the only accepted Gemini name.** It previously also
answered to `GOOGLE_AI_KEY` and `GEMINI_API_KEY`; both were removed. The
spelling is dictated by the vendored skills, which read `GOOGLE_AI_API_KEY` and
are upstream repos we do not control.

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm test            # 41 tests. The 8 Postgres ones skip without a database
npm run test:pg     # those 8, against POSTGRES_TEST_URL
npm run typecheck   # tsc --noEmit
npm run voice:sync  # voice profile → about-me.md + voice.md (needs POSTGRES_URL)
```

Tests run on Node's built-in runner with native TypeScript stripping — no test
framework, no build step. CI (`.github/workflows/ci.yml`) runs `npm test`,
`typecheck` and `build` on every PR, plus the Postgres suite against a
`postgres:16` service container.

**A skipped test is a green test**, so CI greps its own logs and fails if either
suite reports skipping rather than running.

---

## `packages/voice-profile` — built, not wired

A portable model of "who I am and how I write", published as
`voice-profile-core`.

**The problem it solves.** The 17 skills in `.agents/social-media-skills` all
read two files from the project root — `about-me.md` and `voice.md`. That works
when you are at a laptop with the repo checked out, and not at all on a phone.
The package treats those files as a *projection* of a database record rather
than as storage, so the same profile can become two files for a Claude Code
session or a system preamble for an API call on a phone.

**Why it is extraction-ready.** Not aspirationally — structurally:

- **Zero runtime dependencies.** Nothing imports React, Next, Vercel, or a
  database driver.
- **The SQL driver is injected.** `createPostgresVoiceStore({ sql })` takes a
  one-method executor. There is no `pg` import inside the package, which is
  what lets the tests run against a fake without a database and keeps the
  package uncoupled from any host.
- **No host imports at all**, and its own `package.json` with real `exports`.
- The tsconfig alias is `voice-profile-core`, matching the package name, so
  extraction is deleting two path entries rather than a find-and-replace.

Verified against PostgreSQL 16 — DDL, the single-row constraint, `jsonb`
round-tripping of em dashes and emoji, upsert behaviour. See
`packages/voice-profile/README.md` for the design decisions and the one-way
sync contract, and SETUP.md §3 for what is still unverified on Vercel
specifically.

It is deliberately not imported by any app code yet. Wiring it up is Step 3.

---

## Repository layout

```
app/
  page.jsx              the entire dashboard — 14 components, one file
  layout.tsx            fonts (Syne + Inter), metadata
  globals.css           reset + the --ah-* token layer + Tailwind @theme
  api/brief/route.js    Groq → Gemini → Claude, returns which one answered
  api/extract/route.js  URL / article / YouTube ingest
packages/voice-profile/ voice-profile-core — see above
scripts/sync-voice.mjs  the only place a database driver is imported
.agents/                four skill repos as git submodules
.claude/skills/         26 symlinks into .agents, the layout Claude Code scans
```

`app/page.jsx` being one ~1,400-line file is known and tracked. Splitting it is
a prerequisite for phase 3 of the style migration — see SETUP.md §4.

## Further reading

- **BRAND.md** — the design system, extracted from the code rather than
  invented. Colour, type, radius, motion, component conventions, and the rules
  for demo labeling (§7.8) and provider visibility (§7.9). Open issues are in
  §9, with the contrast measurements that drove the current text colours.
- **SETUP.md** — agent tooling, the four skill submodules, environment
  dependencies, the specific Vercel transaction-pooling risk (§3), and the
  four-phase style migration plan (§4).
- **packages/voice-profile/README.md** — schema, store interface, adapters, and
  why the markdown sync is one-way and must never become a checksum.
- **AGENTS.md** — this Next.js version is post-cutoff. Read
  `node_modules/next/dist/docs/` before writing code against its APIs.
