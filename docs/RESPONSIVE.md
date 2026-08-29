# The responsive contract

**Read this before you touch a view.** It is enforced — `npm run audit:responsive`
drives a real browser, measures real geometry, and fails CI if a view breaks any
rule below. There is no manual responsive checking in this project and there
should never need to be again.

Mobile-first is a hard requirement, not a preference. Every layout decision
starts at 390px and adds capability upward.

---

## The three breakpoints

| Name | Width | Stands for | CSS boundary |
|---|---|---|---|
| **mobile** | **390px** | iPhone 14/15 | `≤ 720px` fine-tuning, `≤ 1100px` structure |
| **iPad** | **820px** | iPad Air portrait | `≤ 1024px` grid, `≤ 1100px` masthead |
| **desktop** | **1280px+** | laptop and up | `≥ 1101px` |

These three widths are what the audit measures. The CSS boundaries are where
behaviour actually changes — they sit *above* each target width on purpose, so a
device slightly wider than the target still gets the right layout.

---

## Layout intent at each breakpoint

### mobile — 390px

- **Masthead is two rows.** Row 1: logo + controls. Row 2: the category nav,
  full width, scrolling edge to edge.
- **Category nav is full-width and horizontally scrollable.** All seven tabs
  render; the strip scrolls to reach the ones past the fold.
- **Feed is one column.** `.page-grid` collapses; the Live Signal rail moves
  below the story column rather than beside it.
- **Hero + stacked cards, single column.** `.gn-grid` collapses; the hero sits
  above its secondary rail instead of beside it.
- **Search is hidden**, Customize is hidden — both are reachable from the
  section nav below. Analyze, refresh, theme and profile stay.
- **Every control is at least 34px tall.**

### iPad — 820px

- **Masthead two rows**, all categories visible without scrolling.
- **Search reappears** (hidden only below 720px).
- **Feed is still one column**; the rail is still below.
- **Hero image is capped.** 16/10 across a 772px column is ~480px tall and
  buries everything below it, so single-column heroes are 16/9, max 340px.
- **Touch rules still apply** — an iPad is a thumb device.

### desktop — 1280px+

- **Masthead is two rows**, same as every other breakpoint: identity +
  controls, then the category nav full-width. All categories visible, no scroll.
- **Feed is two columns**: `.page-grid` at `2.1fr 1fr` — story column ~68%,
  Live Signal rail ~32%.
- **Top Stories is hero + rail**: `.gn-grid` at `53% 1fr` — a large lead card
  beside a vertical rail of compact secondaries.
- **Pointer sizing.** 30–32px controls are correct here; this is the ported
  MyNewsHub design and the tap-target rule does not apply.

---

## The four rules the gate enforces

`scripts/responsive-audit.mjs` runs **3 breakpoints × 2 themes × 7 views = 42
cases** and fails the build on any violation.

### 1. No document-level horizontal overflow
`document.documentElement.scrollWidth` must not exceed the viewport. A page that
scrolls sideways on a phone is broken, full stop.

### 2. No element wider than its parent's content box
Catches the failure the first rule only sees the shadow of. Exempt: anything
inside an ancestor with `overflow-x: auto | scroll | hidden` — a tab strip is
*supposed* to overflow itself and scroll.

> The usual cause is CSS Grid's automatic minimum. A bare `1fr` is
> `minmax(auto, 1fr)`, and that `auto` refuses to shrink below the items'
> min-content width. **Use `minmax(0, 1fr)`** whenever a track holds text or
> cards. This exact bug blew Studio's column out to 407px inside a 358px page.

### 3. No collapsed nav or tab strip
`.nav-tabs` must be ≥240px wide, must render every category tab (count comes
from `CATEGORIES`), no tab may have zero width, and if the strip overflows it
must scroll. **At desktop it must not overflow at all** — every category has to
be visible without scrolling under a pointer.

> The masthead is therefore **two rows at every width**: identity + controls,
> then the category nav across the full container. It was briefly one row on
> desktop; adding an eighth category clipped the last tab by 127px at 1280px
> while the strip still technically scrolled, so nothing failed and the category
> simply looked absent.

> This rule exists because it already happened. `.nav-tabs` is `flex: 1` between
> two `flex-shrink: 0` siblings, so when the masthead ran out of room the tab
> strip was what silently gave — it collapsed to **0px** and the feed became
> unfilterable on every phone. Nothing in the stylesheet looked wrong.

### 4. No tap target under 34px tall or 24px wide
Applies at **touch breakpoints only** (mobile, iPad). `button`, `a[href]`,
`input`, `select`, `textarea`, `[role="button"]`.

> The floor is enforced by a blanket rule in `globals.css` under
> `@media (max-width: 1100px)`, not per component — the six legacy dashboard
> views style hundreds of controls inline, and a rule there cannot be forgotten
> by whatever view gets added next.

**Console errors also fail the build.** They are how the `/api/brief` 500 was
found: it fired on the Intelligence view at every breakpoint on a fresh clone.

---

## Dark mode

Verified at **all three** breakpoints, both themes, all seven views — the full
42-case matrix runs twice over, once per theme.

Theme is a single `data-theme` attribute on `<html>`. Every view reads the same
CSS custom properties, so there is exactly one thing to switch and no view can
opt out. Never branch on theme in JavaScript.

---

## Running it

```bash
npm run build            # the audit tests the production build
npm run audit:responsive
```

It boots its own fixture feed server and its own `next start`, then tears both
down — nothing to manage. It runs with **no API keys set on purpose**, because
that is what CI and a fresh clone look like, and the degraded state has to be
correct too.

| Env var | Purpose |
|---|---|
| `AUDIT_BASE_URL` | Point at an already-running server, skip spawning |
| `CHROMIUM_PATH` | Explicit Chromium binary where Playwright can't resolve one |
| `AUDIT_HEADED=1` | Watch it run |

First run needs a browser: `npx playwright install --with-deps chromium`.

---

## Adding a view

1. Start at 390px. If it works there, widening it is easy; the reverse is not.
2. Use `minmax(0, 1fr)`, never a bare `1fr`, for any track holding content.
3. Add `min-width: 0` to flex and grid children that hold text.
4. Do not size layout from JavaScript. `useWindowSize()` initialises to 1280, so
   a `isMobile ? … : …` ternary renders the *desktop* layout on a phone's first
   paint. Use a media query. (This is why `.studio-grid` exists.)
5. Register the view in `VIEWS` in `scripts/responsive-audit.mjs` so the gate
   covers it. **A view not listed there is a view nobody is checking.**
6. Run `npm run audit:responsive` before you push.
