# Source map — name → platform → handle → category

**Derived from `config/sources.js`** by `npm run sources:map`. Not a parallel
list: add a source there and it shows up here. This file carries only the
provenance a config line cannot — how each handle was confirmed.

Categorization is local (`lib/categorize.js`, keyword scoring, no external
calls). Tier is derived from platform and never hand-written.

- **40** sources wired (23 RSSHub/direct, 17 YouTube)
- **21** handles verified by search
- **2** flagged `assumption` — **manual confirmation needed**
- **12** parked (see `config/parking-lot.md`)
- **10** on X — wired and correct, but degraded on the free instance

---

## Wired sources

| # | Name | Platform | Handle / route | Category | Tier | Handle |
|---|---|---|---|---|---|---|
| 1 | Daniel Yergin | X | `/twitter/user/DanielYergin` | Energy | street | verified |
| 2 | Doug Sheridan | X | `/twitter/user/DougSheridan` | Energy | street | verified |
| 3 | Alex Epstein | X | `/twitter/user/AlexEpstein` | Energy | street | verified |
| 4 | Jeff Krimmel | X | `/twitter/user/JeffKrimmel` | Energy | street | verified |
| 5 | Rich Miller | X | `/twitter/user/Tech_Journalism` | Energy | street | verified |
| 6 | Jeff Immelt | X | `/twitter/user/JeffImmelt` | Business & Markets | street | verified |
| 7 | John Chambers | X | `/twitter/user/JohnTChambers` | Business & Markets | street | verified |
| 8 | Eddie Donmez | X | `/twitter/user/eddiedonmez` | Business & Markets | street | verified |
| 9 | Tim Grover | X | `/twitter/user/ATTACKATHLETICS` | Health | street | verified |
| 10 | Annie Jacobsen | X | `/twitter/user/AnnieJacobsen` | Ancient Mysteries | street | verified |
| 11 | r/CFB | Reddit | `https://www.reddit.com/r/CFB/hot/.rss` | Sports | street | **unknown** |
| 12 | r/CollegeBasketball | Reddit | `https://www.reddit.com/r/CollegeBasketball/hot/.rss` | Sports | street | **unknown** |
| 13 | r/nfl | Reddit | `https://www.reddit.com/r/nfl/hot/.rss` | Sports | street | **unknown** |
| 14 | r/nba | Reddit | `https://www.reddit.com/r/nba/hot/.rss` | Sports | street | **unknown** |
| 15 | r/baseball | Reddit | `https://www.reddit.com/r/baseball/hot/.rss` | Sports | street | **unknown** |
| 16 | r/golf | Reddit | `https://www.reddit.com/r/golf/hot/.rss` | Sports | street | **unknown** |
| 17 | r/horseracing | Reddit | `https://www.reddit.com/r/horseracing/hot/.rss` | Sports | street | **unknown** |
| 18 | r/Clemson | Reddit | `https://www.reddit.com/r/Clemson/hot/.rss` | Sports | street | **unknown** |
| 19 | r/BigBlueNation · football | Reddit | `https://www.reddit.com/r/BigBlueNation/search.rss?q=football&restrict_sr=1&sort=new` | Sports | street | **unknown** |
| 20 | r/BigBlueNation | Reddit | `https://www.reddit.com/r/BigBlueNation/hot/.rss` | Sports | street | **unknown** |
| 21 | r/Texans | Reddit | `https://www.reddit.com/r/Texans/hot/.rss` | Sports | street | **unknown** |
| 22 | r/Astros | Reddit | `https://www.reddit.com/r/Astros/hot/.rss` | Sports | street | **unknown** |
| 23 | r/rockets | Reddit | `https://www.reddit.com/r/rockets/hot/.rss` | Sports | street | **unknown** |
| 24 | Peter Zeihan | YouTube | `ZeihanonGeopolitics` | Business & Markets | mainstream | verified |
| 25 | Harry Stebbings | YouTube | `20VC` | Business & Markets | mainstream | verified |
| 26 | Daniel Pink | YouTube | `danielpinktv` | Business & Markets | mainstream | verified |
| 27 | Christopher Voss | YouTube | `NegotiationMastery` | Business & Markets | mainstream | verified |
| 28 | Chase Hughes | YouTube | `chasehughesofficial` | Business & Markets | mainstream | verified |
| 29 | Jay Egg | YouTube | `EggGeothermal` | Energy | mainstream | **assumption** |
| 30 | Chris Williamson | YouTube | `ChrisWillx` | Health | mainstream | verified |
| 31 | David Sinclair | YouTube | `LifespanOfficial` | Health | mainstream | verified |
| 32 | Jocko Willink | YouTube | `JockoPodcast` | Health | mainstream | verified |
| 33 | MrBallen | YouTube | `MrBallen` | Ancient Mysteries | mainstream | verified |
| 34 | Jesse Michels | YouTube | `JesseMichels` | Ancient Mysteries | mainstream | verified |
| 35 | Timothy Alberino | YouTube | `TimothyAlberino` | Ancient Mysteries | mainstream | verified |
| 36 | Michael Button | YouTube | `UCRDZ_t_-uHLsz_Otq6iOgyg` | Ancient Mysteries | mainstream | **assumption** |
| 37 | NFL | YouTube | `NFL` | Sports | mainstream | **unknown** |
| 38 | NBA | YouTube | `NBA` | Sports | mainstream | **unknown** |
| 39 | MLB | YouTube | `MLB` | Sports | mainstream | **unknown** |
| 40 | PGA Tour | YouTube | `PGATOUR` | Sports | mainstream | **unknown** |

