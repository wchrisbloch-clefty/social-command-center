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
- `app/globals.css:17-20` — scrollbar treatment
- `app/page.jsx:1378-1383` — inline `@keyframes` (spin, pulse)

---

## 1. Identity

| | |
|---|---|
| Product name in UI | **AetherHub** (`app/page.jsx:1306`) |
| Package name | `social-command-center` — **collision, unresolved** (see §9) |
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
| `text-sub` | `#5C5C80` |
| `text-muted` | `#21213F` |

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
| `text-sub` | `#585878` |
| `text-muted` | `#ABABCB` |

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

---

## 8. Tokens

### 8.1 CSS custom properties

Drop into `app/globals.css` **below** the `@import "tailwindcss";` line. Values are
transcribed 1:1 from `T`, `PLAT`, `sigColor()`, `sevStyle()` and `TOPIC_AREAS`.

```css
:root {
  /* ── Brand ─────────────────────────────────────────────── */
  --ah-brand:           #6366F1;
  --ah-brand-cyan:      #22D3EE;
  --ah-brand-300:       #A5B4FC;
  --ah-brand-400:       #818CF8;
  --ah-gradient:        linear-gradient(135deg, #6366F1, #22D3EE);

  /* ── Semantic: signal ──────────────────────────────────── */
  --ah-signal-high:     #10B981;
  --ah-signal-rising:   #F59E0B;
  --ah-signal-moderate: #52525B;

  /* ── Semantic: severity ────────────────────────────────── */
  --ah-sev-critical:    #EF4444;
  --ah-sev-high:        #F59E0B;
  --ah-sev-medium:      #6366F1;
  --ah-sev-low:         #10B981;

  /* ── Platform accents ──────────────────────────────────── */
  --ah-plat-linkedin:   #2D88FF;
  --ah-plat-x:          #E8EAF0;
  --ah-plat-x-on:       #0D0D12;  /* label color on a filled X surface */
  --ah-plat-instagram:  #F0609E;
  --ah-plat-youtube:    #FF4444;
  --ah-plat-tiktok:     #69C9D0;

  /* ── Topic accents ─────────────────────────────────────── */
  --ah-topic-ai:        #6366F1;
  --ah-topic-biz:       #22D3EE;
  --ah-topic-creator:   #F0609E;
  --ah-topic-finance:   #10B981;
  --ah-topic-sports:    #F59E0B;

  /* ── Radius ladder ─────────────────────────────────────── */
  --ah-radius-xs:   4px;
  --ah-radius-sm:   7px;
  --ah-radius-md:  10px;
  --ah-radius-lg:  14px;
  --ah-radius-xl:  16px;
  --ah-radius-pill: 20px;
  --ah-radius-full: 9999px;

  /* ── Motion ────────────────────────────────────────────── */
  --ah-dur-fast:   0.15s;
  --ah-dur-card:   0.18s;
  --ah-dur-input:  0.2s;
  --ah-dur-toggle: 0.3s;

  /* ── Elevation ─────────────────────────────────────────── */
  --ah-blur-nav:      20px;
  --ah-blur-scrim:    10px;
  --ah-shadow-pop:    0 20px 60px rgba(0, 0, 0, 0.45);
  --ah-ring-focus:    0 0 0 3px rgba(99, 102, 241, 0.10);
  --ah-glow-spread:   28px;

  /* ── Type ──────────────────────────────────────────────── */
  --ah-font-display: var(--font-syne), sans-serif;
  --ah-font-body:    var(--font-inter), -apple-system, sans-serif;
  --ah-track-tight:  -0.02em;
  --ah-track-label:   0.04em;
  --ah-track-section: 0.05em;
  --ah-track-eyebrow: 0.06em;
}

/* ── Surfaces: dark (default) ────────────────────────────── */
:root,
[data-theme="dark"] {
  --ah-bg:           #06060F;
  --ah-surface:      #0B0B1A;
  --ah-card:         #0D0D20;
  --ah-raised:       #0F0F26;
  --ah-nav-bg:       rgba(6, 6, 15, 0.9);
  --ah-glass:        rgba(255, 255, 255, 0.025);
  --ah-glass-border: rgba(255, 255, 255, 0.06);
  --ah-border:       rgba(255, 255, 255, 0.05);
  --ah-border-mid:   rgba(255, 255, 255, 0.09);
  --ah-border-high:  rgba(255, 255, 255, 0.16);
  --ah-text:         #EAEAFF;
  --ah-text-sub:     #5C5C80;
  --ah-text-muted:   #21213F;
  --ah-accent-sub:    rgba(99, 102, 241, 0.12);
  --ah-accent-border: rgba(99, 102, 241, 0.28);
}

/* ── Surfaces: light ─────────────────────────────────────── */
[data-theme="light"] {
  --ah-bg:           #ECEEF8;
  --ah-surface:      #FFFFFF;
  --ah-card:         #FFFFFF;
  --ah-raised:       #F4F4FC;
  --ah-nav-bg:       rgba(236, 238, 248, 0.92);
  --ah-glass:        rgba(0, 0, 0, 0.015);
  --ah-glass-border: rgba(0, 0, 0, 0.05);
  --ah-border:       rgba(0, 0, 0, 0.055);
  --ah-border-mid:   rgba(0, 0, 0, 0.09);
  --ah-border-high:  rgba(0, 0, 0, 0.15);
  --ah-text:         #0D0D1E;
  --ah-text-sub:     #585878;
  --ah-text-muted:   #ABABCB;
  --ah-accent-sub:    rgba(99, 102, 241, 0.08);
  --ah-accent-border: rgba(99, 102, 241, 0.22);
}
```

