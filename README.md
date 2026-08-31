# AetherHub

A social intelligence dashboard: multi-platform feed, trend discovery, alerts,
and an AI briefing layer with a Groq → Gemini → Claude fallback chain.

Next 16.2.6 · React 19.2.4 · Tailwind 4 · deployed on Vercel.

> The repo and Vercel project are still named `social-command-center`.
> **AetherHub is the product name** — see BRAND.md §9.1. `package.json` has
> been renamed; the repo and deploy slugs are cosmetic and lag deliberately.

---

## Current state — read this first

**Eight of twelve views are live. Four still render mock data.**

Live, reading the real feed: **Feed, Discover, Recommended, Podcasts,
Categories, Sports, Sports (team drill-down)**, and the source-health rail. They pull real posts
from Instagram, LinkedIn, X and Reddit through RSSHub, plus YouTube through its
official Data API — see *Social ingestion* below. Every signal carries a tier
badge (`mainstream` / `street`), and any source that failed is named with its
reason rather than hidden.

Still fabricated: **Intelligence, Studio, Alerts, Sources**. That is a
deliberate stage, not an oversight, and the UI says so — fabricated numbers
carry a visible amber `DEMO DATA` marker. The rule is written down in BRAND.md
§7.8 so it holds for components that do not exist yet.

The status strip that carried a market ticker and a weather chip is **gone**.
Both were fabricated, and a row whose entire content is invented is better
deleted than badged.

What is real:

| Area | State |
|---|---|
| UI shell, navigation, all twelve views | Working, responsive, deployed |
| **Feed — live social signal** | **Working.** RSSHub + YouTube Data API, category-filtered |
| `/api/social` — Instagram, LinkedIn, X, Reddit | Working. Fails soft per source |
| `/api/youtube` — official Data API v3 | Working. Needs `YOUTUBE_API_KEY`, degrades without it |
| `/api/brief` — Groq → Gemini → Claude | Working. Shows which provider answered; 200 + `needsKey` when none configured |
| `/api/extract` — URL/article/YouTube ingest | Working |
| Design tokens (editorial palette, Tailwind `@theme`) | Landed. Drives every view via `data-theme` |
| `packages/voice-profile` | Built and tested. **Not wired into the app** |
| Discover / Recommended / Sports — velocity ranking | Working. Real feed, `lib/velocity.js` |
| Categories — add, rename, recolor, merge, delete, reorder | Working. `/api/categories` is the one writer |
| `/api/recommend`, `/api/suggest-categories` | Working. Advisory only; both cached in-process |
| `lib/source-resolver.js` + `npm run sources:resolve` | Working. Verify-then-wire; needs `YOUTUBE_API_KEY` |
| **Podcasts** — `/api/podcasts`, 5 shows | **Working.** Direct RSS, no key of any kind |
| Episode summaries — `/api/podcast-summary` | Working. Show notes ONLY, never audio. See [docs/PODCASTS.md](docs/PODCASTS.md) |
| Cross-show topics | Working. Same theme engine as Discover, pointed at episodes |
| Intelligence / Studio / Alerts / Sources data | Fabricated, labeled |
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
| `RSSHUB_BASE_URL` | no | RSSHub instance. Defaults to `https://rsshub.app` |
| `YOUTUBE_API_KEY` | no | YouTube Data API v3. Without it YouTube signals are off |
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
npm test            # 49 tests. The 10 Postgres ones skip without a database
npm run test:pg     # those 8, against POSTGRES_TEST_URL
npm run typecheck   # tsc --noEmit
npm run voice:sync  # voice profile → about-me.md + voice.md (needs POSTGRES_URL)
npm run probe:rsshub # which configured feeds actually respond, and with how many items
npm run audit:responsive # the responsive geometry gate — see docs/RESPONSIVE.md
```

Tests run on Node's built-in runner with native TypeScript stripping — no test
framework, no build step. CI (`.github/workflows/ci.yml`) runs `npm test`,
`typecheck` and `build` on every PR, plus the Postgres suite against a
`postgres:16` service container, plus the responsive geometry audit.

`npm run audit:responsive` needs a browser once: `npx playwright install --with-deps chromium`.
It boots its own fixture feed and `next start`, so there is nothing to manage —
but run `npm run build` first, because it audits the production build.

**A skipped test is a green test**, so CI greps its own logs and fails if either
suite reports skipping rather than running. The responsive job applies the same
reasoning: it fails if the audit never printed a PASSED/FAILED verdict, because
a crash that prints nothing would otherwise look like success.

## Responsive contract

**[`docs/RESPONSIVE.md`](docs/RESPONSIVE.md) is the layout contract — read it
before touching a view.** Mobile-first is a hard requirement and it is enforced,
not advisory: `npm run audit:responsive` drives a real Chromium across
**3 breakpoints × 2 themes × 12 views = 72 cases** and fails CI on horizontal
overflow, an element wider than its parent, a collapsed nav/tab strip, a
sub-34px tap target at a touch breakpoint, or a console error.

Targets are **mobile 390px · iPad 820px · desktop 1280px+**. A new view must be
registered in `VIEWS` in `scripts/responsive-audit.mjs`, or nothing checks it.

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

## Social ingestion

### The pipeline

```
config/sources.js ──▶ /api/social  ──┐
                      /api/youtube ──┴──▶ normalizeSignal() ──▶ getFeed() ──▶ Feed view
