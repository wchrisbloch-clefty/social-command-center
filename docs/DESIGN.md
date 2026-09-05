# Signal Desk — the visual system

Quiet chrome, loud data. Everything on screen is white, black or gray **except**
the small marks that carry meaning: a category's colour and a velocity word.

Paired with [`docs/RESPONSIVE.md`](RESPONSIVE.md), which governs layout. This
file governs surface, type and colour.

---

## Hard rules

These are not preferences. A change that breaks one is a bug.

- **A single signal's velocity is a WORD** — High / Rising / Moderate. Never an
  arrow, gauge, progress bar, sparkline, dot or glow *on the item itself*.
  Aggregates are a different question — see [Charts](#charts) — but nothing
  attached to one row may be a shape.
- **Tier is a WORD** — Verified / Alt. perspective. Never a shield, dot or icon.
- **No platform logos.** Platform is plain text in the metadata line.
- **No monospace or terminal fonts** outside a literal code block.
- **No neon, no glow, no drop shadows, no blinking, no pulsing.** Structure comes
  from 1px hairlines, never from elevation.
- **One typeface, two weights** — Inter at 400 and 500. Nothing else.

## Surfaces

| Token | Light | Dark |
|---|---|---|
| `--bg` / `--surface` | `#ffffff` | `#0f0f0f` / `#171717` |
| `--surface2` (hover only) | `#fafafa` | `#1f1f1f` |
| `--border` (the hairline) | `#ededed` | `#2a2a2a` |
| `--text` (headlines) | `#171717` | `#ededed` |
| `--text3` (metadata) | `#737373` | `#7d7d7d` |
| `--accent` (active tab, primary button) | `#171717` | `#ededed` |

Pure white. No cream, no warm tint, no gray-shade surfaces.

## Type scale

| Token | Size | Used for |
|---|---|---|
| `--fs-meta` | 11.5px | category label, source, platform, timestamp |
| `--fs-body` | 13px | body copy, controls |
| `--fs-headline` | 14.5px | the signal headline |
| `--fs-lead` | 17px | lead card headline |
| `--fs-title` | 20px | view title |

## Category → colour map

One muted, editorial colour per category, used in exactly two places: the **3px
left stripe** on its cards and its **small text label**. Every light value clears
4.5:1 on white, so the label reads as text rather than decoration.

| Category | Light | Dark | Tone |
|---|---|---|---|
| General | `#5b6470` | `#9aa4b0` | slate |
| Business & Markets | `#8a6a2f` | `#d1a758` | soft brass |
| Energy | `#2f6b6b` | `#5fb0b0` | slate-teal |
| AI & Tech | `#6b5b8a` | `#a897c9` | dusty violet |
| Sports | `#9c5a3c` | `#d18a6a` | muted clay |
| Health | `#4a7355` | `#82b894` | sage |
| Pop Culture | `#96536b` | `#d18aa5` | dusty rose |
| Ancient Mysteries | `#6b5a44` | `#b39c7d` | bronze |

Resolution is automatic: put `data-cat="<id>"` on an element and `--cat` is set
for it, so a stripe and its label can never disagree.

## Velocity colours

The only other colour on screen.

| Signal | Light | Dark |
|---|---|---|
| High | `#15803d` green | `#4ade80` |
| Rising | `#b45309` amber | `#fbbf24` |
| Moderate | `#737373` neutral | `#838383` |

Dark `Moderate` was `#7d7d7d` until `npm run verify:contrast` measured it at
4.36:1 against a card — under the 4.5:1 WCAG minimum for text. The word tracks
`--text3`, so both moved together.

## The signal card

```
┌ 3px category stripe
│ Energy · @DanielYergin · X · 24m          High
│ Grid-scale storage deployments double…    Alt. perspective
└ 1px #ededed hairline, 6px radius, white
```

Metadata line, then the headline, with velocity and tier stacked on the right.
No thumbnail: density beats decoration, and the headline is the thing being
scanned. The lead card is the *same component* one step larger, not a separate
one.

## Category nav

Simple horizontal tabs. Active is solid near-black with white text; inactive is
plain gray. No pills, no borders, no underline chrome. It still reflows to the
mobile scrollable strip — see `docs/RESPONSIVE.md`.

**Podcasts sits in the same row as a peer, not as a category.** It is a content
*type*: an episode already carries a topic category of its own and appears in
that category's feed, so filing "Podcasts" among the topics would put a
source-type filter in a row of subject filters. It renders after a hairline —
Signal Desk marks a boundary with a rule, never with a colour, an icon or a
pill — and carries `.nav-type-tab` rather than `.nav-tab`.

That class split is **load-bearing, not cosmetic**: the responsive gate counts
`.nav-tab` against `CATEGORIES.length` so a stray ninth one is caught, and a
Podcasts button wearing that class would read as a ninth category and weaken the
check. The type tab has its own assertions instead — present, non-zero width,
not squeezed below its label.

## Charts

Four of them, and there will not be a fifth without a reason. They live in
`lib/chart-data.js` (the maths, pure) and the `BarSeries` / `Sparkline` /
`SignalMixStrip` components (the marks).

| Chart | Where | Answers |
|---|---|---|
| Category bars | Discover | which categories are moving, and by how much |
| Volume sparkline | Discover | is the feed accelerating or dying off |
| Velocity mix strip | Discover | how much of the feed is actually High |
| Topic bars | Podcasts | which subjects several shows reached independently |

**The rules, which are not negotiable:**

- **A chart may only draw what the pipeline produced.** Every series comes from
  items that have been through `normalizeSignal()`. No smoothing, no
  interpolation, no projection, and no zero-filled padding — an empty series
  renders an empty *state*, because a flat line reads as "we measured, and the
  answer was nothing", which is a different claim from "nothing has arrived
  yet". Enforced by `npm run verify:charts`.
- **The numbers are TEXT; the mark is the supplement.** That is why no chart
  needs a `role="img"` description and why every track, stroke and segment is
  `aria-hidden`. A screen reader gets the whole series by reading the list.
- **No chart introduces a colour.** A category bar carries `data-cat` and
  inherits `--cat`. A velocity segment uses the three velocity tokens. Anything
  uncategorised is `--text3`. Enforced by `npm run verify:contrast`, which holds
  every mark to WCAG 1.4.11's 3.0:1 in both themes.
- **No axes, gridlines, legends, tooltips, rounded caps or gradients.** A
  gridline on a five-row bar chart is decoration. Where a number matters it is
  written underneath.
- **Aggregate shapes only.** A shape describing the whole feed is fine; a shape
  attached to one signal is not, and never will be — that is the hard rule at
  the top of this file.

## Loading and empty states

- **Skeletons, never spinners.** A skeleton mirrors the geometry of the row it
  replaces so nothing reflows when the content lands, and it is *static*: no
  pulse, no shimmer. See `docs/RESPONSIVE.md` and `npm run audit:skeletons`.
- **An empty state is a sentence plus a way out.** Title says what is empty,
  body says why, and there is at least one real control — refetch, widen the
  window, clear the search. "Try again later" is not an action.

## Numbers

Tabular figures everywhere a digit appears. Every number in this app sits in a
column, a right-aligned note, or a value that refreshes in place; proportional
figures make those jitter sideways as the digits change, which reads as the
layout moving rather than the number changing. One shared rule in
`globals.css` names every class that renders one, and rule (5) of the
responsive audit checks the computed style rather than trusting the list.

## Dark mode

One `data-theme` attribute on `<html>`. Every view reads the same custom
properties, so nothing can opt out. The same category hues are lifted for a dark
ground rather than swapped for different ones. Never branch on theme in JS.
