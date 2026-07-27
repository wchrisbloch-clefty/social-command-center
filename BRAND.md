# AetherHub — Brand & Design System

**Status:** extracted, not invented. Every value below was read out of the existing
codebase. Nothing here is a new design direction.

**Sources:**
- `app/page.jsx:16-33` — the `T` theme object (dark/light surface + text ramps)
- `app/page.jsx:36-42` — the `PLAT` platform accent config
- `app/page.jsx:98-104` — `TOPIC_AREAS` topic accent colors
- `app/page.jsx:163-167` — `sigColor()` signal semantics
- `app/page.jsx:1111-1116` — `sevStyle()` alert severity semantics
- `app/layout.tsx:5-16` — Inter + Syne font variables
- `app/globals.css` — reset, keyframes, scrollbar treatment, and (as of Phase 1)
  the token + `@theme` blocks

---

## 1. Identity

| | |
|---|---|
| Product name in UI | **AetherHub** (`app/page.jsx:1306`) |
| Package name | `social-command-center` — collision, **resolved in favour of AetherHub** (see §9.1) |
| Positioning line | "Elite Social Intelligence & Growth Command Center" (`app/layout.tsx:20`) |
| Logo mark | 28×28, `borderRadius: 8`, brand gradient fill, white `Zap` glyph (filled) |
| Wordmark | Syne 800, 15px, brand gradient clipped to text (`WebkitBackgroundClip: 'text'`) |
| Browser theme color | `#6366F1` (`app/layout.tsx:24`) |

### The gradient

```
linear-gradient(135deg, #6366F1, #22D3EE)
```

Used in exactly 9 places (`app/page.jsx:388, 566, 578, 622, 654, 1081, 1302, 1305, 1336`).
It is the single strongest brand signal in the app. Its job is consistent: **logo mark,
wordmark, avatar chip, and primary/AI-invoking CTAs only**. It is never a page background,
never a card fill, never a border.

A second gradient form exists for accent rules at the top of cards:
`linear-gradient(90deg, <topic.color>, transparent)` (`app/page.jsx:277, 1013`) — a 2px
hairline that fades right.

---

## 2. Color

### 2.1 Brand ramp

| Token | Value | Role |
|---|---|---|
| `brand` / `accent` | `#6366F1` | Primary. Active nav, focus rings, primary buttons, AI attribution |
| `brand-cyan` | `#22D3EE` | Gradient terminus only — never used as a flat fill |
| `brand-300` | `#A5B4FC` | Text on an active/filled brand chip |
| `brand-400` | `#818CF8` | Interactive brand text — buzzword chips, active filter labels |

Brand alpha ladder actually in use (all `rgba(99,102,241, α)`):
`0.05` (chip rest bg) · `0.08` (light-mode accentSub) · `0.10` (focus ring, severity bg) ·
`0.12` (dark accentSub, icon tile) · `0.15` (clear-filter chip) · `0.18` (active chip bg) ·
`0.20` (result panel border) · `0.22` (light accentBorder) · `0.25` (icon tile border) ·
`0.28` (dark accentBorder) · `0.30`/`0.50` (scrollbar rest/hover).

### 2.2 Surfaces — dark (default)

| Token | Value |
|---|---|
| `bg` | `#06060F` |
| `surface` | `#0B0B1A` |
| `card` | `#0D0D20` |
| `raised` | `#0F0F26` (hover state for cards) |
| `nav-bg` | `rgba(6,6,15,0.9)` + `backdrop-filter: blur(20px)` |
| `glass` | `rgba(255,255,255,0.025)` |
| `glass-border` | `rgba(255,255,255,0.06)` |
| `border` | `rgba(255,255,255,0.05)` |
| `border-mid` | `rgba(255,255,255,0.09)` |
| `border-high` | `rgba(255,255,255,0.16)` |
| `text` | `#EAEAFF` |
| `text-sub` | `#9696B3` (was `#5C5C80` — see §9.6) |
| `text-muted` | `#7878B8` (was `#21213F` — see §9.6) |

### 2.3 Surfaces — light

