# AetherHub — Agent Tooling Setup

What was installed, what it needs, and what is blocked.

---

## 1. Context7 MCP

Registered in `.mcp.json` at project scope:

```json
{ "mcpServers": { "context7": { "type": "http", "url": "https://mcp.context7.com/mcp" } } }
```

**Not usable yet, but no longer a hard gate.** Two blockers, in order:

1. The proxy refused `CONNECT mcp.context7.com:443` with a 403 policy denial.
2. The host is now reachable, but the server **requires authorization**, and a
   non-interactive session cannot run the OAuth flow. Authorize it from an
   interactive session (`claude mcp` or `/mcp`).

The docs fallback is confirmed working (see below), so the allowlist is a
convenience rather than a blocker for post-cutoff API work.

The original policy denial:

```
{ "kind": "connect_rejected",
  "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
  "host": "mcp.context7.com:443" }
```

**Fallback confirmed readable.** `node_modules/next/dist/docs/` holds 421
markdown files for Next 16.2.6, laid out as:

- `01-app/01-getting-started/` — 18 guides, including `11-css.md`,
  `13-fonts.md`, `15-route-handlers.md`, `16-proxy.md`, `18-upgrading.md`
- `01-app/02-guides/` — 50 guides. Relevant to what is coming:
  `environment-variables.md`, `authentication.md`, `data-security.md`,
  `backend-for-frontend.md`, `forms.md`, `testing/`, `self-hosting.md`,
  `deploying-to-platforms.md`, `mcp.md`, `ai-agents.md`
- `01-app/02-guides/upgrading/` — `version-14/15/16.md` plus `codemods.md`
- `01-app/03-api-reference/` — `01-directives`, `02-components`,
  `03-file-conventions`, `04-functions`, `05-config`, `06-cli`, `07-adapters`,
  `08-turbopack.md`
- `02-pages/**` — the Pages Router equivalents, not used here

The installed `tailwindcss` package is the equivalent reference for Tailwind 4.
Phase 1's `@theme` block was verified against tailwindcss 4.3.0's own
`theme.css` and compiled output — not from memory and not from Context7.

---

## 2. Skills

All four sources are **git submodules** under `.agents/`, so upstream changes can be
pulled rather than re-copied:

| Path | Upstream | Provides |
|---|---|---|
| `.agents/social-media-skills` | `charlie947/social-media-skills` | 17 skills |
| `.agents/anthropic-skills` | `anthropics/skills` | `brand-guidelines` |
| `.agents/taste-skill` | `Leonxlnx/taste-skill` | `taste-skill` |
| `.agents/ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` | 6 design skills |

Submodules for all four, not just the social skills — same reason, same benefit, and
it keeps ~40MB of vendored skill content out of this repo's object store.

Fresh clones need:

```bash
git submodule update --init --recursive
```

### Discovery wiring

Claude Code scans `.claude/skills/<name>/SKILL.md`. None of the four repos put their
skills at that path, so `.claude/skills/` holds symlinks into the submodules — 26 in
total. UI/UX Pro Max's skills are prefixed `uupm-` because its generic names (`design`,
`brand`) would otherwise collide.

```
.claude/skills/
├── <17 social-media skills>       → .agents/social-media-skills/skills/*
├── brand-guidelines               → .agents/anthropic-skills/skills/brand-guidelines
├── taste-skill                    → .agents/taste-skill/skills/taste-skill
└── uupm-{banner-design, brand, design, design-system,
        slides, ui-styling, ui-ux-pro-max}
                                   → .agents/ui-ux-pro-max/.claude/skills/*
```

### Two ambiguous names, resolved

- `Leonxlnx/taste` does not exist. The repo is **`Leonxlnx/taste-skill`**; the skill
  inside declares itself as `design-taste-frontend`. Worth knowing: it scopes itself to
  "landing pages, portfolios, and redesigns — *not* dashboards, not data tables, not
  multi-step product UI." AetherHub is exactly the thing it excludes, so it is the
  wrong tool for the app shell and the right tool for a future marketing page.
- "UI/UX Pro Max" is **`nextlevelbuilder/ui-ux-pro-max-skill`** (v2.11.0).

### Environment dependencies — not set, as instructed

