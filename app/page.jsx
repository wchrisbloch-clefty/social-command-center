'use client';
import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, X, TrendingUp, Users, Sparkles, RefreshCw, Brain, Hash, Filter, Search, Sun, Moon, Layers, Bookmark, BookmarkCheck, Zap, Radio, Clock, ChevronDown, Wifi, WifiOff } from "lucide-react";

// ─── Platform Config ─────────────────────────────────────────────────────────
const PLATFORMS = {
  X: {
    color:"#E7E9EA", glow:"rgba(231,233,234,0.25)",
    bg:"rgba(231,233,234,0.06)", border:"rgba(231,233,234,0.18)",
    label:"X", engagementLabel:"Reposts · Replies · Views",
    icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 5.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    posts:[
      { id:"x1", author:"jerrod_lew", time:"22m ago", signal:9.6, buzzwords:["AI","strategy","business"], isThread:true, engagement:"3.1K reposts · 891 replies", content:"Hot take: most 'AI strategy' decks are just PowerPoint with chatGPT summaries stapled on. Real AI strategy starts with one question — where does speed of decision actually matter in your business?" },
      { id:"x2", author:"keythinker", time:"2h ago", signal:8.8, buzzwords:["creator","economy","thread"], isThread:true, engagement:"1.4K reposts · 423 replies", content:"Thread: Why the creator economy is about to split in two ↓\n\n1/ Two distinct creator tracks are forming. One is AI-augmented. One is deliberately, expensively human. Both will thrive. The middle will collapse." },
      { id:"x3", author:"nicheexpert", time:"6h ago", signal:8.3, buzzwords:["audience","growth","authentic"], isThread:false, engagement:"987 reposts · 312 replies", content:"Nobody talks about the unglamorous part of building an audience: the 18 months where you're basically shouting into a void. That phase is doing more for you than you realize." },
    ],
    trending:[
      { tag:"#BuildInPublic", volume:"31.2K posts", delta:"+44%" },
      { tag:"#AIStrategy", volume:"22.8K posts", delta:"+61%" },
      { tag:"#CreatorEconomy", volume:"18.4K posts", delta:"+27%" },
      { tag:"#IndieHacker", volume:"9.7K posts", delta:"+13%" },
      { tag:"#TechTakes", volume:"7.2K posts", delta:"+8%" },
    ],
    buzzwords:["AI","strategy","business","creator","economy","thread","audience","growth","authentic"],
  },
  Instagram:{
    color:"#E1306C", glow:"rgba(225,48,108,0.35)",
    bg:"rgba(225,48,108,0.08)", border:"rgba(225,48,108,0.25)",
    label:"Instagram", engagementLabel:"Views · Likes · Comments",
    icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
    posts:[
      { id:"ig1", author:"visualcreator", time:"45m ago", signal:9.1, buzzwords:["reel","photography","authentic"], isReel:true, engagement:"89K views · 12.4K likes", content:"Shot this at 4am. No filter. Sometimes the best frames happen when everyone else is asleep 🌄 New reel dropping tomorrow — this is the teaser." },
      { id:"ig2", author:"designinfluencer", time:"4h ago", signal:8.6, buzzwords:["brand","design","wellness"], isReel:false, engagement:"41K views · 8.7K likes", content:"Brand identity refresh for a client in the wellness space. The brief said 'calm but confident.' I think we nailed it. Swipe to see the before 👉" },
      { id:"ig3", author:"creativemind", time:"11h ago", signal:7.8, buzzwords:["content","authentic","strategy"], isReel:false, engagement:"28K views · 5.2K likes", content:"Honest truth: the posts that perform worst are the ones I spent the most time on. The ones I almost didn't post? Those go crazy. Stop overthinking." },
    ],
    trending:[
      { tag:"#ContentCreator", volume:"28.1K posts", delta:"+22%" },
      { tag:"#BrandIdentity", volume:"14.7K posts", delta:"+11%" },
      { tag:"#AestheticFeed", volume:"11.2K posts", delta:"+6%" },
      { tag:"#BehindTheLens", volume:"8.4K posts", delta:"+19%" },
      { tag:"#CreatorLife", volume:"6.1K posts", delta:"+8%" },
    ],
    buzzwords:["reel","photography","authentic","brand","design","wellness","content","strategy"],
  },
  LinkedIn:{
    color:"#0A66C2", glow:"rgba(10,102,194,0.35)",
    bg:"rgba(10,102,194,0.08)", border:"rgba(10,102,194,0.25)",
    label:"LinkedIn", engagementLabel:"Reactions · Saves · Dwell",
    icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    posts:[
      { id:"li1", author:"satyanadella", time:"1h ago", signal:9.4, buzzwords:["AI","productivity","Microsoft"], engagement:"4.2K reactions · 891 saves", content:"The next wave of productivity isn't about doing more — it's about deciding better. We're embedding AI reasoning directly into every workflow at Microsoft. The results in early pilots are striking." },
      { id:"li2", author:"reidhoffman", time:"3h ago", signal:8.9, buzzwords:["founders","strategy","growth"], engagement:"2.8K reactions · 543 saves", content:"Counterintuitive take: the founders winning right now aren't moving fast and breaking things. They're moving deliberately and fixing things before they break. Speed still matters — but so does precision." },
      { id:"li3", author:"yourmentor", time:"9h ago", signal:8.1, buzzwords:["career","portfolio","hiring"], engagement:"1.1K reactions · 287 comments", content:"I've reviewed 200+ portfolios this quarter. The ones that get callbacks all have one thing in common: they show thinking, not just output. Your resume is a proof-of-work document." },
    ],
    trending:[
      { tag:"#FutureOfWork", volume:"12.4K posts", delta:"+18%" },
      { tag:"#AIProductivity", volume:"9.1K posts", delta:"+31%" },
      { tag:"#LeadershipMindset", volume:"7.8K posts", delta:"+9%" },
      { tag:"#B2BGrowth", volume:"5.3K posts", delta:"+14%" },
      { tag:"#ExecutivePresence", volume:"3.9K posts", delta:"+7%" },
    ],
    buzzwords:["AI","productivity","founders","strategy","career","portfolio","hiring","growth","Microsoft"],
  },
  YouTube:{
    color:"#FF0000", glow:"rgba(255,0,0,0.3)",
    bg:"rgba(255,0,0,0.07)", border:"rgba(255,0,0,0.22)",
    label:"YouTube", engagementLabel:"Views · Comments · Watch time",
    icon:<svg width="18" height="13" viewBox="0 0 24 17" fill="currentColor"><path d="M23.495 2.205a3.02 3.02 0 0 0-2.122-2.136C19.505 0 12 0 12 0s-7.505 0-9.374.069A3.02 3.02 0 0 0 .505 2.205 31.247 31.247 0 0 0 0 8.465a31.247 31.247 0 0 0 .505 6.26 3.02 3.02 0 0 0 2.121 2.136C4.495 17 12 17 12 17s7.505 0 9.373-.069a3.02 3.02 0 0 0 2.122-2.136A31.247 31.247 0 0 0 24 8.465a31.247 31.247 0 0 0-.505-6.26zM9.609 12.093V4.837l6.264 3.628-6.264 3.628z"/></svg>,
    posts:[
      { id:"yt1", author:"andrewhuberman", time:"3h ago", signal:9.3, buzzwords:["science","focus","neuroscience"], isVideo:true, engagement:"48K views · 1.2K comments", content:"NEW: 'The Science of Deep Focus' — 2hr deep dive into neurochemistry of attention, dopamine regulation, and protocols for sustained cognitive performance. Timestamp guide in description." },
      { id:"yt2", author:"lexfridman", time:"1d ago", signal:9.7, buzzwords:["AGI","podcast","research"], isVideo:true, engagement:"312K views · 4.8K comments", content:"Just posted my 4-hour conversation with a researcher working on AGI timelines. This one kept me up at night. We go places most podcasts won't." },
      { id:"yt3", author:"techreviewer", time:"2d ago", signal:8.5, buzzwords:["AI","tools","review"], isVideo:true, engagement:"89K views · 2.1K comments", content:"I used ONLY AI tools to run my channel for 30 days. Scripting, editing, thumbnails, SEO — all AI. Here's what actually worked, what was garbage, and what surprised me." },
    ],
    trending:[
      { tag:"#LongFormContent", volume:"19.3K posts", delta:"+16%" },
      { tag:"#PodcastClips", volume:"14.1K posts", delta:"+29%" },
      { tag:"#ScienceExplained", volume:"11.8K posts", delta:"+12%" },
      { tag:"#TechReview", volume:"8.6K posts", delta:"+7%" },
      { tag:"#DeepDive", volume:"6.4K posts", delta:"+21%" },
    ],
    buzzwords:["science","focus","neuroscience","AGI","podcast","research","AI","tools","review"],
  },
};