| Token | Value |
|---|---|
| `bg` | `#ECEEF8` |
| `surface` | `#FFFFFF` |
| `card` | `#FFFFFF` |
| `raised` | `#F4F4FC` |
| `nav-bg` | `rgba(236,238,248,0.92)` |
| `glass` | `rgba(0,0,0,0.015)` |
| `glass-border` | `rgba(0,0,0,0.05)` |
| `border` | `rgba(0,0,0,0.055)` |
| `border-mid` | `rgba(0,0,0,0.09)` |
| `border-high` | `rgba(0,0,0,0.15)` |
| `text` | `#0D0D1E` |
| `text-sub` | `#585878` (passes AA, unchanged) |
| `text-muted` | `#6565A0` (was `#ABABCB` — see §9.6) |

Note: `bg` is a cool blue-grey, not white. The light theme is a *tinted* light theme —
it keeps the indigo cast of the dark theme rather than going neutral.

### 2.4 Semantic — signal strength (`sigColor()`)

| Signal | Color | Background | Label |
|---|---|---|---|
| high | `#10B981` | `rgba(16,185,129,0.12)` | `HIGH` |
| rising | `#F59E0B` | `rgba(245,158,11,0.12)` | `RISING` |
| (fallback) | `#52525B` | `rgba(82,82,91,0.10)` | `MODERATE` |

`#10B981` is also the standalone velocity color (`+340%` etc.) and the "saved/success"
button state.

### 2.5 Semantic — alert severity (`sevStyle()`)

| Severity | Color | Background | Border | Icon |
|---|---|---|---|---|
| critical | `#EF4444` | `rgba(239,68,68,0.10)` | `rgba(239,68,68,0.20)` | `AlertTriangle` |
| high | `#F59E0B` | `rgba(245,158,11,0.10)` | `rgba(245,158,11,0.20)` | `Zap` |
| medium | `#6366F1` | `rgba(99,102,241,0.10)` | `rgba(99,102,241,0.18)` | `Info` |
| low | `#10B981` | `rgba(16,185,129,0.10)` | `rgba(16,185,129,0.18)` | `CheckCircle` |

`#EF4444` is additionally the unread-dot / notification-badge color.

### 2.6 Platform accents

Each platform carries a 4-part set: `color` (foreground), `glow` (box-shadow),
`bg` (fill), `border`.

| Platform | color | glow | bg | border |
|---|---|---|---|---|
| LinkedIn | `#2D88FF` | `rgba(45,136,255,0.22)` | `rgba(45,136,255,0.07)` | `rgba(45,136,255,0.18)` |
| X | `#E8EAF0` | `rgba(232,234,240,0.12)` | `rgba(232,234,240,0.05)` | `rgba(232,234,240,0.12)` |
| Instagram | `#F0609E` | `rgba(240,96,158,0.22)` | `rgba(240,96,158,0.07)` | `rgba(240,96,158,0.17)` |
| YouTube | `#FF4444` | `rgba(255,68,68,0.18)` | `rgba(255,68,68,0.06)` | `rgba(255,68,68,0.16)` |
| TikTok | `#69C9D0` | `rgba(105,201,208,0.18)` | `rgba(105,201,208,0.06)` | `rgba(105,201,208,0.16)` |

X is a near-white foreground, so any filled X button flips its label to `#0d0d12`
(`app/page.jsx:324`) — the one hard-coded contrast exception in the app.

### 2.7 Topic accents

| Topic | Color |
|---|---|
| AI & Technology | `#6366F1` |
| Business & Strategy | `#22D3EE` |
| Creator Economy | `#F0609E` |
| Finance & Markets | `#10B981` |
| Sports & Culture | `#F59E0B` |

Topic cards render active state as `<color>14` fill / `<color>55` border and hover as
`<color>40` — i.e. **hex-suffix alpha**, an 8-digit hex convention used only here.

---

## 3. Typography

Two families, both loaded via `next/font/google` with `display: swap`:

| Variable | Family | Weights | Role |
|---|---|---|---|
| `--font-syne` | Syne | 700, 800 | Display: wordmark, page `h1`, modal titles |
| `--font-inter` | Inter | variable | Everything else (set on the app root) |

