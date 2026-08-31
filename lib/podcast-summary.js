// lib/podcast-summary.js — episode summaries, and the line they must not cross.
//
// ═══════════════════════════════════════════════════════════════════════════
//  WHAT THIS SUMMARISES, AND WHAT IT DOES NOT
// ═══════════════════════════════════════════════════════════════════════════
// It summarises THE SHOW NOTES. It does not listen to the episode.
//
// That sounds obvious and it is the entire design constraint, because the
// failure mode is so easy and so convincing: given a title like "Marc Andreessen
// on AI and the future of work" a model will happily produce four fluent
// paragraphs about what was probably discussed. Those paragraphs would be
// invented. They would read exactly like a real summary. And nobody downstream
// could tell the difference.
//
// So the rule is absolute: the summary may contain nothing that is not in the
// text the publisher supplied. A show with two sentences of notes gets a
// two-sentence summary. That is not a degraded result to be improved — it is
// the honest one, and padding it is the bug.
//
// The reference implementation in intelligence-hub offers a "Deep Dive" mode
// that explicitly reconstructs what was LIKELY discussed from the title alone.
// It is careful about it — it tiers the output [inferred] and says it is a
// reconstruction. It is deliberately NOT ported here: a labelled fabrication is
// still a fabrication, and this app's contract is that a signal's text came
// from the source.
//
// ═══════════════════════════════════════════════════════════════════════════
//  ── THE TRANSCRIPTION SOCKET ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// Real audio transcription is the obvious paid upgrade, and the socket for it
// is `provenance` — a field, not a boolean, precisely so that attaching
// transcription later changes a VALUE rather than a shape:
//
//     'show-notes'  the publisher's description        ← the only live value
//     'captions'    a real caption/transcript track    ← reserved
//     'audio'       speech-to-text on the episode      ← reserved
//
// Every episode already carries `podcast.audioUrl` (the enclosure URL), which
// is the input such a transcriber would need. So the plug is a function that
// takes an audioUrl, returns { text, provenance: 'audio' }, and is passed to
// summariseEpisode as `transcribe`. Nothing in this repo provides one, and
// `transcribe` is never called unless a caller supplies it.
//
// A working reference exists in the user's own mynewshub2 at api/listen.js:
// Groq Whisper for audio, YouTube caption tracks where available, falling back
// to show notes — and it already uses this exact three-value provenance
// vocabulary, which is why the vocabulary was borrowed rather than invented.
// Wiring it here would mean per-episode audio download plus paid transcription
// minutes, which is a cost decision, not a code decision.
//
// Until then: PROVENANCE IS 'show-notes' AND THE UI SAYS SO.

/** The only provenance value this module can produce unaided. */
export const DEFAULT_PROVENANCE = 'show-notes';

export const PROVENANCE_LABEL = {
  'show-notes': 'Summarised from show notes',
  'captions':   'Summarised from the episode transcript',
  'audio':      'Summarised from the episode audio',
};

// Below this there is not enough text to summarise without inventing. The
// episode still renders — with its notes shown as-is and a plain statement of
// why there is no summary.
// ASSUMPTION: 200 characters ≈ one sentence.
export const MIN_NOTES_CHARS = 200;

