#!/usr/bin/env node
// scripts/build-source-map.mjs — regenerate config/source-map.md.
//
//   npm run sources:map
//
// The map is DERIVED from config/sources.js, never parallel to it. Add a source
// there and it appears here; there is no second list to forget to update.
// VERIFICATION below holds only the provenance a source line cannot carry:
// how the handle was confirmed, and what is still a guess.

import { writeFileSync } from 'node:fs';
import { categorize, findDuplicates } from '../lib/categorize.js';
import {
  CATEGORIES, PLATFORM_TIER, SOCIAL_SOURCES, YOUTUBE_SOURCES, TOPIC_SOURCES,
} from '../config/sources.js';

// person → how its handle was established.
//   verified   confirmed against the person's own channel/profile via search
//   assumption best available, explicitly uncertain — see the note
const VERIFICATION = {
  'Daniel Yergin':     { state: 'verified',   note: 'X profile confirms author of The Prize/The New Map, S&P Global vice chairman.' },
  'Doug Sheridan':     { state: 'verified',   note: 'EnergyPoint Research; X-native, posts daily oil & gas commentary.' },
  'Alex Epstein':      { state: 'verified',   note: 'Fossil Future author; X is his primary channel.' },
  'Jeff Krimmel':      { state: 'verified',   note: 'Confirmed @JeffKrimmel. CORRECTION: firm is Krimmel Strategy Group, not "Krimmel Capital".' },
  'Rich Miller':       { state: 'verified',   note: 'Data Center Frontier founder/editor-at-large — the data-centre Rich Miller, per your call, not the Bloomberg economics reporter.' },
  'Jeff Immelt':       { state: 'verified',   note: 'Former GE CEO, now NEA venture partner. ~53K followers, low posting volume.' },
  'John Chambers':     { state: 'verified',   note: 'Founder JC2 Ventures, Chairman Emeritus Cisco.' },
  'Eddie Donmez':      { state: 'verified',   note: 'Founder of Creative Capital; handle is lowercase @eddiedonmez.' },
  'Tim Grover':        { state: 'verified',   note: 'ATTACK Athletics CEO. @ATTACKATHLETICS is consistent across X and Instagram. No confirmable YouTube handle, so the verified X handle was preferred over a guessed YouTube one.' },
  'Annie Jacobsen':    { state: 'verified',   note: 'Area 51 / Nuclear War author. No first-party video channel — she appears as a guest — so X is the only feed. Expect low volume.' },
  'Peter Zeihan':      { state: 'verified',   note: 'youtube.com/@ZeihanonGeopolitics. Near-daily uploads.' },
  'Harry Stebbings':   { state: 'verified',   note: '20VC; full episodes go to YouTube.' },
  'Daniel Pink':       { state: 'verified',   note: 'CORRECTED from my guess @DanielPink → @danielpinktv ("Daniel Pink TV"), home of the Pinkcast.' },
  'Christopher Voss':  { state: 'verified',   note: 'youtube.com/@NegotiationMastery — "Chris Voss & The Black Swan Group".' },
  'Chase Hughes':      { state: 'verified',   note: '@chasehughesofficial. He also co-hosts The Behavior Panel; the solo channel was chosen as the first-party feed.' },
  'Chris Williamson':  { state: 'verified',   note: 'Modern Wisdom, @ChrisWillx.' },
  'David Sinclair':    { state: 'verified',   note: 'CORRECTED from my guess @davidsinclairpodcast (a legacy custom URL) → @LifespanOfficial.' },
  'Jocko Willink':     { state: 'verified',   note: 'Jocko Podcast.' },
  'MrBallen':          { state: 'verified',   note: 'Unambiguous handle.' },
  'Jesse Michels':     { state: 'verified',   note: 'CORRECTED TWICE: your list said "Jesse Michaels" (spelling), and my guess @AmericanAlchemy was wrong — the channel handle is @JesseMichels. His X is @AlchemyAmerican.' },
  'Timothy Alberino':  { state: 'verified',   note: 'youtube.com/@TimothyAlberino.' },
  'Michael Button':    { state: 'assumption', note: 'Channel confirmed ("Ancient History BA", ~200K subs) but NO @handle could be confirmed — search surfaced two channels. Wired by channelId UCRDZ_t_-uHLsz_Otq6iOgyg. If it returns nothing, the alternates are @MichaelButtonHistory1 or X @MichaelButtonX.' },
  'Jay Egg':           { state: 'assumption', note: 'Only a LEGACY username was found (youtube.com/user/EggGeothermal), not a modern @handle. YouTube usually mints a matching handle, but this is unconfirmed. Fallback: X @GeoJayegg.' },
};

const PARKED = [
  ['Susanna Kass', 'Energy', 'LinkedIn personal profile — RSSHub exposes company pages only. Structurally unfollowable, deliberately not wired.'],
  ['Mark Lewis', 'Energy', 'Person confident (Andurand carbon strategist); name too common to attribute a handle.'],
  ['Matt Vincent', 'Energy', 'Likely Data Center Frontier editor; no personal handle confirmed.'],
  ['Giacomo Prandelli', 'Energy', 'No confident identification.'],
  ['Michelle Thaller', 'Ancient Mysteries', 'NASA astrophysicist — a guest, not a host. No first-party channel.'],
  ['Cassie Coppersmith', 'Ancient Mysteries', 'No confident identification.'],
  ['Saidul Islam', '—', 'Very common name.'],
  ['Alex Lanin', '—', 'No confident identification.'],
  ['Linhua G.', '—', 'Surname truncated to an initial.'],
  ['Guy Massey', '—', 'No confident identification.'],
  ['Andy Davis', '—', 'Very common name.'],
  ['Paul Hammer', '—', 'No confident identification.'],
];