Fallback chain on the root: `var(--font-inter), -apple-system, sans-serif`.
Display usages append `, sans-serif` only.
A third face — `monospace` — appears for API-key field labels and values
(`app/page.jsx:1251-1252`).

### Scale (actual usage counts)

| px | Count | Role |
|---|---|---|
| 9 | 11 | Micro-badges (`HIGH`, platform tag, bottom-nav labels) |
| 10 | 36 | Metadata, timestamps, small chips |
| 11 | 47 | **The workhorse** — body text, section labels, most UI |
| 12 | 31 | Post content, buttons, inputs |
| 13 | 7 | Secondary emphasis |
| 14 | 3 | Panel titles |
| 15 | 2 | Wordmark, modal title |
| 18 | 2 | Topic emoji |
| 20 | 2 | Page `h1` (desktop), stat numbers |

This is a **dense, information-first scale** — 9–12px carries 90% of the interface.
That is a deliberate command-center posture, not an accident.

| Weight | Count | Role |
|---|---|---|
| 600 | 15 | Chips, secondary labels |
| 700 | 63 | Default emphasis — nearly every label |
| 800 | 7 | Display + stat numerals |

Regular (400) is never set explicitly; body copy inherits it.

### Letter-spacing

| Value | Applied to |
|---|---|
| `-0.02em` | Display type — `h1`, stat numerals |
| `0.04em` | Uppercase micro-labels (AI Brief, Intelligence Brief, platform tags) |
| `0.05em` | Uppercase section labels (Trending Now, Buzzwords, severity chips) |
| `0.06em` | Uppercase eyebrow labels (Morning Digest, "Your Topics") |

Rule in force: **all-caps is always tracked out; display is always tracked in.**

Line-height: `1.65` for post/body copy, `1.6` in textareas, `1.75` in the AI brief.

---

## 4. Radius

| px | Count | Applied to |
|---|---|---|
| 4 | 6 | Micro-badges, scrollbar thumb |
| 5 | 4 | Small tags |
| 7 | 7 | Compact buttons, chips |
| 8 | 6 | Logo mark, avatar chip |
| 9 | 7 | Nav buttons, icon buttons |
| 10 | 23 | **Default** — buttons, inputs, icon tiles |
| 12 | 12 | Textareas, medium panels |
| 14 | 9 | Post cards, search bar, result panels |
| 16 | 12 | Feature cards, AI brief panel |
| 18 | 2 | Largest containers (Summarizer) |
| 20 | 6 | Pill filters |
| 999 / 50% | 2 | Fully round (toggle knob, status dots) |

The de-facto ladder is `4 · 7 · 10 · 14 · 16 · 20 · full`. The 5/8/9/12/18 values are
one-off drift and should collapse into the ladder during any refactor.

---

## 5. Elevation, glass & glow

| Effect | Value | Where |
|---|---|---|
| Nav glass | `backdrop-filter: blur(20px)` + 90–92% alpha bg | Top nav, bottom nav |
| Modal scrim | `rgba(0,0,0,0.75)` + `blur(10px)` | Source modal |
| Dropdown shadow | `0 20px 60px rgba(0,0,0,0.45)` | Search results |
| Focus ring | `0 0 0 3px rgba(99,102,241,0.10)` | Active search bar |
| Platform glow | `0 0 28px <platform.glow>` | AI Brief panel |

There is **no generic shadow scale**. Depth is carried by border + background delta, not
by shadows — shadows appear only on the two genuinely floating surfaces.

---

## 6. Motion

| Duration | Role |
|---|---|
| `0.15s` | Nav / chip state changes |
| `0.18s` | Card hover (border + background) |
| `0.2s` | Input border, search bar |
| `0.3s` | Toggle switch |

Keyframes (currently inlined in a `<style>` tag at `app/page.jsx:1378-1383`):

```css
@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
```

`spin` drives every loading `RefreshCw`; `pulse` drives skeleton bars.

---

## 7. Component conventions

These are unwritten rules the code already follows consistently. Documenting them so
they survive a refactor.