---

## ⚠ Unverified — manual confirmation needed (2)

### Jay Egg — YouTube `EggGeothermal`
Only a LEGACY username was found (youtube.com/user/EggGeothermal), not a modern @handle. YouTube usually mints a matching handle, but this is unconfirmed. Fallback: X @GeoJayegg.

### Michael Button — YouTube `UCRDZ_t_-uHLsz_Otq6iOgyg`
Channel confirmed ("Ancient History BA", ~200K subs) but NO @handle could be confirmed — search surfaced two channels. Wired by channelId UCRDZ_t_-uHLsz_Otq6iOgyg. If it returns nothing, the alternates are @MichaelButtonHistory1 or X @MichaelButtonX.


---

## How each handle was established

**Daniel Yergin** — `verified` · X `/twitter/user/DanielYergin`
: X profile confirms author of The Prize/The New Map, S&P Global vice chairman.

**Doug Sheridan** — `verified` · X `/twitter/user/DougSheridan`
: EnergyPoint Research; X-native, posts daily oil & gas commentary.

**Alex Epstein** — `verified` · X `/twitter/user/AlexEpstein`
: Fossil Future author; X is his primary channel.

**Jeff Krimmel** — `verified` · X `/twitter/user/JeffKrimmel`
: Confirmed @JeffKrimmel. CORRECTION: firm is Krimmel Strategy Group, not "Krimmel Capital".

**Rich Miller** — `verified` · X `/twitter/user/Tech_Journalism`
: Data Center Frontier founder/editor-at-large — the data-centre Rich Miller, per your call, not the Bloomberg economics reporter.

**Jeff Immelt** — `verified` · X `/twitter/user/JeffImmelt`
: Former GE CEO, now NEA venture partner. ~53K followers, low posting volume.

**John Chambers** — `verified` · X `/twitter/user/JohnTChambers`
: Founder JC2 Ventures, Chairman Emeritus Cisco.

**Eddie Donmez** — `verified` · X `/twitter/user/eddiedonmez`
: Founder of Creative Capital; handle is lowercase @eddiedonmez.

**Tim Grover** — `verified` · X `/twitter/user/ATTACKATHLETICS`
: ATTACK Athletics CEO. @ATTACKATHLETICS is consistent across X and Instagram. No confirmable YouTube handle, so the verified X handle was preferred over a guessed YouTube one.

**Annie Jacobsen** — `verified` · X `/twitter/user/AnnieJacobsen`
: Area 51 / Nuclear War author. No first-party video channel — she appears as a guest — so X is the only feed. Expect low volume.

**r/CFB** — `unknown` · Reddit `https://www.reddit.com/r/CFB/hot/.rss`
: —

**r/CollegeBasketball** — `unknown` · Reddit `https://www.reddit.com/r/CollegeBasketball/hot/.rss`
: —

**r/nfl** — `unknown` · Reddit `https://www.reddit.com/r/nfl/hot/.rss`
: —