| Skill | Needs | For |
|---|---|---|
| `reels-scripting` | `APIFY_API_TOKEN` | Instagram Reel scraping |
| `reels-scripting` | `GOOGLE_AI_API_KEY` | Gemini 2.5 Flash video analysis |
| `post-scorer` | Apify access | Pulls LinkedIn post history (falls back to cached `*-all-posts.json` / `*-posts.txt`, or prompts) |

**Gemini credential — standardized on `GOOGLE_AI_API_KEY`.** The skills are upstream
repos we do not control, so the app conformed to them rather than the reverse.
`app/api/brief/route.js` now reads it through a single `googleAIKey()` helper.
`GOOGLE_AI_KEY` and `GEMINI_API_KEY` are still read as deprecated aliases so a live
Vercel deployment does not silently lose Gemini the moment this ships — rename the
variable in Vercel → Settings → Environment Variables, then delete the two
fallbacks.

---

## 3. Open tasks

### ~~Step 3, first task: exercise the Postgres adapter against a real database~~ — DONE

Verified against **PostgreSQL 16.13**. `npm run test:pg`, 8 tests, all passing.
Gated on `POSTGRES_TEST_URL` — deliberately *not* `POSTGRES_URL`, because the
file creates and drops tables and sharing the app's variable would mean one
absent-minded `npm test` could take a DDL statement to production. `npm test`
skips them.

Each of the six previously-unverified behaviours, and what was found:

| Was unverified | Result |
|---|---|
| `migrate()` DDL applies and is idempotent | **Confirmed.** Runs twice cleanly; columns assert as `boolean, jsonb, integer, timestamptz` |
| `check (id)` refuses a second row | **Confirmed.** `id = false` violates the check constraint; a second `id = true` violates the primary key. Both paths tested |
| `jsonb` round-trips the payload | **Values yes, bytes no** — see below |
| `$1::jsonb` binds a pre-stringified value | **Confirmed**, including em dashes, curly quotes, `½`, Cyrillic, astral-plane emoji, non-breaking spaces, and embedded newlines |
| `timestamptz` returns `Date` or string | **`Date`.** So `toIso()`'s `instanceof Date` branch is the live one and the string branch is defensive. Asserted, not assumed |
| upsert / `on conflict` behaviour | **Confirmed.** Row count stays at 1 across writes, `now()` advances on the update path |

**The one real finding: `jsonb` does not preserve key order.** It stores a
parsed structure, not the text it was given — keys are normalized and duplicates
collapse. Verified directly: `{zebra, apple, mango}` comes back as
`{apple, mango, zebra}`, nested objects too.

Harmless here, because every consumer reads named fields off a parsed object.
But it means "the payload round-trips unchanged" is true of *values* and false
of *bytes*, so nothing downstream may hash, diff, or checksum the raw JSON and
expect stability. There is a test pinning this so the assumption is recorded
rather than rediscovered.

Also confirmed: node-postgres hands back `jsonb` **pre-parsed as an object**.
`getProfile()` spreads `row.data` directly — if the driver ever returned a
string instead, that spread would silently produce a character map and
validation would report every field missing. Now asserted.

### The one thing to watch on the first Vercel deploy

Not "the pooler is untested" in the abstract. The specific risk is **Vercel
Postgres in transaction pooling mode, combined with prepared statements.**

In transaction pooling, a client does not own a backend connection for the life
of the session — it borrows one per transaction and gives it back. Prepared
statements are *session* state. So a driver that prepares a statement on one
borrowed session and later executes it by name can be handed a different
session that has never seen it, and the query fails with something like
`prepared statement "s1" does not exist`.

Why it will not show up before then:

- **Stock Postgres 16 direct-connect cannot reproduce it.** One client, one
  session, state always present. Every one of the 8 integration tests passes
  for exactly that reason, and would keep passing forever while production
  fails.
- **It is intermittent by construction.** It depends on which backend the
  pooler hands out, so it correlates with concurrency and idle time rather
  than with any particular query. Low traffic can hide it for days.
- **It is invisible in the adapter's own code.** Nothing in
  `adapters/postgres.ts` prepares anything explicitly; whether statements get
  prepared at all is a driver decision.

What to do about it:

1. Prefer Vercel's **pooled** connection string for the app, and its
   **direct/unpooled** string for one-off DDL — `migrate()` and
   `npm run voice:sync` are both better off on a direct connection anyway.
