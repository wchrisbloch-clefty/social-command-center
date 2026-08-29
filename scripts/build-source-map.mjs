#!/usr/bin/env node
// scripts/build-source-map.mjs — resolve the roster, categorize it locally,
// scan for duplicates, and write config/source-map.md for human review.
//
//   npm run sources:map
//
// The ROSTER below is the proposed name → platform → handle resolution. It is
// the reviewable artifact: every entry carries a status and a confidence, and
// anything I could not resolve says so rather than shipping a plausible-looking
// handle that silently produces a dead feed.
//
// Categorization runs through lib/categorize.js — local keyword scoring, no
// external calls, so AetherHub stays decoupled.

import { writeFileSync } from 'node:fs';
import { categorize, findDuplicates } from '../lib/categorize.js';
import { CATEGORIES, PLATFORM_TIER } from '../config/sources.js';

// status:
//   resolved      person and handle both confident — wire it
//   verify        person confident, handle is my best guess — check before trusting
//   unresolved    could not identify the person from the name alone
//   unsupported   identified, but the platform route does not exist for them
const ROSTER = [
  // ── Energy ────────────────────────────────────────────────────────────────
  { person: 'Daniel Yergin', platform: 'X', handle: 'danielyergin', status: 'verify',
    cat: 'energy', why: 'Energy historian (The Prize, The New Map), S&P Global vice chairman. No personal video channel; X is his only first-party feed.',
    bio: 'energy history oil gas geopolitics CERAWeek petroleum energy transition' },

  { person: 'Doug Sheridan', platform: 'X', handle: 'DougSheridan', status: 'resolved',
    cat: 'energy', why: 'EnergyPoint Research. Genuinely X-native — posts daily oil & gas charts and commentary there and essentially nowhere else.',
    bio: 'oil and gas energy upstream shale petroleum markets commentary' },

  { person: 'Alex Epstein', platform: 'X', handle: 'AlexEpstein', status: 'resolved',
    cat: 'energy', why: 'Fossil Future / Moral Case for Fossil Fuels. X is where he actually argues; the YouTube channel is a repost archive.',
    bio: 'fossil fuels energy policy decarbonization debate energy humanism' },

  { person: 'Jeff Krimmel', platform: 'X', handle: 'jeffkrimmel', status: 'verify',
    cat: 'energy', why: 'Krimmel Capital, energy/commodities analysis. Handle is a best guess from the name pattern.',
    bio: 'energy commodities oil gas analysis capital markets' },

  { person: 'Mark Lewis', platform: 'X', handle: null, status: 'unresolved',
    cat: 'energy', why: 'Almost certainly the energy/carbon strategist (Andurand Capital, ex-Kepler Cheuvreux, ex-BNP) — but "Mark Lewis" is common enough that I will not guess a handle.',
    bio: 'carbon energy transition strategist commodities' },

  { person: 'Jay Egg', platform: 'YouTube', handle: 'EggGeo', status: 'verify',
    cat: 'energy', why: 'Geothermal HVAC educator (Egg Geo). Publishes explainer video, so YouTube is right; handle is a best guess.',
    bio: 'geothermal heating cooling hvac energy efficiency ground source heat pump' },

  { person: 'Susanna Kass', platform: 'LinkedIn', handle: null, status: 'unsupported',
    cat: 'energy', why: 'Data-centre sustainability / UN SDG advisor. Publishes on a LinkedIn PERSONAL profile, and RSSHub only exposes LinkedIn COMPANY pages. No pullable first-party feed.',
    bio: 'data center sustainability energy infrastructure renewable compute' },

  { person: 'Matt Vincent', platform: 'X', handle: null, status: 'unresolved',
    cat: 'energy', why: 'Likely the Data Center Frontier editor, which fits the data-centre cluster in this list — but I cannot confirm the handle, and the name is common.',
    bio: 'data center infrastructure editor energy cooling power' },

  { person: 'Rich Miller', platform: 'X', handle: null, status: 'unresolved',
    cat: 'energy', why: 'AMBIGUOUS. Data Center Frontier founder (fits Kass/Vincent) or the Bloomberg economics reporter. Different people, different categories. Needs your call.',
    bio: 'data center frontier infrastructure power cooling' },

  // ── Business & Markets ────────────────────────────────────────────────────
  { person: 'Peter Zeihan', platform: 'YouTube', handle: 'ZeihanonGeopolitics', status: 'resolved',
    cat: 'business', why: 'Posts near-daily to YouTube; it is unambiguously his primary channel. Heavy energy/demographics overlap — could equally sit in Energy.',
    bio: 'geopolitics demographics supply chain energy trade macro markets' },

  { person: 'Harry Stebbings', platform: 'YouTube', handle: '20VC', status: 'resolved',
    cat: 'business', why: '20VC. Full episodes go to YouTube; it is the highest-signal free pull.',
    bio: 'venture capital startup founder investing portfolio valuation' },

  { person: 'Jeff Immelt', platform: 'X', handle: 'JeffImmelt', status: 'verify',
    cat: 'business', why: 'Former GE CEO, now NEA. Low volume but X is his only first-party feed.',
    bio: 'leadership ceo industrial strategy business' },

  { person: 'Daniel Pink', platform: 'YouTube', handle: 'DanielPink', status: 'verify',
    cat: 'business', why: 'Author (Drive, To Sell Is Human). Runs "Pinkcast" video shorts; handle is a best guess.',
    bio: 'motivation sales behavioral science business books timing' },

  { person: 'Christopher Voss', platform: 'YouTube', handle: 'NegotiationMastery', status: 'verify',
    cat: 'business', why: 'Never Split the Difference / Black Swan Group. The group channel is the active one; handle is my best guess between that and @BlackSwanGroup.',
    bio: 'negotiation tactical empathy hostage sales persuasion' },

  { person: 'John Chambers', platform: 'X', handle: 'JohnTChambers', status: 'verify',
    cat: 'business', why: 'Former Cisco CEO, JC2 Ventures. X is his only regular first-party output.',
    bio: 'leadership ceo cisco venture startup technology strategy' },

  { person: 'Eddie Donmez', platform: 'X', handle: 'EddieDonmez', status: 'verify',
    cat: 'business', why: 'Markets/trading commentator (ex-Amplify Trading). X-native. Handle is a best guess.',
    bio: 'markets trading macro equities commentary earnings' },

  { person: 'Chase Hughes', platform: 'YouTube', handle: 'ChaseHughes', status: 'verify',
    cat: 'business', why: 'Behavioural profiling / influence. Sits naturally beside Voss. Handle is a best guess.',
    bio: 'behavior profiling influence persuasion psychology negotiation' },

  // ── Health ────────────────────────────────────────────────────────────────
  { person: 'Chris Williamson', platform: 'YouTube', handle: 'ChrisWillx', status: 'resolved',
    cat: 'health', why: 'Modern Wisdom. YouTube is the primary distribution and the handle is well established.',
    bio: 'modern wisdom psychology health mindset performance stoic philosophy' },

  { person: 'David Sinclair', platform: 'YouTube', handle: 'davidsinclairpodcast', status: 'verify',
    cat: 'health', why: 'Harvard longevity researcher, Lifespan podcast. Handle is a best guess; @davidasinclair on X is the fallback.',
    bio: 'longevity healthspan epigenetic nad aging research lifespan' },

  { person: 'Jocko Willink', platform: 'YouTube', handle: 'JockoPodcast', status: 'resolved',
    cat: 'health', why: 'Jocko Podcast. Discipline/leadership/stoicism — straddles Health and Business; filed under Health for the mindset cluster.',
    bio: 'discipline leadership extreme ownership stoic training mindset' },

  { person: 'Tim Grover', platform: 'YouTube', handle: 'TimGrover', status: 'verify',
    cat: 'health', why: 'Relentless; trained Jordan and Bryant. Mental-performance content. Handle is a best guess (@AttackAthletics is the alternative).',
    bio: 'mental performance training athlete mindset relentless winning' },

  // ── Ancient Mysteries ─────────────────────────────────────────────────────
  { person: 'MrBallen', platform: 'YouTube', handle: 'MrBallen', status: 'resolved',
    cat: 'ancient', why: 'Strange/dark/unexplained stories. Handle is unambiguous.',
    bio: 'strange mysterious unexplained dark stories mystery paranormal' },

  { person: 'Jesse Michels', platform: 'YouTube', handle: 'AmericanAlchemy', status: 'verify',
    cat: 'ancient', why: 'TYPO CORRECTED: you wrote "Jesse Michaels"; the American Alchemy host is Jesse MICHELS. UAP/fringe-science long-form interviews.',
    bio: 'uap ufo fringe science anomalous history declassified interviews' },

  { person: 'Timothy Alberino', platform: 'YouTube', handle: 'TimothyAlberino', status: 'verify',
    cat: 'ancient', why: 'Antediluvian history, giants, lost civilisations. Handle follows his name; worth a check.',
    bio: 'antediluvian ancient giants lost civilization archaeology esoteric' },

  { person: 'Michael Button', platform: 'YouTube', handle: 'MichaelButton', status: 'verify',
    cat: 'ancient', why: 'Human-origins / lost-civilisations essayist. YouTube-native. Handle is a best guess.',
    bio: 'human origins lost civilization ancient prehistory archaeology ice age' },

  { person: 'Annie Jacobsen', platform: 'X', handle: 'anniejacobsen', status: 'verify',
    cat: 'ancient', why: 'Author (Area 51, Nuclear War, Phenomena). No own channel — she appears on others — so X is the only first-party feed. Expect low volume.',
    bio: 'area 51 declassified pentagon nuclear investigative history anomalous' },

  { person: 'Michelle Thaller', platform: 'YouTube', handle: null, status: 'unresolved',
    cat: 'ancient', why: 'NASA astrophysicist. Prolific GUEST, but I could not identify a first-party channel of her own. Following her may not be possible without a third-party aggregator.',
    bio: 'astronomy astrophysics nasa cosmology space science' },

  { person: 'Cassie Coppersmith', platform: 'YouTube', handle: null, status: 'unresolved',
    cat: 'ancient', why: 'Could not identify with confidence. Plausibly an ancient-mysteries creator given the company she keeps in this list, but I will not invent a handle.',
    bio: 'ancient mysteries archaeology' },

  // ── Could not identify from the name alone ────────────────────────────────
  { person: 'Giacomo Prandelli', platform: 'LinkedIn', handle: null, status: 'unresolved',
    cat: 'energy', why: 'Could not identify. If he is the LNG/energy analyst who publishes on a LinkedIn personal profile, that is also UNSUPPORTED — RSSHub exposes company pages only.',
    bio: 'energy lng analyst' },

  { person: 'Saidul Islam', platform: null, handle: null, status: 'unresolved',
    cat: 'general', why: 'Could not identify — the name is very common and nothing in the surrounding list disambiguates it.', bio: '' },

  { person: 'Alex Lanin', platform: null, handle: null, status: 'unresolved',
    cat: 'general', why: 'Could not identify.', bio: '' },

  { person: 'Linhua G.', platform: null, handle: null, status: 'unresolved',
    cat: 'general', why: 'Could not identify — the surname is truncated to an initial, so there is nothing to resolve against.', bio: '' },

  { person: 'Guy Massey', platform: null, handle: null, status: 'unresolved',
    cat: 'general', why: 'Could not identify.', bio: '' },

  { person: 'Andy Davis', platform: null, handle: null, status: 'unresolved',
    cat: 'general', why: 'Could not identify — very common name.', bio: '' },

  { person: 'Paul Hammer', platform: null, handle: null, status: 'unresolved',
    cat: 'general', why: 'Could not identify.', bio: '' },
];