**r/nba** — `unknown` · Reddit `https://www.reddit.com/r/nba/hot/.rss`
: —

**r/baseball** — `unknown` · Reddit `https://www.reddit.com/r/baseball/hot/.rss`
: —

**r/golf** — `unknown` · Reddit `https://www.reddit.com/r/golf/hot/.rss`
: —

**r/horseracing** — `unknown` · Reddit `https://www.reddit.com/r/horseracing/hot/.rss`
: —

**r/Clemson** — `unknown` · Reddit `https://www.reddit.com/r/Clemson/hot/.rss`
: —

**r/BigBlueNation · football** — `unknown` · Reddit `https://www.reddit.com/r/BigBlueNation/search.rss?q=football&restrict_sr=1&sort=new`
: —

**r/BigBlueNation** — `unknown` · Reddit `https://www.reddit.com/r/BigBlueNation/hot/.rss`
: —

**r/Texans** — `unknown` · Reddit `https://www.reddit.com/r/Texans/hot/.rss`
: —

**r/Astros** — `unknown` · Reddit `https://www.reddit.com/r/Astros/hot/.rss`
: —

**r/rockets** — `unknown` · Reddit `https://www.reddit.com/r/rockets/hot/.rss`
: —

**Peter Zeihan** — `verified` · YouTube `ZeihanonGeopolitics`
: youtube.com/@ZeihanonGeopolitics. Near-daily uploads.

**Harry Stebbings** — `verified` · YouTube `20VC`
: 20VC; full episodes go to YouTube.

**Daniel Pink** — `verified` · YouTube `danielpinktv`
: CORRECTED from my guess @DanielPink → @danielpinktv ("Daniel Pink TV"), home of the Pinkcast.

**Christopher Voss** — `verified` · YouTube `NegotiationMastery`
: youtube.com/@NegotiationMastery — "Chris Voss & The Black Swan Group".

**Chase Hughes** — `verified` · YouTube `chasehughesofficial`
: @chasehughesofficial. He also co-hosts The Behavior Panel; the solo channel was chosen as the first-party feed.

**Jay Egg** — `assumption` · YouTube `EggGeothermal`
: Only a LEGACY username was found (youtube.com/user/EggGeothermal), not a modern @handle. YouTube usually mints a matching handle, but this is unconfirmed. Fallback: X @GeoJayegg.

**Chris Williamson** — `verified` · YouTube `ChrisWillx`
: Modern Wisdom, @ChrisWillx.

**David Sinclair** — `verified` · YouTube `LifespanOfficial`
: CORRECTED from my guess @davidsinclairpodcast (a legacy custom URL) → @LifespanOfficial.

**Jocko Willink** — `verified` · YouTube `JockoPodcast`
: Jocko Podcast.

**MrBallen** — `verified` · YouTube `MrBallen`
: Unambiguous handle.

**Jesse Michels** — `verified` · YouTube `JesseMichels`
: CORRECTED TWICE: your list said "Jesse Michaels" (spelling), and my guess @AmericanAlchemy was wrong — the channel handle is @JesseMichels. His X is @AlchemyAmerican.

**Timothy Alberino** — `verified` · YouTube `TimothyAlberino`
: youtube.com/@TimothyAlberino.

**Michael Button** — `assumption` · YouTube `UCRDZ_t_-uHLsz_Otq6iOgyg`
: Channel confirmed ("Ancient History BA", ~200K subs) but NO @handle could be confirmed — search surfaced two channels. Wired by channelId UCRDZ_t_-uHLsz_Otq6iOgyg. If it returns nothing, the alternates are @MichaelButtonHistory1 or X @MichaelButtonX.

**NFL** — `unknown` · YouTube `NFL`
: —

**NBA** — `unknown` · YouTube `NBA`
: —

**MLB** — `unknown` · YouTube `MLB`
: —

**PGA Tour** — `unknown` · YouTube `PGATOUR`
: —

---

## Local categorization cross-check

The keyword classifier runs independently of the category written in config.
Disagreements are worth a look; agreement is a weak positive signal.

The classifier agrees with every wired category.

---

## Duplicate scan

No duplicates across route, handle or person.

---

## Category distribution

