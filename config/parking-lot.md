# Parking lot — names not wired

Names from the roster that produced no live source, with everything known about
them. **Nothing here blocks the build.** Supply a handle and it becomes a normal
one-line entry in `config/sources.js`, or add it through the radar's
"Add to Follow" — both write the same shape.

---

## Structurally unfollowable (1)

### Susanna Kass — Energy
Data-centre sustainability / UN SDG advisor. Publishes on a **LinkedIn personal
profile**.

**Why no route exists:** RSSHub's LinkedIn namespace exposes
`/linkedin/company/:company_id/posts` and nothing else. There is no person or
profile route — verified against `lib/routes/linkedin/` in the RSSHub source.
This is not a missing handle; the route does not exist.

**Options if you want her:** follow a company page she posts under; or wait for
an RSSHub LinkedIn person route (none is on the roadmap); or supply a different
platform if she is active elsewhere.

**Deliberately not wired** — a route that cannot work is worse than an absence,
because it burns a slot in the source rail showing a permanent red.

---

## Could not identify (12)

Searched, but the name alone was not enough to resolve a person with confidence.
Wiring a guess here would produce a feed that looks live and is wrong.

| Name | Likely identity | Why unresolved |
|---|---|---|
| **Mark Lewis** | Energy/carbon strategist — Andurand Capital, ex-Kepler Cheuvreux, ex-BNP Paribas | Confident about the person; "Mark Lewis" is common enough that no handle could be attributed safely |
| **Matt Vincent** | Editor at Data Center Frontier (fits the Rich Miller / Susanna Kass data-centre cluster) | Publication presence is clear; a personal handle is not |
| **Giacomo Prandelli** | Possibly an LNG/energy analyst | No confident identification. If he publishes on a LinkedIn personal profile, that is also structurally unfollowable |
| **Michelle Thaller** | NASA astrophysicist (Goddard) | Prolific **guest**, not a host. No first-party channel found — following her may require a third-party aggregator, which AetherHub deliberately does not use |
| **Cassie Coppersmith** | Plausibly an ancient-mysteries creator, inferred only from the company she keeps in this list | No confident identification |
| **Saidul Islam** | — | Very common name, nothing in the list disambiguates it |
| **Alex Lanin** | — | No confident identification |
| **Linhua G.** | — | Surname truncated to an initial; nothing to resolve against |
| **Guy Massey** | — | No confident identification |
| **Andy Davis** | — | Very common name |
| **Paul Hammer** | — | No confident identification |
| **Jeff Krimmel** *(resolved — listed for the correction)* | Krimmel **Strategy Group**, not "Krimmel Capital" | Wired as X `@JeffKrimmel`. Noted here only because the firm name in the original list was slightly off |

---

## How to add one

Any of these becomes live with a single line. Same file, same shape as every
other source — no parallel list:

```js
// config/sources.js → SOCIAL_SOURCES
{ platform: 'X', person: 'Mark Lewis', route: '/twitter/user/THEIRHANDLE',
  label: '@THEIRHANDLE', category: 'energy', limit: 5 },

// config/sources.js → YOUTUBE_SOURCES
{ platform: 'YouTube', person: 'Mark Lewis', handle: 'TheirChannel',
  label: 'Their Channel', category: 'energy', limit: 3 },
```

`channelId: 'UC…'` is accepted in place of `handle` when a channel is confirmed
but its @handle is not.

Tier is derived from platform and must never be written by hand.