// ── Route construction, per the verified RSSHub patterns ────────────────────
export function routeFor({ platform, handle }) {
  if (!handle) return null;
  switch (platform) {
    case 'YouTube':   return { kind: 'youtube', handle };              // official Data API
    case 'X':         return { kind: 'rsshub',  route: `/twitter/user/${handle}` };
    case 'Instagram': return { kind: 'rsshub',  route: `/instagram/2/user/${handle}` };
    case 'LinkedIn':  return { kind: 'rsshub',  route: `/linkedin/company/${handle}/posts` };
    case 'Reddit':    return { kind: 'direct',  route: `https://www.reddit.com/r/${handle}/hot/.rss` };
    default:          return null;
  }
}

const label = id => CATEGORIES.find(c => c.id === id)?.label || id;

// ── Build ───────────────────────────────────────────────────────────────────
const rows = ROSTER.map(r => {
  const auto = categorize(`${r.person} ${r.handle || ''} ${r.bio}`, r.cat);
  const route = routeFor(r);
  return {
    ...r,
    tier: r.platform ? (PLATFORM_TIER[r.platform] || 'street') : '—',
    autoCat: auto.category,
    autoConfidence: auto.confidence,
    matched: auto.matched,
    agrees: auto.category === r.cat,
    route,
  };
});

