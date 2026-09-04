# Podcasts

A podcast is an RSS feed. That single fact shapes everything here: it is the
only source type in AetherHub that needs no intermediary, no API key, no
account and no self-hosted instance. The publisher serves the feed; we fetch it.

## The three questions this design answers

### 1. Is this the right show?

A show name is not a unique key. Search any directory for "Morning Wire" and
several unrelated podcasts come back. Wiring the top hit silently is how you end
up subscribed to a stranger's show under a name you recognise.

So a podcast is never wired from a name. It resolves through
`lib/source-resolver.js` → `resolvePodcast()`, which returns **evidence**:

| field | why it is there |
|---|---|
| `showTitle` | the feed's OWN channel title, not the directory's and not yours |
| `publisher` | disambiguates same-named shows faster than anything else |
| `latestEpisode` | proof the feed is alive, with its note length |
| `alternatives` | the other matches, so "or did you mean?" is answerable |
| `wireable` | **null unless verified.** There is nothing to wire otherwise |

The add-your-own UI shows exactly this and asks *"Is this the right show?"*
before offering an Add button. Alternatives are fetched even when the top hit
verified — that is precisely when you need to see them.

The guard is structural, not a UI convention: `/api/sources`, still the one
writer for `config/sources.js`, **refuses** a podcast without a `verified` flag,
and that flag is only produced by actually fetching the feed and reading its
episodes. Going around the UI hits the same refusal.

Resolution is by **directory lookup**, not handle guessing, because a feed URL
is not derivable from a show name by any rule —
`feeds.megaphone.fm/GLT1412515089` does not follow from "Joe Rogan Experience".
The public iTunes Search API needs no key and is the canonical index. A feed URL
supplied directly skips the directory entirely, which is the escape hatch for a
show that was never listed.

### 2. What may an AI summary contain?

**Only what the show notes say.** The summariser does not listen to the episode.

This is the whole design constraint, because the failure mode is so easy and so
convincing. Given a title like *"Marc Andreessen on AI and the future of work"*
a model will produce four fluent paragraphs about what was probably discussed.
They would be invented. They would read exactly like a real summary. Nothing
downstream could tell.

Three things enforce it:

- **A floor.** Under ~200 characters of notes, `lib/podcast-summary.js` never
  calls a provider at all. It returns the reason instead. It cannot fabricate
  because it is not invoked.
- **A prompt that names the constraint three times** and says what to do when
  the text runs out: *write less*. One accurate sentence is complete; four
  padded ones are wrong.
- **A provenance line on every summary**, including the good ones — *"built
  from the publisher's notes, not the audio"*. Putting it only on thin
  summaries would make its absence read as "this one did hear the episode".

A thin summary is the honest result, not a degraded one to be improved.

### 3. Where would audio transcription attach?

At `provenance` — a field, not a boolean, so attaching transcription later
changes a **value**, not a shape:

| value | meaning | status |
|---|---|---|
| `show-notes` | the publisher's own description | the only live value |
| `captions` | a real caption/transcript track | reserved |
| `audio` | speech-to-text on the episode audio | reserved |

Every episode already carries `podcast.audioUrl` (the enclosure URL), which is
the input a transcriber needs. `summariseEpisode()` accepts a `transcribe`
function and **never calls it unless one is supplied**. Nothing in this repo
supplies one.

The socket matches a real plug rather than an imagined one: the reference
implementation is in the user's own `mynewshub2` at `api/listen.js` — Groq
Whisper for audio, YouTube caption tracks where available, falling back to show
notes — and it already uses this exact three-value vocabulary, which is why the
vocabulary was borrowed rather than invented.

Wiring it is a **cost decision, not a code decision**: per-episode audio
download plus paid transcription minutes.

## Cross-show topics

"What are my shows talking about?" is the same question Discover asks of the
feed — which theme recurs across distinct sources — so it runs on the same
engine (`lib/themes.js` → `crossShowTopics`), not a second one.

Two podcast-specific rules:

- **`minSources` counts SHOWS.** Ten episodes of one podcast about one thing is
  a series, not a cross-show topic. Because an episode's `sourceLabel` already
  *is* its show, the reuse is honest rather than merely convenient.
- **Thin-notes shows are reported, never silently dropped.** A show publishing
  one sentence per episode contributes almost no text and can barely appear in
  any topic. Hiding that would make the strip look more complete than it is.

It also inherits the phrase-preference de-fragmentation, which is why it reports
*"Datacenter Buildout"* rather than *"Datacenter"* and *"Buildout"* as two.

## Tier

