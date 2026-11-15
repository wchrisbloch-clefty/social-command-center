# X-layer diagnosis (AetherHub / social-command-center)

**Scope:** the parked *"needs TWITTER_AUTH_TOKEN / 23 sources degraded"* note. This is the
**right** app — the one whose `/api/social` route pulls X through RSSHub. (A prior pass in
Batch AC looked at `whatishappening-hub`, a different app with no X token at all; that was the
wrong repo.) No secret value appears anywhere in this document.

## 1. Where the X token is read, and what request fails

- **No app code reads `TWITTER_AUTH_TOKEN`.** `grep -rn TWITTER_AUTH_TOKEN` finds it only in
  strings/comments. The token is **not an AetherHub setting** — it must live **on the RSSHub
  instance** that `RSSHUB_BASE_URL` points at (`app/api/social/route.js:44-57`,
  `config/sources.js` X block). The app only points at an instance; it never holds the token.
- **The request:** each X source is `/twitter/user/<handle>` (or `/twitter/keyword/<q>`) joined
  onto `RSSHUB_BASE_URL` (default `https://rsshub.app`, `route.js:48`) and fetched by
  `loadSource` → `fetchFeed` (`route.js:106`). On the **public** instance `/twitter/*` requires
  a token the public instance does not have, so it returns a non-2xx and `loadSource` tags the
  report `{ ok:false, limitation:true, needs:'TWITTER_AUTH_TOKEN' }` (`route.js:122-130`,
  `PLATFORM_LIMITS.X` at `route.js:58-63`).
- **There is no self-hosted instance today**, so there is no token anywhere to "find" — the fix
  is a provider choice, not a credential hunt.

## 2. What "23 degraded" counts (verified, with file/line)

The counter is **`degraded = sources.filter(s => !s.ok && !s.pending).length`**
(`app/api/social/route.js:255`), surfaced in the header as *"· N sources degraded"*
(`app/page.jsx:2451`) and in the roll-up (`app/page.jsx:2499`). `/api/social` fetches the
`SOCIAL_SOURCES + TOPIC_SOURCES` pool — **29 sources**, counted from the config:

| platform | count | on the public instance |
|---|---:|---|
| **X** (10 accounts + 1 keyword) | **11** | **always degraded** — credential *limitation* (`needs TWITTER_AUTH_TOKEN` on the instance), not a bad handle |
| **Reddit** (direct `reddit.com` RSS) | **18** | **variably degraded** — reddit.com rate-limits datacenter IPs (429); paced at 1.1s, some finish, some miss the 25s deadline (`pending`) or fail (`degraded`) |
| YouTube | (17, separate `/api/youtube` route) | not in this counter |

So **"~23 degraded" = the 11 X sources (deterministic, credential limitation) + ~12 Reddit
(transient, datacenter-IP rate-limiting)**. Two different causes collapsed into one number. The
X half is the explainable core; the Reddit half is IP reputation and has nothing to do with a
token. The exact Reddit split is environment-dependent (it depends on reddit.com's mood toward
the serverless egress IP), which is itself the point: a single "degraded" number hid that.

## 3. Failure cause per platform

- **X — `missing` (by design on the public instance).** Not expired, not rate-limited: the
  public instance simply cannot serve `/twitter/*`. It becomes `ok` the moment
  `RSSHUB_BASE_URL` points at a private instance that holds a token **or** the new `X_PROVIDER`
  routes X through xAI.
- **Reddit — `rate-limited` (429) / transient.** `loadSource` already distinguishes `pending`
  (queued behind the pace limiter at the deadline) from `degraded` (actually failed).
- **YouTube** — separate route; `needsKey` when `YOUTUBE_API_KEY` is absent. Out of scope here.

## 4. What this PR changes (AD1)

- **`X_PROVIDER` switch** (`lib/x-provider.js`, pure + unit-tested): `auto` (default) | `xai` |
  `rsshub` | `off`. `auto` → a non-public RSSHub that answers an X route wins; else an
  `XAI_API_KEY` → xAI; else an honest "not connected".
- **xAI adapter** (`lib/x-xai.js`, isolated, fail-soft): per X handle, ONE live-search request
  restricted to X, mapped to the app's item shape, labelled **via xAI** (tier already renders
  "Alt. perspective" = unverified). Cost guards: ≤10 X calls/refresh, results cached ≥6h, a hard
  `X_DAILY_CAP` (default 40), 8s per-call timeout, never breaks the page.
- **ONE neutral X-layer chip** replaces the 11 per-handle red rows:
  `X: via xAI` / `X: via your RSSHub` / `X: not connected (add XAI_API_KEY or a private RSSHub)` /
  `X: daily limit reached`. The remaining non-X degraded sources are **grouped by cause** so the
  number is explained, not alarming. Non-X behaviour is unchanged.
- **SETUP.md** gains "X: three ways" (xAI key — recommended; private RSSHub + token on that
  instance, with the risk note; or leave X as link-out). Documentation only — no infrastructure
  is created here.

**Honest risk note:** a self-hosted RSSHub with a cookie `TWITTER_AUTH_TOKEN` is an unofficial,
expiring route that can get the X account limited or banned. xAI live search is a supported,
paid API. This PR defaults to the supported path and keeps RSSHub as an explicit option.