1. **Card hover** — border goes to the platform/topic accent, background goes `glass → raised`.
2. **Interactive chip** — three states expressed as one accent at three alphas:
   rest `0.05`, active bg `0.18`, active border solid.
3. **Icon tile** — square, `radius: 10`, accent bg at `0.12`, accent border at `0.25`,
   accent-colored icon. Used for every panel header.
4. **Section eyebrow** — 11px / 700 / uppercase / tracked `0.05em`, preceded by a 13px
   lucide icon in an accent color.
5. **Copy affordance** — every copyable surface has a ghost button that swaps
   `Copy → Check` and its label to "Copied!" for exactly 2000ms, colored `#10B981`.
6. **Icon sizing** — 9–10px inside badges, 12–14px in buttons and nav, 16px in panel
   header tiles. From `lucide-react` throughout.
7. **Scrollbars** — 4px, transparent track, brand thumb at `0.3` → `0.5` on hover.
8. **Fabricated data must be visibly marked.** This is a rule, not a
   description of what the code happens to do today.

   **Nothing renders a fabricated number without a `<DemoChip/>` next to it.**
   Not a footnote, not a page-level disclaimer, not a note in the README — a
   visible amber marker adjacent to the number itself.

   The reasoning is about screenshots. Every part of this UI is a card or a
   panel that someone can crop and paste into Slack, and a cropped screenshot
   carries none of its page context. So the marker has to travel with the
   smallest unit anyone would plausibly capture:

   | Surface | Placement | Why |
   |---|---|---|
   | Post card, alert row, topic card | per item | Each stands alone in a crop |
   | Trending Now, Buzzwords, Recommended, AI Content Ideas | panel header | 9–11px dense rows; a chip per row would outweigh the row it annotates, and the header travels with any crop of the panel |
   | Simulated-activity banner | inline | See below |

   **Never assert liveness over fabricated data.** The activity banner used to
   read `LIVE` in green with a pulsing dot, over numbers a `setInterval` nudged
   every 3.5 seconds — the ticking existed purely to make them look live.
   Marking that was not enough, because the word itself was the false claim.
   It now reads `Simulated`, in amber, with the chip. The same applies to any
   future "real-time", "now", or "last hour" framing: if the number is made up,
   the framing has to say so.

   `DemoChip` is a single component (`app/page.jsx`) so the treatment cannot
   drift between surfaces, and so grepping `DemoChip` enumerates every
   fabricated surface in the app. When mock data is replaced by a real feed,
   removing the chip is the deliberate act that marks the data as trustworthy.

9. **The answering LLM provider is shown, not hidden.** `/api/brief` returns
   `provider`; `ProviderBadge` renders it on the AI Brief panel and the Morning
   Digest. Green and cyan are the free tiers (Groq, Gemini), amber is Claude —
   the paid one. A silently misnamed credential demotes the whole app to the
   paid provider and nothing else on screen would say so.

---

## 8. Tokens

**Source of truth: `app/globals.css`.** Both token blocks are live there as of
Phase 1. They are not duplicated here — a second copy would drift.

- `:root` / `[data-theme="dark"]` / `[data-theme="light"]` carry the `--ah-*`
  custom properties: every value in §2–§6 above, plus `color-scheme` per theme.
- `@theme { … }` carries the static Tailwind theme: brand, signal, severity,
  platform and topic colors, the type scale, tracking, and the radius ladder.
- `@theme inline { … }` carries the surface colors, which resolve through the
  `--ah-*` vars so one set of utilities serves both themes.

Four decisions worth knowing before you edit that file:

1. **The type scale resets its namespace** (`--text-*: initial`) rather than
   overriding piecemeal. Overriding `--text-sm: 11px` alone would leave Tailwind's
   default `--text-sm--line-height` of ~1.43 silently attached to it. Each size now
   ships an explicit paired line-height, and `text-3xl` upward no longer exist —
   the app has no use for them and their presence invites drift.
2. **`--radius-*` is reset the same way.** `rounded-full` is a static utility, not a
   theme value, so it survives.
