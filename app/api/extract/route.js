// app/api/extract/route.js — AetherHub content extraction for "Ask Anything"
// POST { url } → { title, text, sourceType, truncated } | { error }
//
// Pulls readable text from a URL so the conversation endpoint (/api/brief)
// can answer questions about it. Three source types are handled:
//   • article  — generic webpage, light readability pass
//   • youtube  — transcript via the public timedtext track (title+desc fallback)
//   • podcast  — show-notes / description (full audio transcription is out of
//                scope for v1; a direct audio file returns a clear message)
//
// NO new npm dependencies: YouTube transcripts and article readability are done
// with native fetch + regex rather than pulling in youtube-transcript / cheerio
// / @mozilla/readability, per the "no heavy deps if avoidable" constraint.
// If richer extraction is ever needed, swap the helpers below for those libs.

const MAX_CHARS = 12000;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0 Safari/537.36';

// ─── small helpers ────────────────────────────────────────────────────────────

function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&(#\d+);/g, (_, n) => String.fromCodePoint(parseInt(n.slice(1), 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”');
}

function cap(text) {
  const clean = (text || '').replace(/\s+\n/g, '\n').trim();
  if (clean.length <= MAX_CHARS) return { text: clean, truncated: false };
  return { text: clean.slice(0, MAX_CHARS) + '…', truncated: true };
}

function stripTags(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|section|article|li|h[1-6]|br|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
}

function pickMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeEntities(m[1]).trim();
  }
  return '';
}

function extractTitle(html) {
  return (
    pickMeta(html, 'og:title') ||
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] &&
      decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)[1]).trim()) ||
    (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] &&
      decodeEntities(stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)[1])).trim()) ||
    'Untitled'
  );
}

// Light readability: prefer the main content region, drop chrome, keep prose.
function readableText(html) {
  const region =
    html.match(/<article[\s\S]*?<\/article>/i)?.[0] ||
    html.match(/<main[\s\S]*?<\/main>/i)?.[0] ||
    html.match(/<div[^>]+role=["']main["'][\s\S]*?<\/div>/i)?.[0] ||
    html.match(/<body[\s\S]*?<\/body>/i)?.[0] ||
    html;

  const text = decodeEntities(stripTags(region))
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter((l) => l.length > 1)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
  return text;
}

// ─── YouTube ────────────────────────────────────────────────────────────────

function youtubeId(url) {
  const m =
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/\/(?:shorts|embed|live)\/([\w-]{11})/);
  return m ? m[1] : null;
}

async function extractYouTube(url) {
  const id = youtubeId(url);
  if (!id) return { error: 'Could not parse a YouTube video ID from that URL.' };

  let html;
  try {
    const r = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return { error: `YouTube returned ${r.status}. The video may be private or removed.` };
    html = await r.text();
  } catch {
    return { error: 'Could not reach YouTube. Check the link and try again.' };
  }

  // Parse the embedded player response for title, description, caption tracks.
  let player = null;
  const pm = html.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\})\s*;\s*(?:var|<\/script>)/);
  if (pm) { try { player = JSON.parse(pm[1]); } catch { player = null; } }

  const title =
    player?.videoDetails?.title || pickMeta(html, 'og:title') || 'YouTube video';
  const description = player?.videoDetails?.shortDescription || pickMeta(html, 'og:description') || '';

  const tracks =
    player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const track =
    tracks.find((tk) => tk.languageCode === 'en') ||
    tracks.find((tk) => tk.languageCode?.startsWith('en')) ||
    tracks[0];

  if (track?.baseUrl) {
    try {
      const tr = await fetch(track.baseUrl, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(12000),
      });
      if (tr.ok) {
        const xml = await tr.text();
        const lines = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) =>
          decodeEntities(m[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
        );
        const transcript = lines.filter(Boolean).join(' ');
        if (transcript.length > 40) {
          const { text, truncated } = cap(`${title}\n\n${transcript}`);
          return { title, text, sourceType: 'youtube', truncated };
        }
      }
    } catch {
      /* fall through to description fallback */
    }
  }

  // Fallback: no transcript available → title + description.
  if (description.trim().length > 20) {
    const { text, truncated } = cap(
      `${title}\n\n[No transcript available — using video description]\n\n${description}`
    );
    return { title, text, sourceType: 'youtube', truncated };
  }
  return { error: 'No transcript or description available for this video.' };
}

