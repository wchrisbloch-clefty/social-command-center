# Batch AD — AetherHub X layer, done in the right repo (social-command-center)

**CASE (both repos):**
- **social-command-center** (this repo, public, Next 16): branched from `main` (`1e93a5e`).
  **AD1** lands here as one draft PR, one commit. `CLAUDE.md`/`AGENTS.md`/`SETUP.md` read and
  followed (degrade-not-crash, mobile-first, no icons/logos, red reserved for Breaking).
- **mynewshub2**: `main` was `2e69cce`; **PR #91 (Batch AC) is now merged**, so AD2 + AD3 branch
  from the new `main` as their own draft PR. `whatishappening-hub` is **not touched** — its draft
  PR #2 diagnosed the wrong app.

**Sandbox limits (honest):** no live X / feed egress and no real `XAI_API_KEY`, so real xAI
results are **NEEDS-DEVICE** (CB adds the key). Everything below ran on the repo's own fixtures
(`SOCIAL_FIXTURE_BASE`) + mocked `fetch`. **No secret value appears anywhere in this report.**

## Item status

| item | what | result |
|---|---|---|
| **AD1** | X honest status + supported provider (xAI default) + RSSHub kept as an option | ✅ **PASS** (diagnosis, provider+cap unit tests, build, responsive audit) · real xAI = **NEEDS-DEVICE** |

## AD1 diagnosis (counts by platform and cause — verified, no secrets)

`/api/social` fetches the `SOCIAL_SOURCES + TOPIC_SOURCES` pool — **29 sources**, counted by
importing the config:

| platform | count | cause on the public instance |
|---|---:|---|
| **X** (10 accounts + 1 keyword) | **11** | `missing` — `/twitter/*` needs `TWITTER_AUTH_TOKEN` **on the RSSHub instance**; the public one can't serve it (`route.js:58-63,122-130`). Deterministic. |
| **Reddit** | **18** | `rate-limited` — reddit.com 429s datacenter IPs; some finish, some `pending`, some fail. Transient. |

The **`degraded`** counter is `sources.filter(s => !s.ok && !s.pending).length` (`route.js:255`),
shown at `page.jsx:2451`. So the parked **"~23 degraded" = 11 X (credential limitation) + ~12
Reddit (IP rate-limiting)** — two different causes collapsed into one number. There is **no X
token to "find"**: it is an RSSHub-instance setting, and no self-hosted instance exists yet. Full
write-up: `docs/x-layer-diagnosis.md`.

## What AD1 shipped

- **`lib/x-provider.js`** — pure `selectXProvider({mode,rsshubBase,rsshubAnswersX,hasXaiKey})` →
  `rsshub|xai|off`, and `xLayerStatus()` for the four neutral chip states. **20 unit tests**
  (`test/x-provider.test.mjs` — all 4 modes × key present/missing × public/private instance ×
  answersX; `test/x-xai.test.mjs`).
- **`lib/x-xai.js`** (isolated, fail-soft) — per X handle ONE xAI live-search request restricted
  to X, mapped to the item shape, labelled **via xAI** (tier 'street' = "Alt. perspective",
  unverified), link-out to the post. **Cost guards, unit-tested:** ≤10 calls/refresh, ≥6h cache
  (`lib/ttl-cache.js`; the warm cron reuses it, so X is never called >1×/6h/handle), hard
  `X_DAILY_CAP` (default 40), 8s timeout, and **the key is sent as a Bearer header but never
  echoed into any response** (asserted).
- **`app/api/social/route.js`** — splits X off; X reports as **ONE neutral `xLayer` chip** instead
  of 11 red rows (except `rsshub` mode, where X flows through the normal feed path). Non-X
  behaviour unchanged.
- **`app/page.jsx` + `globals.css`** — the chip (neutral grey dot, never red) + remaining degraded
  **grouped by cause**. The four states: `X: via xAI` / `X: via your RSSHub` /
  `X: not connected (add XAI_API_KEY or a private RSSHub)` / `X: daily limit reached`.
- **`SETUP.md` §4** — "X: three ways" (xAI key — recommended; private RSSHub + token on that
  instance, with the risk note; or leave X as link-out). Docs only, no infrastructure created.

## Gates

- **`npm run build`** ✅ (Next 16, all 14 routes compile).
- **`npm run audit:responsive`** ✅ **72/72 cases clean** (mobile 390 · iPad 820 · desktop 1280 ×
  light/dark × 12 views) — the new chip + grouped-degraded hold at every breakpoint.
- **`npm run test:x`** ✅ 20/20. **`npm test`** (existing voice-profile) ✅ 39 pass, 10
  postgres-skipped.
- **typecheck**: the only `tsc` errors are pre-existing "cannot find module" from the fresh clone's
  missing `@types` in a few `.tsx`/`.ts` files — none in the AD1 files.

## Screenshots (`docs/verification/batch-AD/`)

Source rail, phone + desktop: `after-off-{phone,desktop}.png` (the fresh-deploy state — **one**
neutral "X: not connected (add XAI_API_KEY or a private RSSHub)" chip, no 11 red rows) and
`after-xai-{phone,desktop}.png` ("X: via xAI" chip; the live call is NEEDS-DEVICE so no items in
the sandbox, but the chip renders). **Before** (on `main`) was 11 red
`@DanielYergin … needs TWITTER_AUTH_TOKEN` rows plus the Reddit failures, i.e. the "23 degraded"
noise this replaces.

## What CB does (plain language)

**Vercel project: the AetherHub / social-command-center deployment.**
1. **Recommended — xAI.** Settings → Environment Variables → add **`XAI_API_KEY`** (value from
   your xAI account at console.x.ai). Optional: `X_DAILY_CAP` (default 40). Leave `X_PROVIDER`
   unset (it defaults to `auto`). **Redeploy** (Deployments → ⋯ → Redeploy). Afterwards the
   Sources rail shows **"X: via xAI"** and X posts appear tagged "Alt. perspective · via xAI".
2. **Or — your own RSSHub.** Deploy RSSHub, put `TWITTER_AUTH_TOKEN` **on that instance**, set
   **`RSSHUB_BASE_URL`** in Vercel to it, redeploy → chip reads **"X: via your RSSHub"**. (Risk:
   that token is an unofficial, expiring cookie that can get the X account limited — see SETUP.md.)
3. **Or — nothing.** The chip reads **"X: not connected…"** and everything else is unchanged.

There is **no X token to set inside AetherHub itself** — it was never an app variable.
