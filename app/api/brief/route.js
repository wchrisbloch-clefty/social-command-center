// app/api/brief/route.js — AetherHub Social Intelligence Brief API
// Providers: Groq (free) → Gemini (free) → Claude (paid)
// Env vars: GROQ_API_KEY, GOOGLE_AI_API_KEY, ANTHROPIC_API_KEY
//
// ONE name for the Gemini credential: GOOGLE_AI_API_KEY. The old GOOGLE_AI_KEY
// and GEMINI_API_KEY aliases have been removed — three names for one key meant
// a missing credential could look like three different problems.
//
// GOOGLE_AI_API_KEY is the name, rather than something prettier, because the
// vendored skills pick it: .agents/social-media-skills (reels-scripting,
// post-scorer) read GOOGLE_AI_API_KEY and are upstream repos we do not
// control. The app conforms to them rather than the reverse.

// ── Degradation contract ──────────────────────────────────────────────────────
// Matches /api/youtube and /api/social: a missing credential or a dead upstream
// is a NORMAL state, not an error. The server logs it loudly; the client gets a
// 200 with an explicit flag and renders a clear "add a key" state.
//
// Returning 500 here used to put a red "Failed to load resource" in the browser
// console on every AI panel, at every breakpoint, on a fresh clone — which
// trained everyone to ignore the console. A 4xx/5xx is now reserved for a
// genuinely malformed request, which is a caller bug rather than a degradation.
//
//   { needsKey: true }        no provider configured
//   { providersFailed: [..] } all configured providers failed

function googleAIKey() {
  return process.env.GOOGLE_AI_API_KEY;
}

async function tryGroq(prompt, maxTokens) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

async function tryGemini(prompt, maxTokens) {
  const key = googleAIKey();
  if (!key) return null;
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.5 },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!r.ok) return null;
    const d = await r.json();
    return d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch { return null; }
}

async function tryClaude(prompt, maxTokens) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(9000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.content?.[0]?.text?.trim() || null;
  } catch { return null; }
}

// Compose a chat-style single-prompt string from a running conversation +
// extracted source. The provider fns above take one prompt string, so we flatten
// the chat here rather than adding per-provider chat plumbing — this keeps the
// existing single-prompt `type` path (MorningDigest, AIBriefPanel, SummarizePanel)
// completely untouched while reusing the exact same Groq→Gemini→Claude fallback.
//
// LIBRARY HOOK: a future "save this source and re-query later" feature attaches
// here — persist { title, context } keyed by an id, then hydrate `context` from
// that store instead of the request body. No change to the message flow needed.
function buildConversationPrompt({ context, title, messages }) {
  const system =
    'You are a focused reading assistant. Answer ONLY using the SOURCE below. ' +
    "If the answer is not contained in the source, say so plainly (e.g. \"That's not " +
    'covered in this source.") — do not use outside knowledge or guess. Be concise, ' +
    'quote or reference specifics from the source when helpful.';

  const convo = messages
    .filter((m) => m && m.content && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${String(m.content).trim()}`)
    .join('\n\n');

  return (
    `${system}\n\n` +
    `=== SOURCE${title ? `: ${title}` : ''} ===\n` +
    `${(context || '').slice(0, 12000)}\n` +
    `=== END SOURCE ===\n\n` +
    `${convo}\n\nAssistant:`
  );
}

function configuredProviders() {
  return [
    process.env.GROQ_API_KEY && 'Groq',
    googleAIKey() && 'Gemini',
    process.env.ANTHROPIC_API_KEY && 'Claude',
  ].filter(Boolean);
}

/** No credential anywhere. Loud in the log, graceful on the wire. */
function needsKeyResponse() {
  console.warn('[brief] no AI provider configured — set GROQ_API_KEY, GOOGLE_AI_API_KEY or ANTHROPIC_API_KEY');
  return Response.json({
    needsKey: true,
    provider: null,
    text: 'No AI provider configured. Add GROQ_API_KEY or GOOGLE_AI_API_KEY to enable AI panels.',
  });
}

/** Keys exist but every provider refused. Also a 200 — the UI says so. */
function providersFailedResponse(configured) {
  console.warn(`[brief] all providers failed (tried: ${configured.join(', ')})`);
  return Response.json({
    providersFailed: configured,
    provider: null,
    text: `All AI providers failed (tried: ${configured.join(', ')}). Please retry.`,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, type, messages, context, title } = body;

    // ── Conversation mode ("Ask Anything"): optional messages[] + context ──────
    if (Array.isArray(messages) && messages.length > 0) {
      const chatPrompt = buildConversationPrompt({ context, title, messages });
      for (const { name, fn } of [
        { name: 'Groq',   fn: tryGroq   },
        { name: 'Gemini', fn: tryGemini },
        { name: 'Claude', fn: tryClaude },
      ]) {
        const result = await fn(chatPrompt, 600);
        if (result) return Response.json({ text: result, provider: name });
      }
      const configured = configuredProviders();
      return configured.length ? providersFailedResponse(configured) : needsKeyResponse();
    }

    // ── Single-prompt mode (unchanged, backward compatible) ────────────────────
    if (!prompt) {
      return Response.json({ text: 'No prompt provided.' }, { status: 400 });
    }

    const maxTokens = type === 'handle' ? 150 : type === 'digest' ? 300 : 400;

    for (const { name, fn } of [
      { name: 'Groq',   fn: tryGroq   },
      { name: 'Gemini', fn: tryGemini },
      { name: 'Claude', fn: tryClaude },
    ]) {
      const result = await fn(prompt, maxTokens);
      if (result) {
        if (type === 'handle') {
          try {
            const clean = result.replace(/```json|```/g, '').trim();
            return Response.json({ handles: JSON.parse(clean), provider: name });
          } catch {
            return Response.json({ handles: {}, provider: name });
          }
        }
        return Response.json({ text: result, provider: name });
      }
    }

    const configured = configuredProviders();
    return configured.length ? providersFailedResponse(configured) : needsKeyResponse();

  } catch {
    return Response.json({ error: 'Bad request body' }, { status: 400 });
  }
}