3. **Surfaces use `@theme inline`, not plain `@theme`.** Plain `@theme` would emit
   `--color-canvas: var(--ah-bg)` as a second indirection resolved once at `:root`;
   `inline` puts the `var()` into the utility itself, which is what makes the
   `[data-theme]` flip work reliably regardless of which element carries the
   attribute.
4. **The type scale deliberately overrides Tailwind's defaults rather than adding to
   them.** AetherHub's `text-sm` is 11px, not 14px. Anything else means every
   component reaching for `text-[11px]`, which defeats the point of tokenizing.

Two custom utilities are defined alongside: `bg-brand-gradient` and
`text-brand-gradient` (the clipped-to-text wordmark treatment).

## 9. Open issues found during the audit

These are recorded, not fixed.

1. **Name collision — resolved: AetherHub wins.** The UI, `<title>`, and default export
   already say *AetherHub*; the package, the repo, and the deploy target say
   *social-command-center*. **AetherHub** is the canonical product name. Still to do:
   rename `package.json` `"name"` to `aetherhub`, and decide separately whether to
   rename the GitHub repo and Vercel project (both are cosmetic and can lag).
2. **Radius drift.** 5, 8, 9, 12, and 18px are single- or double-use values sitting
   between rungs of an otherwise clean ladder.
3. **Two alpha notations.** `rgba(r,g,b,a)` for theme colors, 8-digit hex suffixes
   (`${color}14`, `${color}55`) for topic colors. Same concept, two spellings.
4. **`#FF4444` vs `#EF4444`.** YouTube's accent and the critical-alert red are
   different reds a hair apart. Intentional or not, they will read as a mistake if
   they ever land next to each other.
5. **Theme is JS state, not a CSS attribute.** `t.*` object lookups mean no CSS-only
   surface can participate in theming, and there is no `prefers-color-scheme` support
   at all — the app hard-defaults to dark on every load with no persistence.
6. **Contrast — fixed in the token layer, `T` still diverges.** Measured against the
   worst-case surface in each theme (`raised #0F0F26` dark, `bg #ECEEF8` light):

   | Token | Was | Ratio | Now | Ratio |
   |---|---|---|---|---|
   | dark `text-muted` | `#21213F` | **1.30:1** | `#7878B8` | 4.64:1 |
   | dark `text-sub` | `#5C5C80` | **3.01:1** | `#9696B3` | 6.55:1 |
   | light `text-muted` | `#ABABCB` | **1.93:1** | `#6565A0` | 4.63:1 |
   | light `text-sub` | `#585878` | 5.89:1 | unchanged | 5.89:1 |

   `text-sub` had to move too. `text-muted` alone could not be lifted to 4.5:1
   without becoming *brighter* than `text-sub` and inverting the hierarchy. Both
   replacements preserve the original hue and saturation; only lightness moved.

   `text-muted` is not decorative — it carries rank numerals, timestamps, hint copy
   and the "Add source" affordance (`app/page.jsx:384, 740, 988, 996, 1145, 1191,
   1196, 1253`), so 4.5:1 (WCAG AA, normal text) is the right bar.

   **Now applied in both places.** The values landed in `globals.css` first
   (additive, no visual change), and `T` in `app/page.jsx` has since been moved
   to match — so the running app passes AA, not just the token layer. Verified
   against every surface each colour actually sits on:

   | Token | Worst case |
   |---|---|
   | dark `text` | 15.86:1 |
   | dark `textSub` | 6.55:1 |
   | dark `textMuted` | 4.64:1 |
   | light `text` | 16.60:1 |
   | light `textSub` | 5.89:1 |
   | light `textMuted` | 4.63:1 |

   Secondary text is visibly lighter than it was. That is the fix, not a
   regression.

7. ~~Keyframes inlined in the component tree.~~ **Fixed** — `spin`, `pulse` and the
   placeholder rule moved from the `<style>` tag in `app/page.jsx` into
   `app/globals.css`. The tag is gone.
8. ~~`height: 100vh` clips the bottom nav on mobile.~~ **Fixed** — the app root now
   uses `100dvh` (`app/page.jsx:1371`). `body { overflow: hidden }` stays; the dead
   Pages-Router `#__next` selector was dropped from `globals.css`.