2. If `prepared statement ... does not exist` appears in production logs, that
   is this, not a code bug. Fix it at the driver: node-postgres only prepares
   when a query is given a `name`, and this adapter never sets one, so plain
   `pool.query(text, params)` should already be in the safe path. Confirm that
   the wiring in `scripts/sync-voice.mjs` — and whatever Step 3 adds — has not
   introduced named queries or a `PgPreparedStatement` wrapper.
3. Verify on first deploy under real concurrency, not with a single request.

Everything else about the adapter is exercised; this is the gap.

---

## 4. Style architecture debt — Phase 1 done, 2–4 proposed

**The situation.** Tailwind 4 and `@tailwindcss/postcss` are installed and wired
(`postcss.config.mjs`, `@import "tailwindcss"` in `app/globals.css`) — and produce
almost nothing before Phase 1 — `globals.css` was 20 lines of hand-written reset and
scrollbar CSS. All
1,423 lines of `app/page.jsx` style through inline objects: ~150 `borderRadius:`
literals, ~140 `fontSize:`, ~85 `fontWeight:`, plus every color threaded through a `t`
prop passed to all 14 components.

**What it actually costs.** Not aesthetics — three concrete things:

1. No hover/focus/active pseudo-classes. Every hover is a JS `onMouseEnter` /
   `onMouseLeave` pair that mutates `e.currentTarget.style` (`PostCard`, `TopicCard`,
   and the input focus handlers do this). That is state React does not own and cannot
   re-render correctly.
2. No media queries. Responsiveness runs through `useWindowSize()`, which means a
   `resize` listener, a re-render of the whole tree per resize, and an SSR/client
   mismatch window on first paint (the hook seeds `1280` and corrects in an effect).
3. `t` is prop-drilled into every component and every leaf, so the theme cannot be
   read by anything that is not a React component.

**Proposed path — four phases, each independently shippable and revertible.**

| Phase | Work | Risk | Blast radius |
|---|---|---|---|
| **1. Tokens** ✅ | **Done.** `--ah-*` vars + `@theme` / `@theme inline` / `@utility` in `globals.css`. Additive: `page.jsx` still styles from `T`, so the UI is unchanged. | None | 1 file |
| **2. Theme flips to CSS** | `dark` state writes `data-theme` on `<html>`; `T` keeps working but its values become `var(--ah-*)` reads. Add `localStorage` persistence + `prefers-color-scheme` seed. | Low | `layout.tsx`, theme state |
| **3. Leaf components** | Convert `PostCard`, `TopicCard`, chips, badges to Tailwind classes. Hover becomes `hover:`, deleting the `onMouseEnter` handlers. | Low — leaves are self-contained. | ~6 components |
| **4. Layout & responsive** | Convert shells (`TopNav`, `BottomNav`, `RightPanel`, `main`) to utilities, replace `useWindowSize()` with `md:` / `xl:` breakpoints, delete the hook. | Medium — this is the real behavioral change. | ~4 components |

Phase 1 shipped alongside two fixes from the audit:

- **`100dvh`** — the app root was `height: 100vh`, which clips the bottom nav on
  mobile browsers with dynamic toolbars (`app/page.jsx:1371`).
- **Contrast** — `text-muted` measured **1.30:1** in dark and **1.93:1** in light.
  Fixing it required moving `text-sub` too (itself **3.01:1**), because lifting
  `muted` to AA alone would have made it brighter than `sub` and inverted the
  hierarchy. Corrected values live in the token layer only; `T` is untouched, so
  the change lands visually in Phase 2. Full measurements in BRAND.md §9.6.
- The inline `<style>` tag inside the component tree is gone; `spin`, `pulse` and
  the placeholder rule now live in `globals.css`.

Hold 2–4 until the first real feature is built, then convert whatever that feature
touches as you go. A big-bang rewrite of 1,423 lines buys nothing and risks the one
working thing in the repo.

Two things to decide before phase 3: whether `page.jsx` gets split into files (it
should — 14 components in one file makes any conversion a merge-conflict machine), and
whether the mock data (`MOCK_POSTS`, `TRENDING`, `ALERTS`, …) moves out at the same
time. Both are cheap now and expensive later.