const label = id => CATEGORIES.find(c => c.id === id)?.label || id;
const all = [...SOCIAL_SOURCES, ...YOUTUBE_SOURCES];

const rows = all.map(src => {
  const v = VERIFICATION[src.person] || { state: 'unknown', note: '—' };
  const ref = src.handle || src.channelId || src.route;
  const auto = categorize(`${src.person || ''} ${src.label} ${ref}`, src.category);
  return {
    person: src.person || src.label,
    platform: src.platform,
    ref,
    category: src.category,
    tier: PLATFORM_TIER[src.platform] || 'street',
    state: v.state,
    note: v.note,
    autoCat: auto.category,
    autoConfidence: auto.confidence,
    agrees: auto.category === src.category,
  };
});

const dupes = findDuplicates(all.map(s => ({
  platform: s.platform, handle: s.handle || s.channelId, label: s.label,
  person: s.person, route: s.route,
})));

const assumptions = rows.filter(r => r.state === 'assumption');
const xSources = rows.filter(r => r.platform === 'X');

const md = `# Source map — name → platform → handle → category

**Derived from \`config/sources.js\`** by \`npm run sources:map\`. Not a parallel
list: add a source there and it shows up here. This file carries only the
provenance a config line cannot — how each handle was confirmed.

Categorization is local (\`lib/categorize.js\`, keyword scoring, no external
calls). Tier is derived from platform and never hand-written.

- **${rows.length}** sources wired (${SOCIAL_SOURCES.length} RSSHub/direct, ${YOUTUBE_SOURCES.length} YouTube)
- **${rows.filter(r => r.state === 'verified').length}** handles verified by search
- **${assumptions.length}** flagged \`assumption\` — **manual confirmation needed**
- **${PARKED.length}** parked (see \`config/parking-lot.md\`)
- **${xSources.length}** on X — wired and correct, but degraded on the free instance

---

## Wired sources

| # | Name | Platform | Handle / route | Category | Tier | Handle |
|---|---|---|---|---|---|---|
${rows.map((r, i) =>
  `| ${i + 1} | ${r.person} | ${r.platform} | \`${r.ref}\` | ${label(r.category)} | ${r.tier} | ${r.state === 'verified' ? 'verified' : '**' + r.state + '**'} |`
).join('\n')}

---

## ⚠ Unverified — manual confirmation needed (${assumptions.length})

${assumptions.length ? assumptions.map(r =>
  `### ${r.person} — ${r.platform} \`${r.ref}\`\n${r.note}\n`).join('\n') : 'None.'}

---

## How each handle was established

${rows.map(r => `**${r.person}** — \`${r.state}\` · ${r.platform} \`${r.ref}\`
: ${r.note}`).join('\n\n')}

---

## Local categorization cross-check

The keyword classifier runs independently of the category written in config.
Disagreements are worth a look; agreement is a weak positive signal.

${rows.filter(r => !r.agrees).length
  ? rows.filter(r => !r.agrees).map(r => `- **${r.person}**: config says ${label(r.category)}, classifier says ${label(r.autoCat)} (${r.autoConfidence})`).join('\n')
  : 'The classifier agrees with every wired category.'}

---

## Duplicate scan

${dupes.length ? dupes.map(d => `- \`${d.kind}\` — ${d.a.person} / ${d.b.person} (${d.detail})`).join('\n') : 'No duplicates across route, handle or person.'}

---

## Category distribution

| Category | Sources | Names |
|---|---|---|
${CATEGORIES.map(c => {
  const inCat = rows.filter(r => r.category === c.id);
  return `| ${c.label} | ${inCat.length} | ${inCat.map(r => r.person).join(', ') || '—'} |`;
}).join('\n')}

${TOPIC_SOURCES?.length ? `
## Topic sources (keyword radar)

| Query | Platform | Category | Route |
|---|---|---|---|
${TOPIC_SOURCES.map(t => `| ${t.label} | ${t.platform} | ${label(t.category)} | \`${t.route}\` |`).join('\n')}
` : ''}

---

## Parked — not wired (${PARKED.length})

| Name | Category | Why |
|---|---|---|
${PARKED.map(([n, c, w]) => `| ${n} | ${c} | ${w} |`).join('\n')}

Full detail in \`config/parking-lot.md\`.

---

## X is the self-host trigger

${xSources.length} sources are on X. Every handle is verified and every route is
correct — they simply cannot pull on the free public RSSHub instance, because
\`/twitter/*\` requires \`TWITTER_AUTH_TOKEN\` configured **on the RSSHub instance
itself**, not in AetherHub. A shared public instance will not hold your token.

They show as degraded in the source rail with their real HTTP status, and they
start working the moment \`RSSHUB_BASE_URL\` points at a self-hosted instance
with a token set. Nothing in the app needs to change.

${xSources.map(r => `- ${r.person} — \`${r.ref}\` (${label(r.category)})`).join('\n')}
`;

writeFileSync(new URL('../config/source-map.md', import.meta.url), md);
process.stdout.write(
  `config/source-map.md — ${rows.length} wired ` +
  `(${rows.filter(r => r.state === 'verified').length} verified, ${assumptions.length} assumption), ` +
  `${PARKED.length} parked, ${dupes.length} duplicates, ${xSources.length} on X\n`
);