/** Strip boilerplate that pads notes without adding content. */
function stripFurniture(text) {
  return String(text || '')
    // Sponsor reads, subscribe CTAs and link dumps are most of the length of a
    // typical show-notes block and none of its meaning.
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\b(?:subscribe|follow us|promo code|sponsored by|use code|visit|go to)\b[^.]*\./gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Is there enough publisher text here to summarise honestly?
 * Returns the reason when there is not, so the UI can say it rather than
 * showing an empty panel.
 */
export function assessNotes(notes) {
  const clean = stripFurniture(notes);
  if (!clean) {
    return { enough: false, chars: 0, clean, reason: 'This episode published no show notes, so there is nothing to summarise.' };
  }
  if (clean.length < MIN_NOTES_CHARS) {
    return {
      enough: false, chars: clean.length, clean,
      reason: `This episode published only ${clean.length} characters of show notes — too little to summarise without inventing content. The notes are shown as-is.`,
    };
  }
  return { enough: true, chars: clean.length, clean, reason: null };
}

/**
 * The prompt. Written to make padding harder than complying.
 *
 * It names the constraint three times and tells the model what to do when the
 * text runs out, because "be concise" gets ignored and "say less than you were
 * asked for if the source says less" does not.
 */
export function buildPrompt(episode, notes) {
  return [
    'Summarise this podcast episode STRICTLY from the show notes below.',
    '',
    `Show: ${episode.show || episode.sourceLabel || 'unknown'}`,
    `Episode: ${episode.title || 'untitled'}`,
    '',
    'SHOW NOTES (the only source you may use):',
    '"""',
    notes,
    '"""',
    '',
    'RULES:',
    '1. Use ONLY what the notes above actually say. You have not heard this episode.',
    '2. Do NOT infer, reconstruct, or describe what was "likely" discussed. If the',
    '   notes only list guest names, say who the guests are and stop.',
    '3. If the notes are thin, WRITE LESS. One accurate sentence is correct and',
    '   complete; four padded ones are wrong. Length is not the goal.',
    '4. No preamble, no "this episode covers", no closing sentence about why it',
    '   matters. Just the substance.',
    '',
    'Write 1-3 sentences of plain prose.',
  ].join('\n');
}

/**
 * Summarise one episode.
 *
 * @param {object}   episode              a normalized signal (platform 'Podcast')
 * @param {object}   opts
 * @param {Function} opts.ask             ({prompt, type}) => Promise<{text, provider, needsKey}>
 * @param {Function} [opts.transcribe]    THE SOCKET. (audioUrl) => {text, provenance}.
 *                                        Never called unless supplied; no
 *                                        implementation ships in this repo.
 * @returns {Promise<object>} { summary, provenance, provenanceLabel, enough,
 *                              reason, notes, provider, needsKey }
 */
export async function summariseEpisode(episode, { ask, transcribe = null } = {}) {
  const rawNotes = episode?.content || '';
  let provenance = episode?.podcast?.provenance || DEFAULT_PROVENANCE;
  let sourceText = rawNotes;

  // ── The socket, exercised only if a caller plugs something in ─────────────
  // Deliberately inert: `transcribe` defaults to null and nothing in AetherHub
  // passes one. When a paid transcriber is attached this is the whole change on
  // this side — the text gets better and `provenance` reports which kind it is.
  if (transcribe && episode?.podcast?.audioUrl) {
    try {
      const got = await transcribe(episode.podcast.audioUrl);
      if (got?.text) {
        sourceText = got.text;
        provenance = got.provenance || 'audio';
      }
    } catch {
      // A failed transcription falls back to notes rather than failing the
      // episode — and provenance stays 'show-notes', which is the truth.
    }
  }

  const assessed = assessNotes(sourceText);
  const base = {
    provenance,
    provenanceLabel: PROVENANCE_LABEL[provenance] || PROVENANCE_LABEL['show-notes'],
    notes: assessed.clean,
    chars: assessed.chars,
  };

  if (!assessed.enough) {
    // Not an error, and not retried. There is no summary because there is no
    // text, and saying that is the correct output.
    return { ...base, summary: '', enough: false, reason: assessed.reason, provider: null };
  }

  const res = await ask({ prompt: buildPrompt(episode, assessed.clean), type: 'digest' });

  if (res?.needsKey) {
    return { ...base, summary: '', enough: true, provider: null, needsKey: true,
      reason: 'No AI provider is configured, so episode summaries are off. The show notes are shown instead.' };
  }
  if (!res?.text) {
    return { ...base, summary: '', enough: true, provider: null,
      reason: 'The AI provider did not answer. The show notes are shown instead.' };
  }

  return {
    ...base,
    summary: String(res.text).trim(),
    enough: true,
    reason: null,
    provider: res.provider || null,
  };
}