// ─── Podcast / audio ──────────────────────────────────────────────────────────

const AUDIO_EXT = /\.(mp3|m4a|wav|aac|ogg|flac)(\?|$)/i;
const PODCAST_HOSTS =
  /(spotify\.com\/episode|podcasts\.apple\.com|anchor\.fm|buzzsprout\.com|libsyn\.com|simplecast\.com|podbean\.com|transistor\.fm|acast\.com|megaphone\.fm)/i;

async function extractPodcast(url) {
  if (AUDIO_EXT.test(url)) {
    return {
      error:
        'That looks like a direct audio file. Full audio transcription is out of scope for v1 — ' +
        'paste the show notes or episode description instead.',
    };
  }
  // Podcast landing pages: use the readable page text / description as show-notes.
  let html;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return { error: `The page returned ${r.status}.` };
    html = await r.text();
  } catch {
    return { error: 'Could not reach that podcast page.' };
  }
  const title = extractTitle(html);
  const desc = pickMeta(html, 'og:description') || pickMeta(html, 'description');
  const body = readableText(html);
  const combined = [desc, body].filter(Boolean).join('\n\n');
  if (combined.trim().length < 60) {
    return { error: 'No show-notes or description text found on that page.' };
  }
  const note =
    '[Podcast — using show notes / description. Full audio transcription is out of scope for v1.]';
  const { text, truncated } = cap(`${title}\n\n${note}\n\n${combined}`);
  return { title, text, sourceType: 'podcast', truncated };
}

// ─── Article / generic webpage ────────────────────────────────────────────────

async function extractArticle(url) {
  let res;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    return { error: 'Could not reach that URL. Check the link and try again.' };
  }
  if (res.status === 401 || res.status === 402 || res.status === 403) {
    return { error: 'This source is behind a paywall or login and cannot be read.' };
  }
  if (!res.ok) return { error: `The URL returned ${res.status}. Try a different link.` };

  const ct = res.headers.get('content-type') || '';
  if (/(pdf|image|audio|video|octet-stream|zip)/i.test(ct) && !/html|text/i.test(ct)) {
    return { error: `Unsupported content type (${ct.split(';')[0]}). Paste text or use a file upload.` };
  }

  let html;
  try {
    html = await res.text();
  } catch {
    return { error: 'Could not read the response body.' };
  }

  const title = extractTitle(html);
  let text = readableText(html);
  if (text.trim().length < 80) {
    // Thin body (JS-rendered SPA, etc.) — fall back to meta description.
    const desc = pickMeta(html, 'og:description') || pickMeta(html, 'description');
    if (desc) text = `${title}\n\n${desc}`;
  }
  if (text.trim().length < 40) {
    return { error: 'No readable content found — the page may be empty or JavaScript-rendered.' };
  }
  const { text: capped, truncated } = cap(text);
  return { title, text: capped, sourceType: 'article', truncated };
}

// ─── route ────────────────────────────────────────────────────────────────────

export async function POST(request) {
  let url;
  try {
    ({ url } = await request.json());
  } catch {
    return Response.json({ error: 'Bad request body.' }, { status: 400 });
  }

  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
    return Response.json(
      { error: 'Provide a valid http(s) URL (or paste text / upload a file instead).' },
      { status: 400 }
    );
  }
  url = url.trim();

  try {
    const host = new URL(url).hostname.toLowerCase();
    let result;
    if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host) || /youtube\.com|youtu\.be/.test(host)) {
      result = await extractYouTube(url);
    } else if (AUDIO_EXT.test(url) || PODCAST_HOSTS.test(url)) {
      result = await extractPodcast(url);
    } else {
      result = await extractArticle(url);
    }

    if (result.error) return Response.json({ error: result.error }, { status: 422 });
    return Response.json(result);
  } catch (e) {
    // Never throw uncaught — always a clear message.
    return Response.json(
      { error: 'Extraction failed unexpectedly. Try pasting the text directly.' },
      { status: 500 }
    );
  }
}