const DEFAULT_CIRCLE = {
  X:["jerrod_lew","keythinker","nicheexpert"],
  Instagram:["visualcreator","designinfluencer","creativemind"],
  LinkedIn:["satyanadella","reidhoffman","yourmentor"],
  YouTube:["andrewhuberman","lexfridman","techreviewer"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function signalMeta(s) {
  if (s >= 9.3) return { color:"#10b981", label:"High Signal", ring:"rgba(16,185,129,0.15)" };
  if (s >= 8.5) return { color:"#f59e0b", label:"Rising", ring:"rgba(245,158,11,0.12)" };
  return { color:"#52525b", label:"Moderate", ring:"rgba(82,82,91,0.1)" };
}
function ContentBadge({ post, cfg, platform }) {
  let label = null;
  if (post.isVideo) label = "▶ Video";
  else if (post.isReel) label = "▶ Reel";
  else if (post.isThread) label = "🧵 Thread";
  if (!label) return null;
  return <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.color }}>{label}</span>;
}

// ─── Top Signal Strip ─────────────────────────────────────────────────────────
function TopSignalStrip({ dark, onJump }) {
  const top = Object.entries(PLATFORMS).flatMap(([p, cfg]) =>
    cfg.posts.map(post => ({ ...post, platform:p }))
  ).sort((a,b) => b.signal - a.signal)[0];
  if (!top) return null;
  const cfg = PLATFORMS[top.platform];
  const textSub = dark ? "#71717a" : "#64748b";
  return (
    <button onClick={() => onJump(top.platform)}
      className="w-full flex items-center gap-3 px-4 py-2.5 mb-5 rounded-xl text-left transition-all hover:opacity-90"
      style={{ background:`linear-gradient(90deg, ${cfg.bg} 0%, transparent 100%)`, border:`1px solid ${cfg.border}` }}>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: cfg.color }}/>
        <Zap size={12} style={{ color: cfg.color }}/>
        <span className="text-xs font-bold" style={{ color: cfg.color }}>Top Signal</span>
      </div>
      <span style={{ color: cfg.color }}>{cfg.icon}</span>
      <span className="text-xs font-semibold truncate" style={{ color: dark?"#e4e4e7":"#0f172a" }}>@{top.author}: {top.content.slice(0,60)}…</span>
      <span className="text-xs ml-auto shrink-0 font-bold" style={{ color:"#10b981" }}>▲{top.signal}</span>
    </button>
  );
}

// ─── AI Brief ─────────────────────────────────────────────────────────────────
function AIBriefPanel({ platform, posts, circle, dark }) {
  const cfg = PLATFORMS[platform];
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [timestamp, setTimestamp] = useState(null);
  const prevPlatform = useRef(null);
  const textSub = dark ? "#71717a" : "#64748b";

  const generate = async (plt, psts, crcl) => {
    setLoading(true); setBrief("");
    const summary = psts.map((p,i)=>`Post ${i+1} by @${p.author}: "${p.content}" — Signal: ${p.signal}/10`).join("\n");
    const prompt = `You are an AI analyst for a social media command center. User monitors ${plt}: ${crcl.join(", ")}.
Posts:
${summary}
Write a sharp intelligence brief (3 sentences MAX):
1. Dominant theme right now
2. One account to engage with TODAY and why
3. One concrete action in next 24 hours
Direct. No fluff. Chief of staff tone.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:250, messages:[{role:"user",content:prompt}] }),
      });
      const data = await res.json();
      setBrief(data?.content?.[0]?.text || "Unable to generate.");
    } catch { setBrief("Connection failed. Try again."); }
    setLoading(false);
    setTimestamp(new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}));
  };

  useEffect(() => {
    if (prevPlatform.current !== platform) {
      prevPlatform.current = platform;
      generate(platform, posts, circle);
    }
  }, [platform]);

  return (
    <div className="rounded-2xl p-5 border" style={{ background:cfg.bg, borderColor:cfg.border, boxShadow:`0 0 20px ${cfg.glow}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain size={14} style={{ color:cfg.color }}/>
          <span className="text-sm font-semibold" style={{ color:cfg.color }}>AI Brief</span>
          {timestamp && !loading && <span className="text-xs flex items-center gap-1" style={{ color:textSub }}><Clock size={10}/>{timestamp}</span>}
        </div>
        <button onClick={()=>generate(platform,posts,circle)} disabled={loading}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium"
          style={{ background:cfg.color, color:platform==="X"?"#000":"#fff", opacity:loading?0.6:1 }}>
          {loading?<RefreshCw size={10} className="animate-spin"/>:<Sparkles size={10}/>}
          {loading?"...":"Refresh"}
        </button>
      </div>
      {loading && <div className="space-y-2">{[80,65,45].map((w,i)=><div key={i} className="h-2.5 rounded animate-pulse" style={{ background:cfg.border, width:`${w}%` }}/>)}</div>}
      {brief && !loading && <p className="text-xs leading-relaxed" style={{ color:dark?"#d4d4d8":"#374151" }}>{brief}</p>}
      {!brief && !loading && <p className="text-xs" style={{ color:textSub }}>Generating your {platform} brief…</p>}
    </div>
  );
}