| Category | Sources | Names |
|---|---|---|
| General | 0 | — |
| Business & Markets | 8 | Jeff Immelt, John Chambers, Eddie Donmez, Peter Zeihan, Harry Stebbings, Daniel Pink, Christopher Voss, Chase Hughes |
| Energy | 6 | Daniel Yergin, Doug Sheridan, Alex Epstein, Jeff Krimmel, Rich Miller, Jay Egg |
| AI & Tech | 0 | — |
| Sports | 17 | r/CFB, r/CollegeBasketball, r/nfl, r/nba, r/baseball, r/golf, r/horseracing, r/Clemson, r/BigBlueNation · football, r/BigBlueNation, r/Texans, r/Astros, r/rockets, NFL, NBA, MLB, PGA Tour |
| Health | 4 | Tim Grover, Chris Williamson, David Sinclair, Jocko Willink |
| Pop Culture | 0 | — |
| Ancient Mysteries | 5 | Annie Jacobsen, MrBallen, Jesse Michels, Timothy Alberino, Michael Button |


## Topic sources (keyword radar)

| Query | Platform | Category | Route |
|---|---|---|---|
| ERCOT | Reddit | Energy | `https://www.reddit.com/search.rss?q=ERCOT&sort=new&t=week` |
| ERCOT on X | X | Energy | `/twitter/keyword/ERCOT` |
| Multifamily RE | Reddit | Business & Markets | `https://www.reddit.com/search.rss?q=multifamily&sort=new&t=week` |
| Covered calls | Reddit | Business & Markets | `https://www.reddit.com/r/thetagang/search.rss?q=covered+call&restrict_sr=1&sort=new` |
| r/longevity | Reddit | Health | `https://www.reddit.com/r/longevity/hot/.rss` |
| AI for BD | Reddit | AI & Tech | `https://www.reddit.com/search.rss?q=AI+sales+prospecting&sort=new&t=week` |


---

## Parked — not wired (12)

| Name | Category | Why |
|---|---|---|
| Susanna Kass | Energy | LinkedIn personal profile — RSSHub exposes company pages only. Structurally unfollowable, deliberately not wired. |
| Mark Lewis | Energy | Person confident (Andurand carbon strategist); name too common to attribute a handle. |
| Matt Vincent | Energy | Likely Data Center Frontier editor; no personal handle confirmed. |
| Giacomo Prandelli | Energy | No confident identification. |
| Michelle Thaller | Ancient Mysteries | NASA astrophysicist — a guest, not a host. No first-party channel. |
| Cassie Coppersmith | Ancient Mysteries | No confident identification. |
| Saidul Islam | — | Very common name. |
| Alex Lanin | — | No confident identification. |
| Linhua G. | — | Surname truncated to an initial. |
| Guy Massey | — | No confident identification. |
| Andy Davis | — | Very common name. |
| Paul Hammer | — | No confident identification. |

Full detail in `config/parking-lot.md`.

---

## X is the self-host trigger

10 sources are on X. Every handle is verified and every route is
correct — they simply cannot pull on the free public RSSHub instance, because
`/twitter/*` requires `TWITTER_AUTH_TOKEN` configured **on the RSSHub instance
itself**, not in AetherHub. A shared public instance will not hold your token.

They show as degraded in the source rail with their real HTTP status, and they
start working the moment `RSSHUB_BASE_URL` points at a self-hosted instance
with a token set. Nothing in the app needs to change.

- Daniel Yergin — `/twitter/user/DanielYergin` (Energy)
- Doug Sheridan — `/twitter/user/DougSheridan` (Energy)
- Alex Epstein — `/twitter/user/AlexEpstein` (Energy)
- Jeff Krimmel — `/twitter/user/JeffKrimmel` (Energy)
- Rich Miller — `/twitter/user/Tech_Journalism` (Energy)
- Jeff Immelt — `/twitter/user/JeffImmelt` (Business & Markets)
- John Chambers — `/twitter/user/JohnTChambers` (Business & Markets)
- Eddie Donmez — `/twitter/user/eddiedonmez` (Business & Markets)
- Tim Grover — `/twitter/user/ATTACKATHLETICS` (Health)
- Annie Jacobsen — `/twitter/user/AnnieJacobsen` (Ancient Mysteries)
