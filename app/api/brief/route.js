// app/api/brief/route.js — AetherHub Social Intelligence Brief API
// Providers: Groq (free) → Gemini (free) → Claude (paid)
// Env vars: GROQ_API_KEY, GOOGLE_AI_API_KEY, ANTHROPIC_API_KEY
//
// GOOGLE_AI_API_KEY is the canonical Gemini credential name across the whole
// project. It is dictated by the vendored skills — .agents/social-media-skills
// (reels-scripting, post-scorer) read GOOGLE_AI_API_KEY and are upstream repos
// we do not control, so the app conforms to them rather than the reverse.
//
// GOOGLE_AI_KEY / GEMINI_API_KEY are DEPRECATED aliases, still read so that an
// existing Vercel environment keeps working. Rename the var in Vercel →
// Settings → Environment Variables, then delete googleAIKey()'s fallbacks.

function googleAIKey() {
  return (
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_AI_KEY ||   // deprecated
    process.env.GEMINI_API_KEY     // deprecated
  );
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
      const configured = [
        process.env.GROQ_API_KEY && 'Groq',
        googleAIKey() && 'Gemini',
        process.env.ANTHROPIC_API_KEY && 'Claude',
      ].filter(Boolean);
      if (!configured.length) {
        return Response.json(
          { text: 'No AI provider configured. Add GROQ_API_KEY or GOOGLE_AI_API_KEY in Vercel → Settings → Environment Variables.' },
          { status: 500 }
        );
      }
      return Response.json(
        { text: `All providers failed (tried: ${configured.join(', ')}). Please retry.` },
        { status: 502 }
      );
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

    const configured = [
      process.env.GROQ_API_KEY && 'Groq',
      googleAIKey() && 'Gemini',
      process.env.ANTHROPIC_API_KEY && 'Claude',
    ].filter(Boolean);

    if (!configured.length) {
      return Response.json({
        text: 'No AI provider configured. Add GROQ_API_KEY or GOOGLE_AI_API_KEY in Vercel → Settings → Environment Variables.',
      }, { status: 500 });
    }
    return Response.json({
      text: `All providers failed (tried: ${configured.join(', ')}). Please retry.`,
    }, { status: 502 });

  } catch {
    return Response.json({ error: 'Bad request body' }, { status: 400 });
  }
}
