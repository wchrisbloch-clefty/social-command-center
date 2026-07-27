# AetherHub — Agent Tooling Setup

What was installed, what it needs, and what is blocked.

---

## 1. Context7 MCP

Registered in `.mcp.json` at project scope:

```json
{ "mcpServers": { "context7": { "type": "http", "url": "https://mcp.context7.com/mcp" } } }
```

**Not usable yet.** Two separate blockers, in order:

1. The proxy refused `CONNECT mcp.context7.com:443` with a 403 policy denial.
2. The host is now reachable, but the server reports it **requires
   authorization**, and this session is non-interactive so the OAuth flow cannot
   be run here. Authorize it from an interactive session (`claude mcp` or
   `/mcp`) before it will serve requests.

The original policy denial:

```
{ "kind": "connect_rejected",
  "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
  "host": "mcp.context7.com:443" }
```

**Fallback in use, and it works.** `npm install` has been run, so
`node_modules/next/dist/docs/` (421 files) is available for Next 16.2.6, and the
installed `tailwindcss` package itself is the reference for Tailwind 4. Phase 1's
`@theme` block was verified this way — against tailwindcss 4.3.0's own
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

## 3. Style architecture debt — Phase 1 done, 2–4 proposed

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