```

`normalizeSignal()` in `lib/adapters.js` is the only way a signal enters the UI,
and it is the only place a tier is assigned. It cannot return an un-tiered
signal, so the cards render their tier badge unconditionally rather than
defensively. Tier is derived from the platform and never set per source:

| Platform | Tier | Transport |
|---|---|---|
| Instagram | `mainstream` | RSSHub |
| LinkedIn | `mainstream` | RSSHub |
| YouTube | `mainstream` | Official Data API v3 |
| X | `street` | RSSHub |
| Reddit | `street` | Reddit's own RSS — **not** RSSHub |

Sources that carry engagement numbers (YouTube) score on views-per-hour.
Sources that do not (everything over RSS) score on recency instead — otherwise
every RSS item would land on `moderate` and flatten the feed.

### Editing what gets pulled

Everything lives in **`config/sources.js`**. One line per source:

```js
{ platform: 'LinkedIn', route: '/linkedin/company/openai/posts',
  label: 'OpenAI', category: 'tech', limit: 5 },
```

- `route` — relative (`/twitter/...`) is joined onto `RSSHUB_BASE_URL`; absolute
  (`https://...`) is fetched directly and skips RSSHub entirely.
- `category` — one of General, Business & Markets, Energy, AI & Tech, Sports,
  Health, Pop Culture. Drives the category nav.
- `limit` — max items this source contributes per refresh, default 5. This is
  load-bearing: without it a busy subreddit floods a category and buries the
  platforms that only return two or three items.

The seeded entries are placeholders marked `// ASSUMPTION:` — replace them.

### RSSHub route patterns

Read out of the RSSHub source (`lib/routes/*`), not guessed. `requireConfig` is
what decides whether the **free public instance** can serve a route at all.

| Platform | Route | Config needed |
|---|---|---|
| Instagram | `/instagram/2/user/:username` | none, but `antiCrawler` — rate-limits hard |
| Instagram | `/instagram/2/tags/:hashtag` | same |
| Instagram | `/instagram/user/:username` | `IG_USERNAME` + `IG_PASSWORD` — self-hosted only |
| LinkedIn | `/linkedin/company/:company_id/posts` | **none** — the best free-tier bet |
| X | `/twitter/user/:id` | **`TWITTER_AUTH_TOKEN`** on the RSSHub instance |
| X | `/twitter/keyword/:keyword` | same |
| Reddit | `https://www.reddit.com/r/:sub/hot/.rss` | none — native RSS, no RSSHub |

Two things worth knowing before you extend the list:

- **LinkedIn's `/posts` suffix is required.** `/linkedin/company/google` is a 404.
- **There is no LinkedIn person route.** RSSHub only exposes company pages. To
  follow a person, follow the company they post under.
- **RSSHub has no Reddit namespace at all.** Reddit serves RSS itself, so those
  sources use absolute URLs and never touch RSSHub.

Run `npm run probe:rsshub` to see which of your configured routes actually
respond right now, and with how many items.

### Swapping to a self-hosted RSSHub

Change one environment variable. No code edits:

```bash
RSSHUB_BASE_URL=https://rsshub.your-domain.com
```

Every relative route in `config/sources.js` re-points automatically. Absolute
routes (Reddit) are unaffected.

You will probably need to. The public instance is shared, aggressively
rate-limited, and cannot serve routes that need credentials — `/twitter/*` needs
a `TWITTER_AUTH_TOKEN` configured *on the RSSHub instance*, which is exactly the
kind of thing a public instance will not do for you. LinkedIn company posts need
no config and are the most likely to work for free.

### When a feed breaks

Nothing throws. A dead source contributes zero items, logs a warning naming the
source and status, and reports itself in the response so the right rail can show
it as degraded. The feed renders regardless. Degradation is visible, never
silent, and the app never substitutes invented posts for missing live ones.

---

## Repository layout

```
app/
  page.jsx              the entire dashboard — one file
  layout.tsx            fonts (Playfair + Archivo + Inter + Public Sans), metadata
  globals.css           reset + the editorial token layer + Tailwind @theme
  api/social/route.js   RSSHub → Instagram, LinkedIn, X; direct → Reddit
  api/youtube/route.js  official YouTube Data API v3
  api/brief/route.js    Groq → Gemini → Claude, returns which one answered
  api/extract/route.js  URL / article / YouTube ingest
config/sources.js       ★ the only file you edit to change what gets pulled
lib/adapters.js         normalizeSignal / scoreSignal / getFeed — the pipeline
packages/voice-profile/ voice-profile-core — see above
scripts/probe-rsshub.mjs  checks which configured feeds actually respond
scripts/responsive-audit.mjs  the responsive geometry CI gate
docs/RESPONSIVE.md      the layout contract that gate enforces
scripts/sync-voice.mjs  the only place a database driver is imported
.agents/                four skill repos as git submodules
.claude/skills/         26 symlinks into .agents, the layout Claude Code scans
```

`app/page.jsx` being one ~1,700-line file is known and tracked. Splitting it is
a prerequisite for phase 3 of the style migration — see SETUP.md §4. The live
feed components at the top of it are the natural first extraction.

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