// ─── Gemini Handle Search ─────────────────────────────────────────────────────
function HandleSearch({ onAdd, dark }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const textSub = dark ? "#71717a" : "#64748b";
  const surface = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const border = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const textMain = dark ? "#f4f4f5" : "#0f172a";

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setResults(null);
    const prompt = `For the public figure or creator named "${query}", find their social media handles on X (Twitter), Instagram, LinkedIn, and YouTube. Return ONLY a JSON object like:
{"X":"handle","Instagram":"handle","LinkedIn":"handle","YouTube":"handle"}
Use null if no handle exists. No @ symbol. No explanation. Just the JSON.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:150, messages:[{role:"user",content:prompt}] }),
      });
      const data = await res.json();
      const text = data?.content?.[0]?.text || "{}";
      const clean = text.replace(/```json|```/g,"").trim();
      setResults(JSON.parse(clean));
    } catch { setResults({}); }
    setLoading(false);
  };

  return (
    <div className="mb-4">
      <p className="text-xs mb-2 font-semibold" style={{ color:textSub }}>Search by name — AI finds their handles</p>
      <div className="flex gap-2 mb-3">
        <input type="text" value={query} onChange={e=>setQuery(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&search()}
          placeholder="e.g. Andrew Huberman, Elon Musk…"
          className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
          style={{ background:surface, border:`1px solid ${border}`, color:textMain }}/>
        <button onClick={search} disabled={loading}
          className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          style={{ background:"#10b981", color:"#fff", opacity:loading?0.6:1 }}>
          {loading?<RefreshCw size={12} className="animate-spin"/>:<Search size={12}/>}
          {loading?"…":"Find"}
        </button>
      </div>
      {results && (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor:border }}>
          {Object.entries(results).map(([platform, handle]) => {
            if (!handle) return null;
            const cfg = PLATFORMS[platform];
            return (
              <div key={platform} className="flex items-center justify-between px-3 py-2.5 border-b last:border-b-0"
                style={{ background:surface, borderColor:border }}>
                <div className="flex items-center gap-2">
                  <span style={{ color:cfg?.color||"#10b981" }}>{cfg?.icon}</span>
                  <span className="text-xs" style={{ color:textSub }}>{platform}</span>
                  <span className="text-xs font-semibold" style={{ color:textMain }}>@{handle}</span>
                </div>
                <button onClick={()=>onAdd(platform, handle)}
                  className="text-xs px-2.5 py-1 rounded-lg font-medium"
                  style={{ background:cfg?.bg||"rgba(16,185,129,0.1)", color:cfg?.color||"#10b981", border:`1px solid ${cfg?.border||"rgba(16,185,129,0.2)"}` }}>
                  + Add
                </button>
              </div>
            );
          })}
          {Object.values(results).every(v=>!v) && (
            <div className="px-3 py-3 text-xs text-center" style={{ color:textSub }}>No handles found. Try a more specific name.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Live/Smart Toggle ────────────────────────────────────────────────────────
function SourceToggle({ platform, mode, onToggle, dark }) {
  const cfg = PLATFORMS[platform];
  const isLive = mode === "live";
  return (
    <div className="flex items-center gap-2 mb-4">
      <button onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
        style={isLive
          ? { background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.3)", color:"#10b981" }
          : { background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.color }}>
        {isLive ? <><Wifi size={11}/> Live</> : <><WifiOff size={11}/> Smart</>}
      </button>
      {isLive && (
        <span className="text-xs px-3 py-1.5 rounded-xl"
          style={{ background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)", color:"#10b981" }}>
          Connect Windsor to enable live data
        </span>
      )}
      {!isLive && (
        <span className="text-xs" style={{ color:dark?"#52525b":"#94a3b8" }}>Gemini-powered simulation</span>
      )}
    </div>
  );
}

// ─── Hero Post Card ───────────────────────────────────────────────────────────
function HeroCard({ post, platform, activeFilter, dark, onBookmark, bookmarked }) {
  const cfg = PLATFORMS[platform];
  const sig = signalMeta(post.signal);
  const textMain = dark?"#f4f4f5":"#0f172a";
  const textSub = dark?"#a1a1aa":"#64748b";
  return (
    <div className="rounded-2xl p-6 border-2 mb-4" style={{ background:cfg.bg, borderColor:cfg.color, boxShadow:`0 0 32px ${cfg.glow}` }}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black"
            style={{ background:cfg.color, color:platform==="X"?"#000":"#fff" }}>
            {post.author[0].toUpperCase()}
          </div>
          <div>
            <div className="font-bold" style={{ color:textMain }}>@{post.author}</div>
            <div className="text-xs flex items-center gap-1" style={{ color:textSub }}>
              <Clock size={10}/>{post.time} · <span style={{ color:cfg.color }}>Top Signal</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5"
            style={{ background:sig.ring, color:sig.color }}>
            ▲{post.signal} <span className="text-xs font-semibold opacity-80">{sig.label}</span>
          </div>
          <button onClick={()=>onBookmark(post)} className="p-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ color:bookmarked?"#f59e0b":textSub }}>
            {bookmarked?<BookmarkCheck size={16}/>:<Bookmark size={16}/>}
          </button>
        </div>
      </div>
      {post.isVideo && (
        <div className="w-full h-24 rounded-xl mb-4 flex items-center justify-center"
          style={{ background:"rgba(255,0,0,0.1)", border:"1px solid rgba(255,0,0,0.2)" }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background:"#FF0000" }}>
              <svg width="10" height="10" viewBox="0 0 24 17" fill="white"><path d="M9.609 12.093V4.837l6.264 3.628-6.264 3.628z"/></svg>
            </div>
            <span className="text-xs" style={{ color:"#FF0000" }}>Watch on YouTube</span>
          </div>
        </div>
      )}
      {post.isReel && (
        <div className="w-full h-16 rounded-xl mb-4 flex items-center justify-center"
          style={{ background:"rgba(225,48,108,0.1)", border:"1px solid rgba(225,48,108,0.2)" }}>
          <span className="text-xs" style={{ color:"#E1306C" }}>▶ Reel · View on Instagram</span>
        </div>
      )}
      <p className="text-sm leading-relaxed mb-4 whitespace-pre-line font-medium" style={{ color:textMain }}>{post.content}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {post.buzzwords?.map((w,i)=>(
          <span key={i} className="text-xs px-2.5 py-1 rounded-lg font-bold"
            style={{ background:cfg.color, color:platform==="X"?"#000":"#fff" }}>{w}</span>
        ))}
      </div>
      <div className="flex items-center gap-1 text-xs" style={{ color:textSub }}>
        <ContentBadge post={post} cfg={cfg} platform={platform}/>
        <span className="ml-auto"><span style={{ color:cfg.color }}>◆</span> {post.engagement}</span>
      </div>
    </div>
  );
}

// ─── Standard Post Card (Ghost treatment at rest) ─────────────────────────────
function PostCard({ post, platform, activeFilter, dark, onBookmark, bookmarked }) {
  const cfg = PLATFORMS[platform];
  const sig = signalMeta(post.signal);
  const isHighlighted = activeFilter && post.buzzwords?.some(b=>b.toLowerCase()===activeFilter.toLowerCase());
  const textMain = dark?"#e4e4e7":"#1e293b";
  const textSub = dark?"#71717a":"#64748b";
  // Ghost at rest — only background/border when highlighted
  return (
    <div className="rounded-2xl p-5 transition-all duration-200 hover:scale-[1.003]"
      style={{
        background: isHighlighted ? cfg.bg : "transparent",
        border: isHighlighted ? `1px solid ${cfg.border}` : `1px solid ${dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"}`,
        boxShadow: isHighlighted ? `0 0 16px ${cfg.glow}` : "none",
      }}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold"
            style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.color }}>
            {post.author[0].toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color:textMain }}>@{post.author}</div>
            <div className="text-xs flex items-center gap-1" style={{ color:textSub }}>
              <Clock size={9}/>{post.time}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ContentBadge post={post} cfg={cfg} platform={platform}/>
          <div className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background:sig.ring, color:sig.color }}>▲{post.signal}</div>
          <button onClick={()=>onBookmark(post)} className="p-1 rounded-lg transition-colors hover:opacity-70"
            style={{ color:bookmarked?"#f59e0b":textSub }}>
            {bookmarked?<BookmarkCheck size={14}/>:<Bookmark size={14}/>}
          </button>
        </div>
      </div>
      <p className="text-sm leading-relaxed mb-3 whitespace-pre-line" style={{ color:textMain }}>{post.content}</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {post.buzzwords?.map((w,i)=>{
          const active = activeFilter?.toLowerCase()===w.toLowerCase();
          return (
            <span key={i} className="text-xs px-2 py-0.5 rounded-md font-medium"
              style={{ background:active?cfg.color:cfg.bg, color:active?(platform==="X"?"#000":"#fff"):cfg.color, border:`1px solid ${cfg.border}` }}>
              {w}
            </span>
          );
        })}
      </div>
      <div className="text-xs" style={{ color:textSub }}>
        <span style={{ color:cfg.color }}>◆</span> {post.engagement}
      </div>
    </div>
  );
}