The theme switch currently lives in React state (`const [dark, setDark] = useState(true)`,
`app/page.jsx:1363`). To use the block above, that state needs to write
`data-theme` onto `<html>` instead of selecting a JS object. That is a one-line change
but it is a **product-code change** — not made here.

### 8.2 Tailwind 4 theme extension

Tailwind 4 has no `tailwind.config.js`; the theme is declared in CSS via `@theme`.
This goes in `app/globals.css`, after `@import "tailwindcss";`.

> **Not verified against installed Tailwind.** `node_modules/` is absent in this
> checkout and the Context7 MCP endpoint is blocked by this environment's network
> policy (see the setup notes). Re-verify the `@theme` directive against Tailwind
> 4's own docs before relying on this block.

```css
@theme {
  /* Brand */
  --color-brand:        #6366F1;
  --color-brand-cyan:   #22D3EE;
  --color-brand-300:    #A5B4FC;
  --color-brand-400:    #818CF8;

  /* Signal */
  --color-signal-high:     #10B981;
  --color-signal-rising:   #F59E0B;
  --color-signal-moderate: #52525B;

  /* Severity */
  --color-sev-critical: #EF4444;
  --color-sev-high:     #F59E0B;
  --color-sev-medium:   #6366F1;
  --color-sev-low:      #10B981;

  /* Platform */
  --color-linkedin:  #2D88FF;
  --color-x:         #E8EAF0;
  --color-instagram: #F0609E;
  --color-youtube:   #FF4444;
  --color-tiktok:    #69C9D0;

  /* Topic */
  --color-topic-ai:      #6366F1;
  --color-topic-biz:     #22D3EE;
  --color-topic-creator: #F0609E;
  --color-topic-finance: #10B981;
  --color-topic-sports:  #F59E0B;

  /* Surfaces — these read the runtime vars so one set of utilities
     serves both themes and flips with [data-theme]. */
  --color-bg:           var(--ah-bg);
  --color-surface:      var(--ah-surface);
  --color-card:         var(--ah-card);
  --color-raised:       var(--ah-raised);
  --color-glass:        var(--ah-glass);
  --color-line:         var(--ah-border);
  --color-line-mid:     var(--ah-border-mid);
  --color-line-high:    var(--ah-border-high);
  --color-ink:          var(--ah-text);
  --color-ink-sub:      var(--ah-text-sub);
  --color-ink-muted:    var(--ah-text-muted);

  /* Type */
  --font-display: var(--font-syne), sans-serif;
  --font-body:    var(--font-inter), -apple-system, sans-serif;

  /* Dense information scale — matches actual usage, not Tailwind defaults */
  --text-2xs:  9px;
  --text-xs:  10px;
  --text-sm:  11px;
  --text-base:12px;
  --text-md:  13px;
  --text-lg:  14px;
  --text-xl:  15px;
  --text-2xl: 20px;

  --tracking-tight:   -0.02em;
  --tracking-label:    0.04em;
  --tracking-section:  0.05em;
  --tracking-eyebrow:  0.06em;

  /* Radius ladder */
  --radius-xs:   4px;
  --radius-sm:   7px;
  --radius-md:  10px;
  --radius-lg:  14px;
  --radius-xl:  16px;
  --radius-pill:20px;

  /* Motion */
  --animate-spin-slow: spin 1s linear infinite;
}

@utility bg-brand-gradient {
  background-image: linear-gradient(135deg, #6366F1, #22D3EE);
}

@utility text-brand-gradient {
  background-image: linear-gradient(135deg, #6366F1, #22D3EE);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

Deliberate deviation: the type scale **overrides** Tailwind's defaults rather than
adding to them. AetherHub's `text-sm` is 11px, not 14px. Anything else would mean
every component reaching for arbitrary values like `text-[11px]`, which defeats the
point of tokenizing.

---

## 9. Open issues found during the audit

These are recorded, not fixed.

1. **Name collision.** The UI, `<title>`, and default export all say *AetherHub*; the
   package, the repo, and the deploy target all say *social-command-center*. Needs a
   decision.
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
6. **Contrast.** `--ah-text-muted: #21213F` on `--ah-bg: #06060F` is roughly 1.6:1.
   It is used for de-emphasized counters, but it is below any WCAG threshold.
7. **Keyframes are inlined** in a `<style>` tag inside the component tree
   (`app/page.jsx:1378-1383`) rather than living in `globals.css`.
8. **`body { overflow: hidden }`** in `globals.css:14` plus `height: 100vh` on the
   root: on mobile browsers with dynamic toolbars this clips the bottom nav. `100dvh`
   is the fix.