const dupes = findDuplicates(rows.filter(r => r.handle).map(r => ({
  platform: r.platform, handle: r.handle, label: r.person, person: r.person,
  route: r.route?.route || r.route?.handle,
})));

const byStatus = s => rows.filter(r => r.status === s);
const counts = {
  resolved: byStatus('resolved').length,
  verify: byStatus('verify').length,
  unresolved: byStatus('unresolved').length,
  unsupported: byStatus('unsupported').length,
};

const md = `# Source map — name → platform → handle → category

Generated by \`npm run sources:map\`. **Review artifact, not the live config.**
Sources only become live once written into \`config/sources.js\`.

Categorization is local (\`lib/categorize.js\`, keyword scoring, no external
calls). Tier is derived from platform and never set by hand.

| Status | Count | Meaning |
|---|---|---|
| \`resolved\` | ${counts.resolved} | Person and handle both confident — safe to wire |
| \`verify\` | ${counts.verify} | Person confident, **handle is a best guess** — check before trusting |
| \`unresolved\` | ${counts.unresolved} | Could not identify the person from the name alone |
| \`unsupported\` | ${counts.unsupported} | Identified, but no pullable route exists for them |

**${counts.resolved + counts.verify} of ${rows.length}** names produced a usable feed candidate.

---

## Full mapping

| # | Name | Platform | Handle | Category | Tier | Status | Local check |
|---|---|---|---|---|---|---|---|
${rows.map((r, i) =>
  `| ${i + 1} | ${r.person} | ${r.platform || '—'} | ${r.handle ? '`' + r.handle + '`' : '—'} | ${label(r.cat)} | ${r.tier} | \`${r.status}\` | ${r.agrees ? `agrees (${r.autoConfidence})` : `**differs** → ${label(r.autoCat)} (${r.autoConfidence})`} |`
).join('\n')}