// ─── Trending Panel ───────────────────────────────────────────────────────────
function TrendingPanel({ platform, activeFilter, onFilter, dark }) {
  const cfg = PLATFORMS[platform];
  const textSub = dark?"#71717a":"#64748b";
  const surface = dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)";
  const borderBase = dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)";
  return (
    <div className="rounded-2xl p-5 border" style={{ background:surface, borderColor:borderBase }}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={13} style={{ color:cfg.color }}/>
        <span className="text-sm font-semibold" style={{ color:dark?"#e4e4e7":"#0f172a" }}>Trending · {platform}</span>
        <span className="text-xs ml-auto" style={{ color:textSub }}>tap to filter</span>
      </div>
      <div className="space-y-1.5">
        {cfg.trending.map((t,i)=>{
          const clean=t.tag.replace("#","");
          const active=activeFilter===clean;
          return (
            <button key={i} onClick={()=>onFilter(active?null:clean)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left"
              style={{ background:active?cfg.color:cfg.bg, border:`1px solid ${active?cfg.color:cfg.border}`, boxShadow:active?`0 0 10px ${cfg.glow}`:"none" }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold w-4" style={{ color:active?(platform==="X"?"#000":"rgba(255,255,255,0.5)"):"#52525b" }}>{i+1}</span>
                <span className="text-xs font-semibold" style={{ color:active?(platform==="X"?"#000":"#fff"):cfg.color }}>{t.tag}</span>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color:active?(platform==="X"?"rgba(0,0,0,0.6)":"rgba(255,255,255,0.6)"):textSub }}>{t.volume}</div>
                <div className="text-xs font-bold" style={{ color:active?(platform==="X"?"#000":"#86efac"):"#10b981" }}>{t.delta}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Buzzwords Panel ──────────────────────────────────────────────────────────
function BuzzwordsPanel({ platform, activeFilter, onFilter, dark }) {
  const cfg = PLATFORMS[platform];
  const surface = dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)";
  const borderBase = dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)";
  return (
    <div className="rounded-2xl p-5 border" style={{ background:surface, borderColor:borderBase }}>
      <div className="flex items-center gap-2 mb-3">
        <Hash size={13} style={{ color:cfg.color }}/>
        <span className="text-sm font-semibold" style={{ color:dark?"#e4e4e7":"#0f172a" }}>Buzzwords</span>
        <span className="text-xs ml-auto" style={{ color:dark?"#71717a":"#64748b" }}>tap to filter</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {cfg.buzzwords.map((word,i)=>{
          const active=activeFilter?.toLowerCase()===word.toLowerCase();
          return (
            <button key={i} onClick={()=>onFilter(active?null:word)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={active ? { background:cfg.color, color:platform==="X"?"#000":"#fff", boxShadow:`0 0 8px ${cfg.glow}` }
                           : { background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.color }}>
              {word}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Circle Preview ───────────────────────────────────────────────────────────
function CirclePanel({ platform, circle, onEdit, dark }) {
  const cfg = PLATFORMS[platform];
  const accounts = circle[platform]||[];
  const textMain = dark?"#e4e4e7":"#0f172a";
  const textSub = dark?"#71717a":"#64748b";
  const surface = dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)";
  const borderBase = dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)";
  return (
    <div className="rounded-2xl p-5 border" style={{ background:surface, borderColor:borderBase }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color:textMain }}>Your Circle</span>
        <button onClick={onEdit} className="text-xs hover:opacity-70" style={{ color:cfg.color }}>Edit →</button>
      </div>
      {accounts.length===0
        ? <p className="text-xs" style={{ color:textSub }}>No accounts yet.</p>
        : <div className="space-y-2">
            {accounts.slice(0,5).map((acc,i)=>(
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background:cfg.bg, color:cfg.color }}>{acc[0].toUpperCase()}</div>
                <span className="text-xs" style={{ color:textSub }}>@{acc}</span>
              </div>
            ))}
            {accounts.length>5 && <p className="text-xs pl-8" style={{ color:textSub }}>+{accounts.length-5} more</p>}
          </div>
      }
    </div>
  );
}

// ─── Saved Tab ────────────────────────────────────────────────────────────────
function SavedTab({ saved, onRemove, dark }) {
  const textMain = dark?"#e4e4e7":"#0f172a";
  const textSub = dark?"#71717a":"#64748b";
  if (saved.length===0) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Bookmark size={36} className="mb-4" style={{ color:textSub }}/>
      <p className="text-sm font-semibold mb-1" style={{ color:textMain }}>No saved posts yet</p>
      <p className="text-xs" style={{ color:textSub }}>Tap the bookmark icon on any post to save it here</p>
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold" style={{ color:textMain }}>{saved.length} saved post{saved.length!==1?"s":""}</span>
      </div>
      {saved.map((item,i)=>{
        const cfg = PLATFORMS[item.platform];
        return (
          <div key={i} className="rounded-2xl p-4 border" style={{ background:cfg.bg, borderColor:cfg.border }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span style={{ color:cfg.color }}>{cfg.icon}</span>
                <span className="text-xs font-semibold" style={{ color:cfg.color }}>@{item.author}</span>
                <span className="text-xs" style={{ color:dark?"#52525b":"#94a3b8" }}>· {item.platform}</span>
              </div>
              <button onClick={()=>onRemove(item.id)} className="text-xs px-2 py-1 rounded-lg"
                style={{ background:"rgba(239,68,68,0.1)", color:"#ef4444" }}>Remove</button>
            </div>
            <p className="text-xs leading-relaxed" style={{ color:dark?"#a1a1aa":"#374151" }}>{item.content.slice(0,120)}{item.content.length>120?"…":""}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Today Tab ────────────────────────────────────────────────────────────────
function TodayTab({ circle, activeFilter, onFilter, dark, onBookmark, bookmarks }) {
  const textMain = dark?"#e4e4e7":"#0f172a";
  const textSub = dark?"#71717a":"#64748b";
  const allPosts = Object.entries(PLATFORMS).flatMap(([p,cfg])=>cfg.posts.map(post=>({...post,platform:p})));
  const topByPlatform = Object.keys(PLATFORMS).map(p=>({
    platform:p,
    post:[...PLATFORMS[p].posts].sort((a,b)=>b.signal-a.signal)[0]
  })).sort((a,b)=>b.post.signal-a.post.signal);

  const filtered = activeFilter
    ? allPosts.filter(p=>p.buzzwords?.some(b=>b.toLowerCase()===activeFilter.toLowerCase())||p.content.toLowerCase().includes(activeFilter.toLowerCase()))
    : null;

  if (filtered) return (
    <div>
      <p className="text-xs mb-4" style={{ color:textSub }}>
        <strong style={{ color:"#10b981" }}>{filtered.length}</strong> posts across all platforms matching <strong>"{activeFilter}"</strong>
      </p>
      <div className="space-y-3">
        {filtered.map((post,i)=>{
          const cfg = PLATFORMS[post.platform];
          return (
            <div key={i}>
              <div className="flex items-center gap-2 mb-1.5">
                <span style={{ color:cfg.color }}>{cfg.icon}</span>
                <span className="text-xs font-semibold" style={{ color:cfg.color }}>{post.platform}</span>
              </div>
              <PostCard post={post} platform={post.platform} activeFilter={activeFilter} dark={dark}
                onBookmark={onBookmark} bookmarked={bookmarks.some(b=>b.id===post.id)}/>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color:textSub }}>Top Signal Today</span>
      </div>
      {(() => {
        const { platform, post } = topByPlatform[0];
        const cfg = PLATFORMS[platform];
        return (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color:cfg.color }}>{cfg.icon}</span>
              <span className="text-xs font-semibold" style={{ color:cfg.color }}>{platform}</span>
            </div>
            <HeroCard post={post} platform={platform} dark={dark} onBookmark={onBookmark}
              bookmarked={bookmarks.some(b=>b.id===post.id)}/>
          </div>
        );
      })()}
      <div className="mb-3 mt-2">
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color:textSub }}>Best From Each Platform</span>
      </div>
      <div className="space-y-4">
        {topByPlatform.slice(1).map(({platform,post})=>{
          const cfg = PLATFORMS[platform];
          return (
            <div key={platform}>
              <div className="flex items-center gap-2 mb-1.5">
                <span style={{ color:cfg.color }}>{cfg.icon}</span>
                <span className="text-xs font-semibold" style={{ color:cfg.color }}>{platform}</span>
                <span className="text-xs" style={{ color:textSub }}>· {circle[platform]?.length||0} accounts</span>
              </div>
              <PostCard post={post} platform={platform} dark={dark} onBookmark={onBookmark}
                bookmarked={bookmarks.some(b=>b.id===post.id)}/>
            </div>
          );
        })}
      </div>
      {/* Cross-platform trending */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={13} style={{ color:"#10b981" }}/>
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color:textSub }}>Hottest Across All Platforms</span>
        </div>
        <div className="space-y-1.5">
          {Object.entries(PLATFORMS).flatMap(([p,cfg])=>cfg.trending.map(t=>({...t,platform:p,color:cfg.color,icon:cfg.icon})))
            .sort((a,b)=>parseFloat(b.delta)-parseFloat(a.delta)).slice(0,6).map((t,i)=>(
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background:dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)" }}>
                <div className="flex items-center gap-2">
                  <span style={{ color:t.color }}>{t.icon}</span>
                  <span className="text-xs font-semibold" style={{ color:t.color }}>{t.tag}</span>
                </div>
                <span className="text-xs font-bold" style={{ color:"#10b981" }}>{t.delta}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Sidebar Strip ─────────────────────────────────────────────────────
function MobileStrip({ platform, activeFilter, onFilter, dark }) {
  const cfg = PLATFORMS[platform];
  const [open, setOpen] = useState(null);
  return (
    <div className="lg:hidden mb-4">
      <div className="flex gap-2 mb-2">
        {["trending","buzzwords"].map(type=>(
          <button key={type} onClick={()=>setOpen(open===type?null:type)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold capitalize"
            style={open===type ? { background:cfg.color, color:platform==="X"?"#000":"#fff" }
                               : { background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.color }}>
            {type==="trending"?<TrendingUp size={11}/>:<Hash size={11}/>}{type}
          </button>
        ))}
        {activeFilter && (
          <button onClick={()=>onFilter(null)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444" }}>
            <X size={10}/> Clear
          </button>
        )}
      </div>
      {open==="trending" && (
        <div className="rounded-xl p-3 border mb-2" style={{ background:cfg.bg, borderColor:cfg.border }}>
          <div className="space-y-1">
            {cfg.trending.map((t,i)=>{
              const clean=t.tag.replace("#","");
              const active=activeFilter===clean;
              return (
                <button key={i} onClick={()=>{onFilter(active?null:clean);setOpen(null);}}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left"
                  style={{ background:active?cfg.color:"transparent", border:`1px solid ${active?cfg.color:cfg.border}` }}>
                  <span className="text-xs font-semibold" style={{ color:active?(platform==="X"?"#000":"#fff"):cfg.color }}>{t.tag}</span>
                  <span className="text-xs font-bold" style={{ color:active?(platform==="X"?"#000":"#86efac"):"#10b981" }}>{t.delta}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {open==="buzzwords" && (
        <div className="rounded-xl p-3 border mb-2 flex flex-wrap gap-2" style={{ background:cfg.bg, borderColor:cfg.border }}>
          {cfg.buzzwords.map((word,i)=>{
            const active=activeFilter?.toLowerCase()===word.toLowerCase();
            return (
              <button key={i} onClick={()=>{onFilter(active?null:word);setOpen(null);}}
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={active ? { background:cfg.color, color:platform==="X"?"#000":"#fff" }
                             : { background:"rgba(255,255,255,0.05)", border:`1px solid ${cfg.border}`, color:cfg.color }}>
                {word}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function SocialCommandCenter() {
  const [activeTab, setActiveTab] = useState("Today");
  const [showModal, setShowModal] = useState(false);
  const [modalPlatform, setModalPlatform] = useState("X");
  const [newAccount, setNewAccount] = useState("");
  const [circle, setCircle] = useState(DEFAULT_CIRCLE);
  const [activeFilter, setActiveFilter] = useState(null);
  const [dark, setDark] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [sourceModes, setSourceModes] = useState({ X:"smart", Instagram:"smart", LinkedIn:"smart", YouTube:"smart" });

  const isToday = activeTab==="Today";
  const isSaved = activeTab==="Saved";
  const isPlatform = !isToday && !isSaved;
  const activePlatform = isPlatform ? activeTab : "X";
  const cfg = isPlatform ? PLATFORMS[activeTab] : null;
  const allPosts = isPlatform ? PLATFORMS[activeTab].posts : [];
  const sortedPosts = [...allPosts].sort((a,b)=>b.signal-a.signal);
  const hero = sortedPosts[0];
  const rest = sortedPosts.slice(1);
  const filterTerm = globalSearch.trim().toLowerCase() || activeFilter?.toLowerCase() || null;
  const filteredRest = filterTerm ? rest.filter(p=>p.buzzwords?.some(b=>b.toLowerCase()===filterTerm)||p.content.toLowerCase().includes(filterTerm)) : rest;

  const handleFilter = (word) => { setActiveFilter(prev=>prev===word?null:word); setGlobalSearch(""); };
  const switchTab = (t) => { setActiveTab(t); setActiveFilter(null); setGlobalSearch(""); };
  const toggleMode = (platform) => setSourceModes(prev=>({...prev,[platform]:prev[platform]==="smart"?"live":"smart"}));

  const addAccount = () => {
    if (!newAccount.trim()) return;
    setCircle(prev=>({...prev,[modalPlatform]:[...(prev[modalPlatform]||[]),newAccount.trim()]}));
    setNewAccount("");
  };
  const addFromSearch = (platform, handle) => {
    if (!handle) return;
    setCircle(prev=>({...prev,[platform]:[...(prev[platform]||[]).filter(a=>a!==handle),handle]}));
  };
  const removeAccount = (platform, account) => setCircle(prev=>({...prev,[platform]:prev[platform].filter(a=>a!==account)}));

  const toggleBookmark = (post) => {
    setBookmarks(prev=>{
      const exists = prev.some(b=>b.id===post.id);
      return exists ? prev.filter(b=>b.id!==post.id) : [...prev, {...post, platform:activeTab}];
    });
  };
  const toggleBookmarkWithPlatform = (post, platform) => {
    setBookmarks(prev=>{
      const exists = prev.some(b=>b.id===post.id);
      return exists ? prev.filter(b=>b.id!==post.id) : [...prev, {...post, platform}];
    });
  };

  // Theme
  const bg = dark?"#09090e":"#f1f5f9";
  const surface = dark?"#111116":"#ffffff";
  const textMain = dark?"#f4f4f5":"#0f172a";
  const textSub = dark?"#71717a":"#64748b";
  const tabInactive = dark
    ? { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", color:"#52525b" }
    : { background:"rgba(0,0,0,0.04)", border:"1px solid rgba(0,0,0,0.07)", color:"#94a3b8" };

  const tabs = ["Today", "X", "Instagram", "LinkedIn", "YouTube", "Saved"];

  return (
    <div className="min-h-screen" style={{ background:bg, fontFamily:"'DM Sans', sans-serif", transition:"background 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        .scrollbar-none::-webkit-scrollbar { display:none; }
        * { -webkit-font-smoothing:antialiased; }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-7">
          <div>
            <h1 style={{
              fontFamily:"'Syne', sans-serif",
              fontSize:"clamp(1.5rem,4vw,2.4rem)",
              fontWeight:800, lineHeight:1,
              background: isToday||isSaved
                ? `linear-gradient(135deg, ${dark?"#fff":"#0f172a"} 0%, #10b981 100%)`
                : `linear-gradient(135deg, ${dark?"#fff":"#0f172a"} 0%, ${PLATFORMS[activePlatform]?.color} 100%)`,
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", transition:"all 0.4s",
            }}>Command Center</h1>
            <p className="text-xs mt-0.5" style={{ color:textSub }}>Inner Circle · Social Intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setShowSearch(s=>!s)}
              className="p-2.5 rounded-xl transition-all"
              style={showSearch ? { background:"#10b981", color:"#fff" } : { ...tabInactive }}>
              <Search size={15}/>
            </button>
            <button onClick={()=>setDark(d=>!d)} className="p-2.5 rounded-xl" style={{ ...tabInactive }}>
              {dark?<Sun size={15}/>:<Moon size={15}/>}
            </button>
            <button onClick={()=>{ setShowModal(true); setModalPlatform(isPlatform?activeTab:"X"); }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium"
              style={{ ...tabInactive }}>
              <Users size={13}/><span className="hidden sm:inline">Circle</span>
              {bookmarks.length>0 && <span className="hidden sm:inline text-amber-400">· {bookmarks.length} saved</span>}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="mb-5 relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color:textSub }}/>
            <input autoFocus type="text" value={globalSearch}
              onChange={e=>{setGlobalSearch(e.target.value);setActiveFilter(null);}}
              placeholder="Search across all platforms…"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
              style={{ background:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)", border:`1px solid ${dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`, color:textMain }}/>
            {globalSearch && <button onClick={()=>setGlobalSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:textSub }}><X size={13}/></button>}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none mb-6 pb-1">
          {tabs.map(tab=>{
            const isActive = activeTab===tab;
            const p = PLATFORMS[tab];
            const isSavedTab = tab==="Saved";
            return (
              <button key={tab} onClick={()=>switchTab(tab)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
                style={isActive
                  ? tab==="Today" ? { background:"#10b981", color:"#fff", boxShadow:"0 0 18px rgba(16,185,129,0.4)" }
                  : isSavedTab ? { background:"#f59e0b", color:"#000", boxShadow:"0 0 18px rgba(245,158,11,0.4)" }
                  : { background:p.color, color:tab==="X"?"#000":"#fff", boxShadow:`0 0 18px ${p.glow}` }
                  : tabInactive}>
                {tab==="Today" && <><Layers size={13}/> Today</>}
                {isSavedTab && <><Bookmark size={13}/> Saved {bookmarks.length>0&&<span className="text-xs opacity-80">({bookmarks.length})</span>}</>}
                {p && <><span style={{ color:isActive?(tab==="X"?"#000":"#fff"):p.color }}>{p.icon}</span>{tab}
                  <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background:"rgba(0,0,0,0.2)", color:isActive?(tab==="X"?"rgba(0,0,0,0.7)":"rgba(255,255,255,0.7)"):"#52525b" }}>
                    {circle[tab]?.length||0}
                  </span></>}
              </button>
            );
          })}
        </div>

        {/* Top Signal Strip */}
        {(isToday||isPlatform) && (
          <TopSignalStrip dark={dark} onJump={p=>{setActiveTab(p);setActiveFilter(null);}}/>
        )}

        {/* Body */}
        {isSaved ? (
          <SavedTab saved={bookmarks} onRemove={id=>setBookmarks(prev=>prev.filter(b=>b.id!==id))} dark={dark}/>
        ) : isToday ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <div className="flex items-center gap-2 mb-4">
                <Radio size={13} style={{ color:"#10b981" }}/>
                <span className="text-sm font-semibold" style={{ color:textMain }}>Today's Intelligence</span>
                {activeFilter && (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold ml-2"
                    style={{ background:"#10b981", color:"#fff" }}>
                    <Filter size={10}/>{activeFilter}
                    <button onClick={()=>setActiveFilter(null)}><X size={10}/></button>
                  </span>
                )}
              </div>
              <TodayTab circle={circle} activeFilter={activeFilter||globalSearch.trim()||null}
                onFilter={handleFilter} dark={dark} onBookmark={toggleBookmarkWithPlatform} bookmarks={bookmarks}/>
            </div>
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl p-5 border" style={{ background:dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)", borderColor:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Hash size={13} style={{ color:"#10b981" }}/>
                  <span className="text-sm font-semibold" style={{ color:textMain }}>All Platform Buzzwords</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(Object.values(PLATFORMS).flatMap(p=>p.buzzwords))].slice(0,14).map((word,i)=>{
                    const active=(activeFilter||globalSearch).toLowerCase()===word.toLowerCase();
                    return (
                      <button key={i} onClick={()=>handleFilter(active?null:word)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                        style={active ? { background:"#10b981", color:"#fff" }
                                     : { background:dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)", border:`1px solid ${dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"}`, color:"#10b981" }}>
                        {word}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold" style={{ color:textMain }}>
                  Inner Circle · <span style={{ color:cfg.color }}>{activeTab}</span>
                </h2>
                <span className="text-xs flex items-center gap-1" style={{ color:textSub }}>
                  <Clock size={10}/> Updated just now · {circle[activeTab]?.length||0} accounts
                </span>
              </div>

              <SourceToggle platform={activeTab} mode={sourceModes[activeTab]} onToggle={()=>toggleMode(activeTab)} dark={dark}/>

              {filterTerm && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={{ background:cfg.color, color:activeTab==="X"?"#000":"#fff" }}>
                    <Filter size={10}/>{filterTerm}
                    <button onClick={()=>{setActiveFilter(null);setGlobalSearch("");}}><X size={10}/></button>
                  </div>
                  <span className="text-xs" style={{ color:textSub }}>{filteredRest.length+1} of {allPosts.length} posts</span>
                </div>
              )}

              <MobileStrip platform={activeTab} activeFilter={activeFilter} onFilter={handleFilter} dark={dark}/>

              {(circle[activeTab]?.length||0)===0 ? (
                <div className="rounded-2xl p-12 text-center border"
                  style={{ borderColor:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)", background:dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)" }}>
                  <Users size={30} className="mx-auto mb-3" style={{ color:textSub }}/>
                  <p className="text-sm mb-3" style={{ color:textSub }}>No accounts in your {activeTab} circle.</p>
                  <button onClick={()=>{setShowModal(true);setModalPlatform(activeTab);}}
                    className="text-xs px-4 py-2 rounded-lg"
                    style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>
                    Add accounts →
                  </button>
                </div>
              ) : (
                <>
                  {!filterTerm && hero && (
                    <HeroCard post={hero} platform={activeTab} dark={dark}
                      onBookmark={toggleBookmark} bookmarked={bookmarks.some(b=>b.id===hero.id)}/>
                  )}
                  {filteredRest.length===0 && filterTerm ? (
                    <div className="rounded-2xl p-8 text-center border"
                      style={{ borderColor:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)" }}>
                      <p className="text-sm mb-2" style={{ color:textSub }}>No posts match <strong style={{ color:cfg.color }}>"{filterTerm}"</strong></p>
                      <button onClick={()=>{setActiveFilter(null);setGlobalSearch("");}} className="text-xs underline" style={{ color:cfg.color }}>Clear filter</button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(filterTerm ? sortedPosts.filter(p=>p.buzzwords?.some(b=>b.toLowerCase()===filterTerm)||p.content.toLowerCase().includes(filterTerm)) : filteredRest)
                        .map(post=>(
                          <PostCard key={post.id} post={post} platform={activeTab} activeFilter={activeFilter||globalSearch||null}
                            dark={dark} onBookmark={toggleBookmark} bookmarked={bookmarks.some(b=>b.id===post.id)}/>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:flex lg:col-span-4 flex-col gap-4">
              <AIBriefPanel platform={activeTab} posts={allPosts} circle={circle[activeTab]||[]} dark={dark}/>
              <TrendingPanel platform={activeTab} activeFilter={activeFilter} onFilter={handleFilter} dark={dark}/>
              <BuzzwordsPanel platform={activeTab} activeFilter={activeFilter} onFilter={handleFilter} dark={dark}/>
              <CirclePanel platform={activeTab} circle={circle} onEdit={()=>{setShowModal(true);setModalPlatform(activeTab);}} dark={dark}/>
            </div>

            {/* Mobile AI Brief */}
            <div className="lg:hidden">
              <AIBriefPanel platform={activeTab} posts={allPosts} circle={circle[activeTab]||[]} dark={dark}/>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)" }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{ background:surface, border:`1px solid ${dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}` }}>
            <div className="p-5 flex justify-between items-center border-b" style={{ borderColor:dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)" }}>
              <h2 className="font-bold text-lg" style={{ fontFamily:"'Syne',sans-serif", color:textMain }}>Manage Inner Circle</h2>
              <button onClick={()=>setShowModal(false)} style={{ color:textSub }}><X size={20}/></button>
            </div>

            {/* Platform tabs */}
            <div className="px-5 pt-4 flex gap-2 overflow-x-auto scrollbar-none">
              {Object.keys(PLATFORMS).map(p=>(
                <button key={p} onClick={()=>setModalPlatform(p)}
                  className="text-xs px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all"
                  style={modalPlatform===p ? { background:PLATFORMS[p].color, color:p==="X"?"#000":"#fff" }
                                           : { background:dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)", color:textSub }}>
                  {p} ({circle[p]?.length||0})
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Gemini handle search */}
              <HandleSearch onAdd={addFromSearch} dark={dark}/>

              {/* Manual add */}
              <div>
                <p className="text-xs mb-2 font-semibold" style={{ color:textSub }}>Or add manually</p>
                <div className="flex gap-2">
                  <input type="text" value={newAccount} onChange={e=>setNewAccount(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&addAccount()}
                    placeholder={`Add ${modalPlatform} handle…`}
                    className="flex-1 text-sm px-4 py-2.5 rounded-xl outline-none"
                    style={{ background:dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)", border:`1px solid ${PLATFORMS[modalPlatform].border}`, color:textMain }}/>
                  <button onClick={addAccount} className="px-4 py-2.5 rounded-xl font-medium hover:opacity-80"
                    style={{ background:PLATFORMS[modalPlatform].color, color:modalPlatform==="X"?"#000":"#fff" }}>
                    <Plus size={16}/>
                  </button>
                </div>
              </div>

              {/* Current accounts */}
              <div className="space-y-2">
                {(circle[modalPlatform]||[]).length===0
                  ? <p className="text-xs text-center py-3" style={{ color:textSub }}>No accounts on {modalPlatform} yet.</p>
                  : (circle[modalPlatform]||[]).map((acc,i)=>(
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                        style={{ background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)" }}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
                            style={{ background:PLATFORMS[modalPlatform].bg, color:PLATFORMS[modalPlatform].color }}>
                            {acc[0].toUpperCase()}
                          </div>
                          <span className="text-sm" style={{ color:textMain }}>@{acc}</span>
                        </div>
                        <button onClick={()=>removeAccount(modalPlatform,acc)} className="hover:text-red-400 transition-colors" style={{ color:textSub }}>
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    ))
                }
              </div>
            </div>

            <div className="p-5 border-t flex justify-between items-center" style={{ borderColor:dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)" }}>
              <span className="text-xs" style={{ color:textSub }}>{Object.values(circle).flat().length} total accounts</span>
              <button onClick={()=>setShowModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-80"
                style={{ background:PLATFORMS[modalPlatform].color, color:modalPlatform==="X"?"#000":"#fff" }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
