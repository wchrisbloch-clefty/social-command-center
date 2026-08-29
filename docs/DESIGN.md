# Signal Desk — the visual system

Quiet chrome, loud data. Everything on screen is white, black or gray **except**
the small marks that carry meaning: a category's colour and a velocity word.

Paired with [`docs/RESPONSIVE.md`](RESPONSIVE.md), which governs layout. This
file governs surface, type and colour.

---

## Hard rules

These are not preferences. A change that breaks one is a bug.

- **Velocity is a WORD** — High / Rising / Moderate. Never an arrow, gauge,
  progress bar, sparkline, or glow.
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
| Moderate | `#737373` neutral | `#7d7d7d` |

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

## Dark mode

One `data-theme` attribute on `<html>`. Every view reads the same custom
properties, so nothing can opt out. The same category hues are lifted for a dark
ground rather than swapped for different ones. Never branch on theme in JS.