---

## Why each resolution

${rows.map((r, i) => `**${i + 1}. ${r.person}** — \`${r.status}\`${r.platform ? ` · ${r.platform}${r.handle ? ` @${r.handle}` : ''}` : ''}
: ${r.why}`).join('\n\n')}

---

## Needs your decision (${counts.verify + counts.unresolved + counts.unsupported})

### Handle is a best guess — a wrong one becomes a silently dead feed
${byStatus('verify').map(r => `- **${r.person}** → ${r.platform} \`@${r.handle}\``).join('\n')}

### Could not identify
${byStatus('unresolved').map(r => `- **${r.person}** — ${r.why}`).join('\n')}

### No pullable route exists
${byStatus('unsupported').map(r => `- **${r.person}** — ${r.why}`).join('\n')}

---

## Duplicate scan

${dupes.length ? dupes.map(d => `- \`${d.kind}\` — ${d.a.person} / ${d.b.person} (${d.detail})`).join('\n') : 'No duplicates or overlaps detected across the roster.'}

---

## Category distribution

| Category | Count | Names |
|---|---|---|
${CATEGORIES.map(c => {
  const inCat = rows.filter(r => r.cat === c.id);
  return `| ${c.label} | ${inCat.length} | ${inCat.map(r => r.person).join(', ') || '—'} |`;
}).join('\n')}

---

## Platform distribution

| Platform | Count | Pulls on the free public instance? |
|---|---|---|
| YouTube | ${rows.filter(r => r.platform === 'YouTube').length} | Yes — official Data API, needs \`YOUTUBE_API_KEY\` |
| X | ${rows.filter(r => r.platform === 'X').length} | **No** — needs \`TWITTER_AUTH_TOKEN\` on the RSSHub instance. Degrades honestly. |
| LinkedIn | ${rows.filter(r => r.platform === 'LinkedIn').length} | Company pages only; personal profiles are unsupported |
| Instagram | ${rows.filter(r => r.platform === 'Instagram').length} | Rate-limited (\`antiCrawler\`) |
| unresolved | ${rows.filter(r => !r.platform).length} | — |
`;

writeFileSync(new URL('../config/source-map.md', import.meta.url), md);
process.stdout.write(
  `config/source-map.md written — ${rows.length} names: ` +
  `${counts.resolved} resolved, ${counts.verify} to verify, ` +
  `${counts.unresolved} unresolved, ${counts.unsupported} unsupported\n` +
  `duplicates: ${dupes.length}\n`
);