`podcast` is a **third tier**, not a flavour of the other two. A long-form
interview show is neither a vetted publisher (`mainstream`) nor an anonymous
street account (`street`), and folding it into either would say something false
about it. Tier is still derived in `normalizeSignal()` — an episode can no more
render un-tiered than anything else can.

## Where an episode appears

An episode surfaces in **two** places, and it is **one signal** in both.

The Podcasts tab is the home for the show list, the episodes, cross-show topics
and Add-a-show. But an episode also appears in the topic category its own show
notes place it in — an Acquired episode on a chipmaker belongs in Tech as well
as in the Podcasts tab, and filing every episode under its show's category made
the Tech feed silently incomplete.

`classifyEpisode()` in `lib/categorize.js` reads the episode's title and notes
with the show's category as a hint. Nothing is force-assigned:

| Outcome | Category | `categorySource` |
|---|---|---|
| Confident, and it moved | the classified one | `episode` |
| Confident, and it agreed with the show | same as the show | `show-confirmed` |
| Enough text, no clear call | the **show's** wired category | `show` |
| Thin notes, no call | `general` | `unclassified-thin` |

Thin notes fall to `general` — the everything page, not a topic tab — because
there is no text to make an episode-level claim from. The inconclusive-but-
present case keeps the show's category instead, because that is a human
decision already made rather than a guess.

**One signal, two views.** An episode's id derives from its URL, so changing its
category cannot change its identity: the Podcasts tab and the category feed
render the same object. `getFeed()` merges `/api/podcasts` with the other routes
and runs the result through `dedupeById()`. That guard matters more than it
looks — a duplicated episode does not read as a bug, it reads as the show
publishing twice, while double-counting in every velocity total, category bar
and cross-show topic. `npm run verify:dual` asserts it, including the
counterfactual that the same input without the dedupe really does double.

Episodes keep `tier: 'podcast'` everywhere, so they stay identifiable as
podcasts inside a topic tab.

## Verification

All five wired shows are content-verified; none carries
`pendingVerification`. Verification did not happen in this build sandbox — its
egress policy 403s `itunes.apple.com` and every podcast CDN — it happened on the
deployment, which fetched each feed, read real episodes and matched each
channel title against the wired name.

### Same-brand collisions

Acquired was the case that needed more than a title check. Its Simplecast feed
404'd (the show had moved to Transistor), and resolving it returned a
**different show on two runs**:

| Feed | Show |
|---|---|
| `feeds.transistor.fm/acquired` | the flagship — Ben Gilbert & David Rosenthal, one company per episode |
| `feeds.transistor.fm/acq2` | *ACQ2 by Acquired* — their interview spinoff |

Same brand, same publisher, and ACQ2's own channel title contains the word — so
the feed-title check that caught the *Morning Wire* collision cannot catch this
one, and the directory's popularity-weighted order put them in opposite orders
on the two runs.

The resolver therefore stops picking:

- `rankDirectoryMatches()` prefers an **exact** title match over a prefix over a
  suffix over a mention, keeping directory order within a tier.
- `sameBrandGroup()` detects what ranking cannot solve — several feeds,
  brand-related titles, one publisher — and sets `brandCollision`.
- `describeCandidates()` fetches each sibling's **newest episode**, because that
  is the only thing siblings do not share. A list of names is the same name
  three times; a list showing *"Disney: The Renaissance and the Empire"* against
  an interview title is a choice a person can make.

Publisher identity comes from iTunes `artistName`, which is publisher-supplied
free text. A show filing itself under a slightly different name will not group —
so this fails toward showing **fewer** siblings, never toward auto-picking one.

### Running the check

```
npm run podcasts:verify           # report only
npm run podcasts:verify -- --fix  # adopt a directory correction for a dead feed
```

A **config check runs offline every time** — shows wired, distinct feeds, flags
outstanding — so the command proves something in CI and in the sandbox. It
catches a show wired alongside its own spinoff, which is what the Acquired
collision would have produced unnoticed.

When *nothing* is reachable it says `CANNOT VERIFY FROM HERE` and exits 0,
rather than reporting five broken shows: five unrelated CDNs and Apple do not
fail together. It reported exactly that once, about four feeds that were
already verified.

The network half checks three different things per show:

```
npm run podcasts:verify           # report only
npm run podcasts:verify -- --fix  # adopt a directory correction for a dead feed
```

1. does the feed respond and parse to real episodes?
2. **is the feed's own title the show we think it is?** ← the collision check
3. does it publish enough notes to summarise?

A **title mismatch is never auto-corrected**, even with `--fix`. A feed can be
perfectly healthy and be the wrong show; deciding that is a judgement call, not
something a script should make. `/api/podcasts` re-checks it on every refresh
too, so the collision guard survives past the resolver into runtime.
