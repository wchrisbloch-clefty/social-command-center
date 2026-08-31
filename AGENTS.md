<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mobile-first is a hard requirement

**Before you touch a view, read [`docs/RESPONSIVE.md`](docs/RESPONSIVE.md).** It
is the layout contract, and it is enforced — not advisory.

`npm run audit:responsive` drives a real Chromium across **3 breakpoints × 2
themes × 12 views** and fails CI on any of:

1. document-level horizontal overflow
2. an element wider than its parent's content box
3. a collapsed nav/tab strip
4. a tap target under 34px tall (touch breakpoints only)
5. a console error

Targets: **mobile 390px · iPad 820px · desktop 1280px+**. Start at 390 and add
capability upward.

Three rules that cause most failures:

- Use `minmax(0, 1fr)`, never a bare `1fr`, for any grid track holding content.
  A bare `1fr` is `minmax(auto, 1fr)` and refuses to shrink below min-content.
- Add `min-width: 0` to flex and grid children that hold text.
- **Never size layout from JavaScript.** `useWindowSize()` initialises to 1280,
  so `isMobile ? … : …` renders the desktop layout on a phone's first paint.
  Use a media query.

A new view must be added to `VIEWS` in `scripts/responsive-audit.mjs`, or
nothing is checking it.

# API endpoints degrade, they do not crash

A missing credential or a dead upstream is a normal state. Log it loudly on the
server (`console.warn` naming the source and status); return **200** to the
client with an explicit flag (`needsKey`, `degraded`, per-source `ok: false`) and
render a clear state. Reserve 4xx/5xx for genuinely malformed requests.

`/api/social`, `/api/youtube` and `/api/brief` all follow this. A console error
fails the responsive audit, so a route that 500s on a fresh clone breaks the
build.

# Visual system

**[`docs/DESIGN.md`](docs/DESIGN.md) governs surface, type and colour** — read it
before styling anything. Hard rules: velocity and tier are WORDS never icons, no
platform logos, no monospace, no glow/shadow/pulse, one typeface at two weights,
and the only colours on screen are the eight muted category hues plus three
velocity colours.
