'use client';
import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, X, TrendingUp, Users, Sparkles, RefreshCw, Brain, Hash, Filter, Search, Sun, Moon, Layers, Bookmark, BookmarkCheck, Zap, Radio, Clock, Wifi, WifiOff, ChevronRight, Edit2, Check } from "lucide-react";

// ─── OBSIDIAN THEME ───────────────────────────────────────────────────────────
const T = {
  dark: {
    bg: "#0d0d12",
    surface: "#13131a",
    raised: "#1a1a24",
    border: "rgba(255,255,255,0.07)",
    borderMid: "rgba(255,255,255,0.12)",
    text: "#f0f0f5",
    textSub: "#6b6b80",
    textMuted: "#3a3a4a",
    glass: "rgba(255,255,255,0.04)",
    glassBorder: "rgba(255,255,255,0.08)",
  },
  light: {
    bg: "#f4f5f9",
    surface: "#ffffff",
    raised: "#f8f9fc",
    border: "rgba(0,0,0,0.07)",
    borderMid: "rgba(0,0,0,0.12)",
    text: "#0f0f18",
    textSub: "#64647a",
    textMuted: "#b0b0c0",
    glass: "rgba(0,0,0,0.03)",
    glassBorder: "rgba(0,0,0,0.08)",
  },
};

// ─── PLATFORM CONFIG ──────────────────────────────────────────────────────────
const PLATFORMS = {
  LinkedIn: {
    color: "#2d88ff", glow: "rgba(45,136,255,0.3)",
    bg: "rgba(45,136,255,0.08)", border: "rgba(45,136,255,0.2)",
    label: "LinkedIn",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    posts: [
      { id:"li1", author:"satyanadella", time:"1h ago", signal:"high", velocity:"+340%", buzzwords:["AI","productivity","Microsoft"], engagement:"4.2K reactions · 891 saves", content:"The next wave of productivity isn't about doing more — it's about deciding better. We're embedding AI reasoning directly into every workflow at Microsoft. The results in early pilots are striking." },
      { id:"li2", author:"reidhoffman", time:"3h ago", signal:"high", velocity:"+180%", buzzwords:["founders","strategy","growth"], engagement:"2.8K reactions · 543 saves", content:"Counterintuitive take: the founders winning right now aren't moving fast and breaking things. They're moving deliberately and fixing things before they break. Speed still matters — but so does precision." },
      { id:"li3", author:"yourmentor", time:"9h ago", signal:"rising", velocity:"+62%", buzzwords:["career","portfolio","hiring"], engagement:"1.1K reactions · 287 comments", content:"I've reviewed 200+ portfolios this quarter. The ones that get callbacks all have one thing in common: they show thinking, not just output. Your resume is a proof-of-work document." },
    ],
    trending: [
      { tag:"#FutureOfWork", volume:"12.4K", delta:"+18%" },
      { tag:"#AIProductivity", volume:"9.1K", delta:"+31%" },
      { tag:"#LeadershipMindset", volume:"7.8K", delta:"+9%" },
      { tag:"#B2BGrowth", volume:"5.3K", delta:"+14%" },
      { tag:"#ExecutivePresence", volume:"3.9K", delta:"+7%" },
    ],
    defaultBuzzwords: ["AI","productivity","founders","strategy","career","portfolio","hiring","growth","Microsoft","leadership"],
  },
  X: {
    color: "#e8eaf0", glow: "rgba(232,234,240,0.2)",
    bg: "rgba(232,234,240,0.06)", border: "rgba(232,234,240,0.15)",
    label: "X",
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 5.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    posts: [
      { id:"x1", author:"jerrod_lew", time:"22m ago", signal:"high", velocity:"+520%", buzzwords:["AI","strategy","business"], isThread:true, engagement:"3.1K reposts · 891 replies", content:"Hot take: most 'AI strategy' decks are just PowerPoint with chatGPT summaries stapled on. Real AI strategy starts with one question — where does speed of decision actually matter in your business?" },
      { id:"x2", author:"keythinker", time:"2h ago", signal:"high", velocity:"+210%", buzzwords:["creator","economy","thread"], isThread:true, engagement:"1.4K reposts · 423 replies", content:"Thread: Why the creator economy is about to split in two ↓\n\n1/ Two distinct creator tracks forming. AI-augmented vs deliberately human. Both will thrive. The middle will collapse." },
      { id:"x3", author:"nicheexpert", time:"6h ago", signal:"rising", velocity:"+75%", buzzwords:["audience","growth","authentic"], engagement:"987 reposts · 312 replies", content:"Nobody talks about the unglamorous part of building an audience: the 18 months where you're basically shouting into a void. That phase is doing more for you than you realize." },
    ],
    trending: [
      { tag:"#BuildInPublic", volume:"31.2K", delta:"+44%" },
      { tag:"#AIStrategy", volume:"22.8K", delta:"+61%" },
      { tag:"#CreatorEconomy", volume:"18.4K", delta:"+27%" },
      { tag:"#IndieHacker", volume:"9.7K", delta:"+13%" },
      { tag:"#TechTakes", volume:"7.2K", delta:"+8%" },
    ],
    defaultBuzzwords: ["AI","strategy","business","creator","economy","thread","audience","growth","authentic","buildinpublic"],
  },
  Instagram: {
    color: "#f0609e", glow: "rgba(240,96,158,0.3)",
    bg: "rgba(240,96,158,0.07)", border: "rgba(240,96,158,0.2)",
    label: "Instagram",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
    posts: [
      { id:"ig1", author:"visualcreator", time:"45m ago", signal:"high", velocity:"+290%", buzzwords:["reel","photography","authentic"], isReel:true, engagement:"89K views · 12.4K likes", content:"Shot this at 4am. No filter. Sometimes the best frames happen when everyone else is asleep 🌄 New reel dropping tomorrow — this is the teaser." },
      { id:"ig2", author:"designinfluencer", time:"4h ago", signal:"high", velocity:"+140%", buzzwords:["brand","design","wellness"], engagement:"41K views · 8.7K likes", content:"Brand identity refresh for a client in the wellness space. The brief said 'calm but confident.' I think we nailed it. Swipe to see the before 👉" },
      { id:"ig3", author:"creativemind", time:"11h ago", signal:"rising", velocity:"+55%", buzzwords:["content","authentic","strategy"], engagement:"28K views · 5.2K likes", content:"Honest truth: the posts that perform worst are the ones I spent the most time on. The ones I almost didn't post? Those go crazy. Stop overthinking." },
    ],
    trending: [
      { tag:"#ContentCreator", volume:"28.1K", delta:"+22%" },
      { tag:"#BrandIdentity", volume:"14.7K", delta:"+11%" },
      { tag:"#AestheticFeed", volume:"11.2K", delta:"+6%" },
      { tag:"#BehindTheLens", volume:"8.4K", delta:"+19%" },
      { tag:"#CreatorLife", volume:"6.1K", delta:"+8%" },
    ],
    defaultBuzzwords: ["reel","photography","authentic","brand","design","wellness","content","strategy","creator","aesthetic"],
  },
  YouTube: {
    color: "#ff4444", glow: "rgba(255,68,68,0.25)",
    bg: "rgba(255,68,68,0.07)", border: "rgba(255,68,68,0.2)",
    label: "YouTube",
    icon: <svg width="16" height="11" viewBox="0 0 24 17" fill="currentColor"><path d="M23.495 2.205a3.02 3.02 0 0 0-2.122-2.136C19.505 0 12 0 12 0s-7.505 0-9.374.069A3.02 3.02 0 0 0 .505 2.205 31.247 31.247 0 0 0 0 8.465a31.247 31.247 0 0 0 .505 6.26 3.02 3.02 0 0 0 2.121 2.136C4.495 17 12 17 12 17s7.505 0 9.373-.069a3.02 3.02 0 0 0 2.122-2.136A31.247 31.247 0 0 0 24 8.465a31.247 31.247 0 0 0-.505-6.26zM9.609 12.093V4.837l6.264 3.628-6.264 3.628z"/></svg>,
    posts: [
      { id:"yt1", author:"andrewhuberman", time:"3h ago", signal:"high", velocity:"+380%", buzzwords:["science","focus","neuroscience"], isVideo:true, engagement:"48K views · 1.2K comments", content:"NEW: 'The Science of Deep Focus' — 2hr deep dive into neurochemistry of attention, dopamine regulation, and protocols for sustained cognitive performance." },
      { id:"yt2", author:"lexfridman", time:"1d ago", signal:"high", velocity:"+890%", buzzwords:["AGI","podcast","research"], isVideo:true, engagement:"312K views · 4.8K comments", content:"Just posted my 4-hour conversation with a researcher working on AGI timelines. This one kept me up at night. We go places most podcasts won't." },
      { id:"yt3", author:"techreviewer", time:"2d ago", signal:"rising", velocity:"+95%", buzzwords:["AI","tools","review"], isVideo:true, engagement:"89K views · 2.1K comments", content:"I used ONLY AI tools to run my channel for 30 days. Scripting, editing, thumbnails, SEO — all AI. Here's what actually worked, what was garbage, and what surprised me." },
    ],
    trending: [
      { tag:"#LongFormContent", volume:"19.3K", delta:"+16%" },
      { tag:"#PodcastClips", volume:"14.1K", delta:"+29%" },
      { tag:"#ScienceExplained", volume:"11.8K", delta:"+12%" },
      { tag:"#TechReview", volume:"8.6K", delta:"+7%" },
      { tag:"#DeepDive", volume:"6.4K", delta:"+21%" },
    ],
    defaultBuzzwords: ["science","focus","neuroscience","AGI","podcast","research","AI","tools","review","longform"],
  },
};

const DEFAULT_CIRCLE = {
  LinkedIn: ["satyanadella","reidhoffman","yourmentor"],
  X: ["jerrod_lew","keythinker","nicheexpert"],
  Instagram: ["visualcreator","designinfluencer","creativemind"],
  YouTube: ["andrewhuberman","lexfridman","techreviewer"],
};

const TAB_ORDER = ["Today","LinkedIn","X","Instagram","YouTube","Saved"];

function sigColor(sig) {
  if (sig==="high") return { color:"#10b981", bg:"rgba(16,185,129,0.12)", label:"HIGH" };
  if (sig==="rising") return { color:"#f59e0b", bg:"rgba(245,158,11,0.12)", label:"RISING" };
  return { color:"#52525b", bg:"rgba(82,82,91,0.1)", label:"MODERATE" };
}

// ─── AI BRIEF ─────────────────────────────────────────────────────────────────
function AIBrief({ platform, posts, circle, t }) {
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [ts, setTs] = useState(null);
  const prev = useRef(null);
  const cfg = PLATFORMS[platform];

  const generate = async () => {
    setLoading(true); setBrief("");
    const summary = posts.map((p,i)=>`${i+1}. @${p.author}: "${p.content.slice(0,120)}" — Signal: ${p.signal}, Velocity: ${p.velocity}`).join("\n");
    const prompt = `You are a social media intelligence analyst. Platform: ${platform}. Accounts monitored: ${(circle||[]).join(", ")}.

Posts:
${summary}

Write exactly 3 bullet points (use • character):
• What dominant theme or narrative is emerging right now
• Which specific account to engage with TODAY and exactly why
• One concrete action to take in the next 24 hours

Each bullet: one sentence. Sharp. No fluff. Chief of staff tone.`;

    try {
      const res = await fetch("/api/brief", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt, type:"brief" }),
      });
      const data = await res.json();
      setBrief(data.text || "Unable to generate brief.");
    } catch { setBrief("Connection failed. Check your API key in Vercel settings."); }
    setLoading(false);
    setTs(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
  };

  useEffect(() => {
    if (prev.current !== platform) { prev.current = platform; generate(); }
  }, [platform]);

  return (
    <div style={{ background: cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:16, padding:16, boxShadow:`0 0 24px ${cfg.glow}` }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Brain size={14} style={{ color:cfg.color }}/>
          <span style={{ fontSize:12, fontWeight:700, color:cfg.color, letterSpacing:"0.04em", textTransform:"uppercase" }}>AI Brief</span>
          {ts && <span style={{ fontSize:10, color:t.textSub, display:"flex", alignItems:"center", gap:3 }}><Clock size={9}/>{ts}</span>}
        </div>
        <button onClick={generate} disabled={loading} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:8, background:cfg.color, color: platform==="X"?"#0d0d12":"#fff", border:"none", cursor:"pointer", opacity:loading?0.6:1 }}>
          {loading?<RefreshCw size={10} style={{ animation:"spin 1s linear infinite" }}/>:<Sparkles size={10}/>}
          {loading?"Thinking…":"Refresh"}
        </button>
      </div>
      {loading && <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {[85,70,55].map((w,i)=><div key={i} style={{ height:8, borderRadius:4, background:cfg.border, width:`${w}%`, animation:"pulse 1.5s ease-in-out infinite" }}/>)}
      </div>}
      {brief && !loading && (
        <div style={{ fontSize:11, lineHeight:1.7, color:t.textSub }}>
          {brief.split("\n").filter(l=>l.trim()).map((line,i)=>(
            <div key={i} style={{ display:"flex", gap:8, marginBottom:6 }}>
              {line.startsWith("•") && <span style={{ color:cfg.color, flexShrink:0, marginTop:1 }}>•</span>}
              <span style={{ color: line.startsWith("•") ? t.text : t.textSub }}>{line.replace(/^•\s*/,"")}</span>
            </div>
          ))}
        </div>
      )}
      {!brief && !loading && <p style={{ fontSize:11, color:t.textMuted }}>Generating your {platform} brief…</p>}
    </div>
  );
}

// ─── MORNING DIGEST ───────────────────────────────────────────────────────────
function MorningDigest({ circle, t }) {
  const [bullets, setBullets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ts, setTs] = useState(null);
  const generated = useRef(false);

  const generate = async () => {
    setLoading(true); setBullets([]);
    const summaries = Object.entries(PLATFORMS).map(([p,cfg])=>{
      const top = [...cfg.posts].sort((a,b)=>b.signal==="high"?1:-1)[0];
      return `${p}: @${top.author} — "${top.content.slice(0,80)}" (${top.signal} signal, ${top.velocity} velocity)`;
    }).join("\n");

    const prompt = `Morning briefing for a social media command center. Here are the top posts across 4 platforms:

${summaries}

Write exactly 4 bullet points — one per platform (LinkedIn, X, Instagram, YouTube). Format:
• [Platform]: one sharp sentence on what's dominating that platform right now

Punchy. Executive summary tone. Each bullet under 20 words.`;

    try {
      const res = await fetch("/api/brief", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt, type:"digest" }),
      });
      const data = await res.json();
      const lines = (data.text||"").split("\n").filter(l=>l.trim()&&l.includes("•"));
      setBullets(lines);
    } catch { setBullets(["• Unable to generate digest. Check your API configuration."]); }
    setLoading(false);
    setTs(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
  };

  useEffect(() => { if (!generated.current) { generated.current=true; generate(); } }, []);

  const platformColors = { LinkedIn:"#2d88ff", X:"#e8eaf0", Instagram:"#f0609e", YouTube:"#ff4444" };

  return (
    <div style={{ background:t.glass, border:`1px solid ${t.glassBorder}`, borderRadius:16, padding:16, backdropFilter:"blur(8px)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Radio size={13} style={{ color:"#10b981" }}/>
          <span style={{ fontSize:11, fontWeight:700, color:"#10b981", letterSpacing:"0.06em", textTransform:"uppercase" }}>Morning Digest</span>
          {ts && <span style={{ fontSize:10, color:t.textSub }}>{ts}</span>}
        </div>
        <button onClick={generate} style={{ fontSize:10, color:t.textSub, background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
          <RefreshCw size={10}/>Refresh
        </button>
      </div>
      {loading && <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {[90,75,80,70].map((w,i)=><div key={i} style={{ height:7, borderRadius:4, background:t.border, width:`${w}%`, animation:"pulse 1.5s ease-in-out infinite" }}/>)}
      </div>}
      {!loading && bullets.map((line,i)=>{
        const cleanLine = line.replace(/^•\s*/,"");
        const platform = Object.keys(platformColors).find(p=>cleanLine.startsWith(p));
        const color = platform ? platformColors[platform] : "#10b981";
        return (
          <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"flex-start" }}>
            <span style={{ color, fontSize:12, flexShrink:0, marginTop:1 }}>•</span>
            <span style={{ fontSize:11, lineHeight:1.6, color:t.text }}>{cleanLine}</span>
          </div>
        );
      })}
      {!loading && bullets.length===0 && <p style={{ fontSize:11, color:t.textMuted }}>Loading today's intelligence…</p>}
    </div>
  );
}

// ─── HANDLE SEARCH ────────────────────────────────────────────────────────────
function HandleSearch({ onAdd, t }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setResults(null);
    const prompt = `For the public figure, creator, or brand named "${query}", find their social media handles on LinkedIn, X (Twitter), Instagram, and YouTube.

Return ONLY a valid JSON object, no markdown, no explanation:
{"LinkedIn":"handle_or_null","X":"handle_or_null","Instagram":"handle_or_null","YouTube":"handle_or_null"}

Use null if no handle exists. No @ symbol. Exact handle only.`;
    try {
      const res = await fetch("/api/brief", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt, type:"handle" }),
      });
      const data = await res.json();
      setResults(data.handles || {});
    } catch { setResults({}); }
    setLoading(false);
  };

  const hasResults = results && Object.values(results).some(v=>v&&v!=="null");

  return (
    <div style={{ marginBottom:16 }}>
      <p style={{ fontSize:11, fontWeight:600, color:t.textSub, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.04em" }}>Search by name — AI finds handles</p>
      <div style={{ display:"flex", gap:8, marginBottom:results?10:0 }}>
        <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()}
          placeholder="e.g. Andrew Huberman, Gary Vee…"
          style={{ flex:1, fontSize:12, padding:"8px 12px", borderRadius:10, border:`1px solid ${t.borderMid}`, background:t.glass, color:t.text, outline:"none" }}/>
        <button onClick={search} disabled={loading}
          style={{ fontSize:11, fontWeight:700, padding:"8px 14px", borderRadius:10, background:"#10b981", color:"#fff", border:"none", cursor:"pointer", opacity:loading?0.6:1, display:"flex", alignItems:"center", gap:6 }}>
          {loading?<RefreshCw size={11} style={{ animation:"spin 1s linear infinite" }}/>:<Search size={11}/>}
          {loading?"…":"Find"}
        </button>
      </div>
      {results && (
        <div style={{ borderRadius:10, overflow:"hidden", border:`1px solid ${t.border}` }}>
          {hasResults ? Object.entries(results).filter(([,v])=>v&&v!=="null").map(([platform,handle])=>{
            const cfg = PLATFORMS[platform];
            return (
              <div key={platform} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", borderBottom:`1px solid ${t.border}`, background:t.glass }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ color:cfg?.color||"#10b981" }}>{cfg?.icon}</span>
                  <span style={{ fontSize:11, color:t.textSub }}>{platform}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:t.text }}>@{handle}</span>
                </div>
                <button onClick={()=>onAdd(platform,handle)}
                  style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:6, background:cfg?.bg||"rgba(16,185,129,0.1)", color:cfg?.color||"#10b981", border:`1px solid ${cfg?.border||"rgba(16,185,129,0.2)"}`, cursor:"pointer" }}>
                  + Add
                </button>
              </div>
            );
          }) : <div style={{ padding:"12px", textAlign:"center", fontSize:11, color:t.textSub }}>No handles found. Try a more specific name.</div>}
        </div>
      )}
    </div>
  );
}

// ─── BUZZWORDS PANEL WITH EDIT + WHO TO FOLLOW ────────────────────────────────
function BuzzwordsPanel({ platform, activeFilter, onFilter, buzzwords, onUpdateBuzzwords, t }) {
  const cfg = PLATFORMS[platform];
  const [editing, setEditing] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [recommendations, setRecommendations] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recWord, setRecWord] = useState(null);

  const addWord = () => {
    if (!newWord.trim() || buzzwords.includes(newWord.trim().toLowerCase())) return;
    onUpdateBuzzwords([...buzzwords, newWord.trim().toLowerCase()]);
    setNewWord("");
  };

  const removeWord = (word) => onUpdateBuzzwords(buzzwords.filter(w=>w!==word));

  const handleBuzzClick = async (word) => {
    const isActive = activeFilter?.toLowerCase()===word.toLowerCase();
    if (isActive) { onFilter(null); setRecommendations(null); setRecWord(null); return; }
    onFilter(word);
  };

  const getRecommendations = async (word) => {
    if (recWord===word) { setRecommendations(null); setRecWord(null); return; }
    setRecLoading(true); setRecWord(word); setRecommendations(null);
    const prompt = `For someone interested in "${word}" on ${platform}, suggest 5 specific accounts to follow. Return ONLY a JSON array:
[{"handle":"username","name":"Full Name","why":"one sentence why"}]
Real accounts only. No @ symbol on handle. No markdown.`;
    try {
      const res = await fetch("/api/brief", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt, type:"brief" }),
      });
      const data = await res.json();
      const clean = (data.text||"[]").replace(/```json|```/g,"").trim();
      setRecommendations(JSON.parse(clean));
    } catch { setRecommendations([]); }
    setRecLoading(false);
  };

  return (
    <div style={{ background:t.glass, border:`1px solid ${t.glassBorder}`, borderRadius:16, padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <Hash size={13} style={{ color:cfg.color }}/>
          <span style={{ fontSize:11, fontWeight:700, color:t.text, letterSpacing:"0.02em" }}>Buzzwords</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:10, color:t.textSub }}>tap to filter</span>
          <button onClick={()=>setEditing(e=>!e)} style={{ background:"none", border:"none", cursor:"pointer", color:t.textSub, display:"flex", alignItems:"center" }}>
            {editing?<Check size={13} style={{ color:"#10b981" }}/>:<Edit2 size={12}/>}
          </button>
        </div>
      </div>

      {editing && (
        <div style={{ marginBottom:10 }}>
          <div style={{ display:"flex", gap:6, marginBottom:8 }}>
            <input value={newWord} onChange={e=>setNewWord(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addWord()}
              placeholder="Add buzzword…"
              style={{ flex:1, fontSize:11, padding:"6px 10px", borderRadius:8, border:`1px solid ${cfg.border}`, background:cfg.bg, color:t.text, outline:"none" }}/>
            <button onClick={addWord} style={{ fontSize:11, fontWeight:700, padding:"6px 10px", borderRadius:8, background:cfg.color, color:platform==="X"?"#0d0d12":"#fff", border:"none", cursor:"pointer" }}>
              <Plus size={12}/>
            </button>
          </div>
        </div>
      )}

      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {buzzwords.map((word,i)=>{
          const active = activeFilter?.toLowerCase()===word.toLowerCase();
          const isRec = recWord===word;
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:2 }}>
              <button onClick={()=>handleBuzzClick(word)}
                style={{ fontSize:11, padding:"4px 10px", borderRadius:8, fontWeight:600, cursor:"pointer", border:`1px solid ${active?cfg.color:cfg.border}`, background:active?cfg.color:cfg.bg, color:active?(platform==="X"?"#0d0d12":"#fff"):cfg.color, boxShadow:active?`0 0 10px ${cfg.glow}`:"none" }}>
                {word}
              </button>
              {active && (
                <button onClick={()=>getRecommendations(word)}
                  style={{ fontSize:10, padding:"4px 7px", borderRadius:7, cursor:"pointer", border:`1px solid ${cfg.border}`, background:isRec?cfg.color:t.glass, color:isRec?(platform==="X"?"#0d0d12":"#fff"):cfg.color, fontWeight:600, whiteSpace:"nowrap" }}>
                  {recLoading&&recWord===word?<RefreshCw size={9} style={{ animation:"spin 1s linear infinite" }}/>:"Who →"}
                </button>
              )}
              {editing && (
                <button onClick={()=>removeWord(word)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(239,68,68,0.6)", padding:"2px" }}>
                  <X size={10}/>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {recommendations && recommendations.length>0 && (
        <div style={{ marginTop:12, borderTop:`1px solid ${t.border}`, paddingTop:12 }}>
          <p style={{ fontSize:10, fontWeight:700, color:cfg.color, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Who to follow for "{recWord}"</p>
          {recommendations.map((r,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:8 }}>
              <div style={{ width:24, height:24, borderRadius:8, background:cfg.bg, border:`1px solid ${cfg.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:cfg.color, flexShrink:0 }}>
                {r.handle?.[0]?.toUpperCase()||"?"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:600, color:t.text }}>@{r.handle} <span style={{ fontWeight:400, color:t.textSub }}>· {r.name}</span></div>
                <div style={{ fontSize:10, color:t.textSub, lineHeight:1.5 }}>{r.why}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {recommendations && recommendations.length===0 && !recLoading && (
        <p style={{ fontSize:11, color:t.textSub, marginTop:10 }}>No recommendations found. Try a different term.</p>
      )}
    </div>
  );
}

// ─── TRENDING PANEL ───────────────────────────────────────────────────────────
function TrendingPanel({ platform, activeFilter, onFilter, t }) {
  const cfg = PLATFORMS[platform];
  return (
    <div style={{ background:t.glass, border:`1px solid ${t.glassBorder}`, borderRadius:16, padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <TrendingUp size={13} style={{ color:cfg.color }}/>
          <span style={{ fontSize:11, fontWeight:700, color:t.text }}>Trending · {platform}</span>
        </div>
        <span style={{ fontSize:10, color:t.textSub }}>tap to filter</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {cfg.trending.map((item,i)=>{
          const clean = item.tag.replace("#","");
          const active = activeFilter===clean;
          return (
            <button key={i} onClick={()=>onFilter(active?null:clean)}
              style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 10px", borderRadius:10, cursor:"pointer", border:`1px solid ${active?cfg.color:cfg.border}`, background:active?cfg.color:cfg.bg, boxShadow:active?`0 0 12px ${cfg.glow}`:"none", textAlign:"left" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:10, fontWeight:700, color:active?(platform==="X"?"#0d0d12":"rgba(255,255,255,0.4)"):"#3a3a4a", width:14 }}>{i+1}</span>
                <span style={{ fontSize:11, fontWeight:600, color:active?(platform==="X"?"#0d0d12":"#fff"):cfg.color }}>{item.tag}</span>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, color:active?(platform==="X"?"rgba(0,0,0,0.5)":"rgba(255,255,255,0.5)"):t.textSub }}>{item.volume}</div>
                <div style={{ fontSize:10, fontWeight:700, color:active?(platform==="X"?"#0d0d12":"#6ee7b7"):"#10b981" }}>{item.delta}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── POST CARDS ───────────────────────────────────────────────────────────────
function SignalBadge({ signal, velocity }) {
  const s = sigColor(signal);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
      <span style={{ fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:5, background:s.bg, color:s.color, letterSpacing:"0.06em" }}>{s.label}</span>
      <span style={{ fontSize:9, color:"#10b981", fontWeight:600 }}>{velocity}</span>
    </div>
  );
}

function HeroCard({ post, platform, t, onBookmark, bookmarked }) {
  const cfg = PLATFORMS[platform];
  return (
    <div style={{ background:cfg.bg, border:`1px solid ${cfg.color}`, borderRadius:16, padding:18, marginBottom:12, boxShadow:`0 0 32px ${cfg.glow}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:cfg.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color:platform==="X"?"#0d0d12":"#fff", flexShrink:0 }}>
            {post.author[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:t.text }}>@{post.author}</div>
            <div style={{ fontSize:10, color:t.textSub, display:"flex", alignItems:"center", gap:4 }}>
              <Clock size={9}/>{post.time}
              <span style={{ color:cfg.color, fontWeight:600 }}>· Top Signal</span>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <SignalBadge signal={post.signal} velocity={post.velocity}/>
          <button onClick={()=>onBookmark(post,platform)} style={{ background:"none", border:"none", cursor:"pointer", color:bookmarked?"#f59e0b":t.textSub }}>
            {bookmarked?<BookmarkCheck size={15}/>:<Bookmark size={15}/>}
          </button>
        </div>
      </div>
      {post.isVideo && (
        <div style={{ height:72, borderRadius:10, background:"rgba(255,68,68,0.1)", border:"1px solid rgba(255,68,68,0.2)", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:12 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"#ff4444", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="10" height="10" viewBox="0 0 24 17" fill="white"><path d="M9.609 12.093V4.837l6.264 3.628-6.264 3.628z"/></svg>
          </div>
          <span style={{ fontSize:11, color:"#ff4444" }}>Watch on YouTube</span>
        </div>
      )}
      {post.isReel && (
        <div style={{ height:52, borderRadius:10, background:"rgba(240,96,158,0.1)", border:"1px solid rgba(240,96,158,0.2)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
          <span style={{ fontSize:11, color:"#f0609e" }}>▶ Reel · View on Instagram</span>
        </div>
      )}
      <p style={{ fontSize:13, lineHeight:1.65, color:t.text, marginBottom:12, whiteSpace:"pre-line" }}>{post.content}</p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
        {post.buzzwords?.map((w,i)=>(
          <span key={i} style={{ fontSize:10, padding:"3px 8px", borderRadius:6, fontWeight:700, background:cfg.color, color:platform==="X"?"#0d0d12":"#fff" }}>{w}</span>
        ))}
        {post.isThread && <span style={{ fontSize:10, padding:"3px 8px", borderRadius:6, background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.color }}>🧵 Thread</span>}
      </div>
      <div style={{ fontSize:10, color:t.textSub }}><span style={{ color:cfg.color }}>◆</span> {post.engagement}</div>
    </div>
  );
}

function PostCard({ post, platform, activeFilter, t, onBookmark, bookmarked }) {
  const cfg = PLATFORMS[platform];
  const isHighlighted = activeFilter && post.buzzwords?.some(b=>b.toLowerCase()===activeFilter.toLowerCase());
  return (
    <div style={{ borderRadius:14, padding:"14px 16px", border:`1px solid ${isHighlighted?cfg.border:"rgba(255,255,255,0.04)"}`, background:isHighlighted?cfg.bg:"transparent", boxShadow:isHighlighted?`0 0 16px ${cfg.glow}`:"none", marginBottom:6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:cfg.bg, border:`1px solid ${cfg.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:cfg.color, flexShrink:0 }}>
            {post.author[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:t.text }}>@{post.author}</div>
            <div style={{ fontSize:10, color:t.textSub }}>{post.time}</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {post.isThread && <span style={{ fontSize:9, color:cfg.color }}>🧵</span>}
          {post.isVideo && <span style={{ fontSize:9, color:cfg.color }}>▶</span>}
          {post.isReel && <span style={{ fontSize:9, color:cfg.color }}>▶ Reel</span>}
          <SignalBadge signal={post.signal} velocity={post.velocity}/>
          <button onClick={()=>onBookmark(post,platform)} style={{ background:"none", border:"none", cursor:"pointer", color:bookmarked?"#f59e0b":t.textSub }}>
            {bookmarked?<BookmarkCheck size={13}/>:<Bookmark size={13}/>}
          </button>
        </div>
      </div>
      <p style={{ fontSize:12, lineHeight:1.6, color:t.text, marginBottom:8, whiteSpace:"pre-line" }}>{post.content}</p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6 }}>
        {post.buzzwords?.map((w,i)=>{
          const active = activeFilter?.toLowerCase()===w.toLowerCase();
          return <span key={i} style={{ fontSize:10, padding:"2px 7px", borderRadius:5, fontWeight:600, background:active?cfg.color:cfg.bg, color:active?(platform==="X"?"#0d0d12":"#fff"):cfg.color, border:`1px solid ${cfg.border}` }}>{w}</span>;
        })}
      </div>
      <div style={{ fontSize:10, color:t.textSub }}><span style={{ color:cfg.color }}>◆</span> {post.engagement}</div>
    </div>
  );
}

// ─── TOP SIGNAL STRIP ─────────────────────────────────────────────────────────
function TopSignalStrip({ onJump, t }) {
  const top = Object.entries(PLATFORMS).flatMap(([p,cfg])=>cfg.posts.map(post=>({...post,platform:p}))).sort((a,b)=>a.signal==="high"&&b.signal!=="high"?-1:1)[0];
  if (!top) return null;
  const cfg = PLATFORMS[top.platform];
  return (
    <button onClick={()=>onJump(top.platform)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"8px 12px", marginBottom:16, borderRadius:12, background:cfg.bg, border:`1px solid ${cfg.border}`, cursor:"pointer", textAlign:"left" }}>
      <div style={{ width:6, height:6, borderRadius:"50%", background:cfg.color, animation:"pulse 2s ease-in-out infinite", flexShrink:0 }}/>
      <Zap size={11} style={{ color:cfg.color, flexShrink:0 }}/>
      <span style={{ fontSize:11, fontWeight:700, color:cfg.color, flexShrink:0 }}>Top Signal</span>
      <span style={{ color:cfg.color, flexShrink:0 }}>{cfg.icon}</span>
      <span style={{ fontSize:11, color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>@{top.author}: {top.content.slice(0,55)}…</span>
      <span style={{ fontSize:11, fontWeight:800, color:"#10b981", flexShrink:0 }}>{top.velocity}</span>
    </button>
  );
}

// ─── TODAY TAB ────────────────────────────────────────────────────────────────
function TodayTab({ circle, activeFilter, onFilter, t, onBookmark, bookmarks }) {
  const allPosts = Object.entries(PLATFORMS).flatMap(([p,cfg])=>cfg.posts.map(post=>({...post,platform:p})));
  const byPlatform = TAB_ORDER.filter(tab=>PLATFORMS[tab]).map(p=>({
    platform:p,
    post:[...PLATFORMS[p].posts].sort((a,b)=>a.signal==="high"&&b.signal!=="high"?-1:1)[0]
  }));

  const filtered = activeFilter ? allPosts.filter(p=>p.buzzwords?.some(b=>b.toLowerCase()===activeFilter.toLowerCase())||p.content.toLowerCase().includes(activeFilter.toLowerCase())) : null;

  if (filtered) return (
    <div>
      <p style={{ fontSize:11, color:t.textSub, marginBottom:12 }}>
        <strong style={{ color:"#10b981" }}>{filtered.length}</strong> posts matching <strong style={{ color:t.text }}>"{activeFilter}"</strong> across all platforms
      </p>
      {filtered.map((post,i)=>{
        const cfg = PLATFORMS[post.platform];
        return (
          <div key={i} style={{ marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <span style={{ color:cfg.color }}>{cfg.icon}</span>
              <span style={{ fontSize:10, fontWeight:700, color:cfg.color, textTransform:"uppercase", letterSpacing:"0.04em" }}>{post.platform}</span>
            </div>
            <PostCard post={post} platform={post.platform} activeFilter={activeFilter} t={t} onBookmark={onBookmark} bookmarked={bookmarks.some(b=>b.id===post.id)}/>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:"#10b981", animation:"pulse 2s ease-in-out infinite" }}/>
        <span style={{ fontSize:10, fontWeight:700, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em" }}>Top Signal Today</span>
      </div>
      {(() => {
        const { platform, post } = byPlatform[0];
        const cfg = PLATFORMS[platform];
        return (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
              <span style={{ color:cfg.color }}>{cfg.icon}</span>
              <span style={{ fontSize:10, fontWeight:700, color:cfg.color }}>{platform}</span>
            </div>
            <HeroCard post={post} platform={platform} t={t} onBookmark={onBookmark} bookmarked={bookmarks.some(b=>b.id===post.id)}/>
          </div>
        );
      })()}
      <div style={{ fontSize:10, fontWeight:700, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10, marginTop:4 }}>Best From Each Platform</div>
      {byPlatform.slice(1).map(({platform,post})=>{
        const cfg = PLATFORMS[platform];
        return (
          <div key={platform} style={{ marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <span style={{ color:cfg.color }}>{cfg.icon}</span>
              <span style={{ fontSize:10, fontWeight:700, color:cfg.color }}>{platform}</span>
              <span style={{ fontSize:10, color:t.textSub }}>· {circle[platform]?.length||0} accounts</span>
            </div>
            <PostCard post={post} platform={platform} t={t} onBookmark={onBookmark} bookmarked={bookmarks.some(b=>b.id===post.id)}/>
          </div>
        );
      })}
      <div style={{ borderTop:`1px solid ${t.border}`, paddingTop:16, marginTop:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
          <TrendingUp size={12} style={{ color:"#10b981" }}/>
          <span style={{ fontSize:10, fontWeight:700, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em" }}>Fastest Moving Across All Platforms</span>
        </div>
        {Object.entries(PLATFORMS).flatMap(([p,cfg])=>cfg.trending.map(item=>({...item,platform:p,color:cfg.color,icon:cfg.icon})))
          .sort((a,b)=>parseFloat(b.delta)-parseFloat(a.delta)).slice(0,5).map((item,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 10px", borderRadius:9, background:t.glass, border:`1px solid ${t.border}`, marginBottom:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ color:item.color }}>{item.icon}</span>
                <span style={{ fontSize:11, fontWeight:600, color:item.color }}>{item.tag}</span>
              </div>
              <span style={{ fontSize:11, fontWeight:800, color:"#10b981" }}>{item.delta}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── SAVED TAB ────────────────────────────────────────────────────────────────
function SavedTab({ saved, onRemove, t }) {
  if (saved.length===0) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 0" }}>
      <Bookmark size={32} style={{ color:t.textMuted, marginBottom:12 }}/>
      <p style={{ fontSize:13, fontWeight:600, color:t.text, marginBottom:4 }}>No saved posts yet</p>
      <p style={{ fontSize:11, color:t.textSub }}>Tap the bookmark icon on any post to save it here</p>
    </div>
  );
  return (
    <div>
      <p style={{ fontSize:11, color:t.textSub, marginBottom:16 }}>{saved.length} saved post{saved.length!==1?"s":""}</p>
      {saved.map((item,i)=>{
        const cfg = PLATFORMS[item.platform]||{color:"#10b981",bg:"rgba(16,185,129,0.08)",border:"rgba(16,185,129,0.2)",icon:null};
        return (
          <div key={i} style={{ borderRadius:12, padding:14, border:`1px solid ${cfg.border}`, background:cfg.bg, marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ color:cfg.color }}>{cfg.icon}</span>
                <span style={{ fontSize:11, fontWeight:700, color:cfg.color }}>@{item.author}</span>
                <span style={{ fontSize:10, color:t.textSub }}>· {item.platform}</span>
              </div>
              <button onClick={()=>onRemove(item.id)} style={{ fontSize:10, padding:"3px 8px", borderRadius:6, background:"rgba(239,68,68,0.1)", color:"#ef4444", border:"none", cursor:"pointer" }}>Remove</button>
            </div>
            <p style={{ fontSize:11, lineHeight:1.55, color:t.textSub }}>{item.content.slice(0,140)}{item.content.length>140?"…":""}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function SocialCommandCenter() {
  const [activeTab, setActiveTab] = useState("Today");
  const [dark, setDark] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalPlatform, setModalPlatform] = useState("LinkedIn");
  const [newAccount, setNewAccount] = useState("");
  const [circle, setCircle] = useState(DEFAULT_CIRCLE);
  const [activeFilter, setActiveFilter] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [buzzwords, setBuzzwords] = useState(Object.fromEntries(Object.entries(PLATFORMS).map(([k,v])=>[k,[...v.defaultBuzzwords]])));

  const t = dark ? T.dark : T.light;
  const isToday = activeTab==="Today";
  const isSaved = activeTab==="Saved";
  const isPlatform = !isToday && !isSaved;
  const cfg = isPlatform ? PLATFORMS[activeTab] : null;
  const allPosts = isPlatform ? PLATFORMS[activeTab].posts : [];
  const sorted = [...allPosts].sort((a,b)=>a.signal==="high"&&b.signal!=="high"?-1:1);
  const hero = sorted[0];
  const rest = sorted.slice(1);
  const filterTerm = globalSearch.trim().toLowerCase() || activeFilter?.toLowerCase() || null;
  const filteredRest = filterTerm ? rest.filter(p=>p.buzzwords?.some(b=>b.toLowerCase()===filterTerm)||p.content.toLowerCase().includes(filterTerm)) : rest;

  const handleFilter = (word) => { setActiveFilter(prev=>prev===word?null:word); setGlobalSearch(""); };
  const switchTab = (tab) => { setActiveTab(tab); setActiveFilter(null); setGlobalSearch(""); };

  const toggleBookmark = (post, platform) => {
    setBookmarks(prev=>{
      const exists = prev.some(b=>b.id===post.id);
      return exists ? prev.filter(b=>b.id!==post.id) : [...prev,{...post,platform:platform||activeTab}];
    });
  };

  const addAccount = () => {
    if (!newAccount.trim()) return;
    setCircle(prev=>({...prev,[modalPlatform]:[...(prev[modalPlatform]||[]),newAccount.trim()]}));
    setNewAccount("");
  };
  const addFromSearch = (platform, handle) => {
    if (!handle||handle==="null") return;
    setCircle(prev=>({...prev,[platform]:[...(prev[platform]||[]).filter(a=>a!==handle),handle]}));
  };
  const removeAccount = (platform, account) => setCircle(prev=>({...prev,[platform]:prev[platform].filter(a=>a!==account)}));

  const tabStyle = (tab) => {
    const isActive = activeTab===tab;
    const p = PLATFORMS[tab];
    if (!isActive) return { background:"transparent", border:`1px solid ${t.border}`, color:t.textSub, borderRadius:12, padding:"8px 16px", fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" };
    if (tab==="Today") return { background:"#10b981", border:"1px solid #10b981", color:"#fff", borderRadius:12, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", boxShadow:"0 0 18px rgba(16,185,129,0.4)" };
    if (tab==="Saved") return { background:"#f59e0b", border:"1px solid #f59e0b", color:"#0d0d12", borderRadius:12, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", boxShadow:"0 0 18px rgba(245,158,11,0.35)" };
    return { background:p.color, border:`1px solid ${p.color}`, color:tab==="X"?"#0d0d12":"#fff", borderRadius:12, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", boxShadow:`0 0 18px ${p.glow}` };
  };

  return (
    <div style={{ minHeight:"100vh", background:t.bg, fontFamily:"'DM Sans', -apple-system, sans-serif", color:t.text, transition:"background 0.3s, color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px; }
        * { box-sizing:border-box; }
      `}</style>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 16px" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, gap:12 }}>
          <div>
            <h1 style={{ fontFamily:"'Syne', sans-serif", fontSize:"clamp(1.4rem,4vw,2.2rem)", fontWeight:800, lineHeight:1, background:`linear-gradient(135deg, ${t.text} 0%, ${isPlatform?cfg.color:"#10b981"} 100%)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0, transition:"all 0.4s" }}>
              Command Center
            </h1>
            <p style={{ fontSize:11, color:t.textSub, margin:"3px 0 0", letterSpacing:"0.02em" }}>Inner Circle · Social Intelligence · {Object.values(circle).flat().length} accounts</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={()=>setShowSearch(s=>!s)} style={{ padding:"8px", borderRadius:10, border:`1px solid ${showSearch?"#10b981":t.border}`, background:showSearch?"rgba(16,185,129,0.12)":t.glass, color:showSearch?"#10b981":t.textSub, cursor:"pointer", display:"flex" }}>
              <Search size={15}/>
            </button>
            <button onClick={()=>setDark(d=>!d)} style={{ padding:"8px", borderRadius:10, border:`1px solid ${t.border}`, background:t.glass, color:t.textSub, cursor:"pointer", display:"flex" }}>
              {dark?<Sun size={15}/>:<Moon size={15}/>}
            </button>
            <button onClick={()=>{setShowModal(true);setModalPlatform(isPlatform?activeTab:"LinkedIn");}} style={{ padding:"8px 14px", borderRadius:10, border:`1px solid ${t.border}`, background:t.glass, color:t.textSub, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:600 }}>
              <Users size={14}/>Circle
            </button>
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div style={{ position:"relative", marginBottom:16 }}>
            <Search size={14} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:t.textSub }}/>
            <input autoFocus value={globalSearch} onChange={e=>{setGlobalSearch(e.target.value);setActiveFilter(null);}}
              placeholder="Search across all platforms…"
              style={{ width:"100%", paddingLeft:38, paddingRight:36, paddingTop:11, paddingBottom:11, borderRadius:12, border:`1px solid ${t.borderMid}`, background:t.glass, color:t.text, fontSize:13, outline:"none", backdropFilter:"blur(8px)" }}/>
            {globalSearch && <button onClick={()=>setGlobalSearch("")} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:t.textSub }}><X size={13}/></button>}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:20, paddingBottom:2, scrollbarWidth:"none" }}>
          {TAB_ORDER.map(tab=>(
            <button key={tab} onClick={()=>switchTab(tab)} style={tabStyle(tab)}>
              {tab==="Today" && <Layers size={13}/>}
              {tab==="Saved" && <Bookmark size={13}/>}
              {PLATFORMS[tab] && <span style={{ color:activeTab===tab?(tab==="X"?"#0d0d12":"#fff"):PLATFORMS[tab].color }}>{PLATFORMS[tab].icon}</span>}
              {tab}
              {PLATFORMS[tab] && (
                <span style={{ fontSize:10, padding:"1px 5px", borderRadius:5, background:"rgba(0,0,0,0.2)", color:activeTab===tab?(tab==="X"?"rgba(0,0,0,0.6)":"rgba(255,255,255,0.7)"):t.textMuted }}>
                  {circle[tab]?.length||0}
                </span>
              )}
              {tab==="Saved" && bookmarks.length>0 && (
                <span style={{ fontSize:10, padding:"1px 5px", borderRadius:5, background:"rgba(0,0,0,0.2)", color:"rgba(0,0,0,0.7)" }}>{bookmarks.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Top Signal Strip */}
        {!isSaved && <TopSignalStrip onJump={switchTab} t={t}/>}

        {/* Body */}
        {isSaved ? (
          <SavedTab saved={bookmarks} onRemove={id=>setBookmarks(prev=>prev.filter(b=>b.id!==id))} t={t}/>
        ) : isToday ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:16, '@media(min-width:900px)':{gridTemplateColumns:"1fr 360px"} }}>
            <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr)", gap:16 }}>
              <div style={{ display:"grid", gap:16 }}>
                <div style={{ order:1 }}>
                  <MorningDigest circle={circle} t={t}/>
                </div>
                <div style={{ order:2 }}>
                  {activeFilter && (
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:8, background:"#10b981", color:"#fff", display:"flex", alignItems:"center", gap:5 }}>
                        <Filter size={10}/>{activeFilter}<button onClick={()=>setActiveFilter(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.7)" }}><X size={10}/></button>
                      </span>
                    </div>
                  )}
                  <TodayTab circle={circle} activeFilter={activeFilter||globalSearch.trim()||null} onFilter={handleFilter} t={t} onBookmark={toggleBookmark} bookmarks={bookmarks}/>
                </div>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ background:t.glass, border:`1px solid ${t.glassBorder}`, borderRadius:16, padding:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}>
                  <Hash size={13} style={{ color:"#10b981" }}/>
                  <span style={{ fontSize:11, fontWeight:700, color:t.text }}>All Platform Buzzwords</span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {[...new Set(Object.values(PLATFORMS).flatMap(p=>p.defaultBuzzwords))].slice(0,16).map((word,i)=>{
                    const active=(activeFilter||globalSearch).toLowerCase()===word.toLowerCase();
                    return (
                      <button key={i} onClick={()=>handleFilter(active?null:word)}
                        style={{ fontSize:11, padding:"4px 10px", borderRadius:7, fontWeight:600, cursor:"pointer", border:`1px solid ${active?"#10b981":"rgba(16,185,129,0.2)"}`, background:active?"#10b981":"rgba(16,185,129,0.07)", color:active?"#fff":"#10b981" }}>
                        {word}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) 300px", gap:20, alignItems:"start" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <span style={{ fontSize:13, fontWeight:700, color:t.text }}>Inner Circle · <span style={{ color:cfg.color }}>{activeTab}</span></span>
                <span style={{ fontSize:10, color:t.textSub, display:"flex", alignItems:"center", gap:4 }}><Clock size:9/> Updated just now · {circle[activeTab]?.length||0} accounts</span>
              </div>

              {filterTerm && (
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:8, background:cfg.color, color:activeTab==="X"?"#0d0d12":"#fff", display:"flex", alignItems:"center", gap:5 }}>
                    <Filter size={10}/>{filterTerm}
                    <button onClick={()=>{setActiveFilter(null);setGlobalSearch("");}} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", opacity:0.7 }}><X size={10}/></button>
                  </span>
                  <span style={{ fontSize:10, color:t.textSub }}>{filteredRest.length+1} of {allPosts.length} posts</span>
                </div>
              )}

              {(circle[activeTab]?.length||0)===0 ? (
                <div style={{ borderRadius:16, padding:48, textAlign:"center", border:`1px solid ${t.border}`, background:t.glass }}>
                  <Users size={28} style={{ color:t.textMuted, marginBottom:10 }}/>
                  <p style={{ fontSize:13, color:t.textSub, marginBottom:12 }}>No accounts in your {activeTab} circle.</p>
                  <button onClick={()=>{setShowModal(true);setModalPlatform(activeTab);}} style={{ fontSize:11, padding:"7px 14px", borderRadius:9, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, cursor:"pointer", fontWeight:600 }}>Add accounts →</button>
                </div>
              ) : (
                <>
                  {!filterTerm && hero && <HeroCard post={hero} platform={activeTab} t={t} onBookmark={toggleBookmark} bookmarked={bookmarks.some(b=>b.id===hero.id)}/>}
                  {filteredRest.length===0 && filterTerm ? (
                    <div style={{ borderRadius:14, padding:32, textAlign:"center", border:`1px solid ${t.border}` }}>
                      <p style={{ fontSize:12, color:t.textSub, marginBottom:8 }}>No posts match "<span style={{ color:cfg.color }}>{filterTerm}</span>"</p>
                      <button onClick={()=>{setActiveFilter(null);setGlobalSearch("");}} style={{ fontSize:11, color:cfg.color, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Clear filter</button>
                    </div>
                  ) : (
                    (filterTerm ? sorted.filter(p=>p.buzzwords?.some(b=>b.toLowerCase()===filterTerm)||p.content.toLowerCase().includes(filterTerm)) : filteredRest)
                      .map(post=><PostCard key={post.id} post={post} platform={activeTab} activeFilter={activeFilter||globalSearch||null} t={t} onBookmark={toggleBookmark} bookmarked={bookmarks.some(b=>b.id===post.id)}/>)
                  )}
                </>
              )}
            </div>

            {/* Desktop sidebar */}
            <div style={{ display:"flex", flexDirection:"column", gap:12, position:"sticky", top:16 }}>
              <AIBrief platform={activeTab} posts={allPosts} circle={circle[activeTab]||[]} t={t}/>
              <TrendingPanel platform={activeTab} activeFilter={activeFilter} onFilter={handleFilter} t={t}/>
              <BuzzwordsPanel platform={activeTab} activeFilter={activeFilter} onFilter={handleFilter}
                buzzwords={buzzwords[activeTab]||[]}
                onUpdateBuzzwords={(words)=>setBuzzwords(prev=>({...prev,[activeTab]:words}))} t={t}/>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(10px)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ width:"100%", maxWidth:520, borderRadius:20, overflow:"hidden", background:t.surface, border:`1px solid ${t.borderMid}`, maxHeight:"90vh", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"18px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${t.border}` }}>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:18, fontWeight:800, margin:0, color:t.text }}>Manage Inner Circle</h2>
              <button onClick={()=>setShowModal(false)} style={{ background:"none", border:"none", cursor:"pointer", color:t.textSub }}><X size={20}/></button>
            </div>
            <div style={{ padding:"16px 20px 8px", display:"flex", gap:6, overflowX:"auto", borderBottom:`1px solid ${t.border}` }}>
              {Object.keys(PLATFORMS).map(p=>(
                <button key={p} onClick={()=>setModalPlatform(p)}
                  style={{ fontSize:11, padding:"5px 12px", borderRadius:8, cursor:"pointer", fontWeight:700, whiteSpace:"nowrap", border:`1px solid ${modalPlatform===p?PLATFORMS[p].color:t.border}`, background:modalPlatform===p?PLATFORMS[p].bg:t.glass, color:modalPlatform===p?PLATFORMS[p].color:t.textSub }}>
                  {p} ({circle[p]?.length||0})
                </button>
              ))}
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:20 }}>
              <HandleSearch onAdd={addFromSearch} t={t}/>
              <div style={{ borderTop:`1px solid ${t.border}`, paddingTop:14, marginBottom:14 }}>
                <p style={{ fontSize:11, fontWeight:600, color:t.textSub, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.04em" }}>Or add manually</p>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={newAccount} onChange={e=>setNewAccount(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addAccount()}
                    placeholder={`Add ${modalPlatform} handle…`}
                    style={{ flex:1, fontSize:12, padding:"8px 12px", borderRadius:10, border:`1px solid ${PLATFORMS[modalPlatform].border}`, background:t.glass, color:t.text, outline:"none" }}/>
                  <button onClick={addAccount} style={{ padding:"8px 14px", borderRadius:10, background:PLATFORMS[modalPlatform].color, color:modalPlatform==="X"?"#0d0d12":"#fff", border:"none", cursor:"pointer" }}>
                    <Plus size={16}/>
                  </button>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {(circle[modalPlatform]||[]).length===0
                  ? <p style={{ fontSize:12, color:t.textSub, textAlign:"center", padding:"16px 0" }}>No accounts on {modalPlatform} yet.</p>
                  : (circle[modalPlatform]||[]).map((acc,i)=>(
                      <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", borderRadius:10, background:t.glass, border:`1px solid ${t.border}` }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:26, height:26, borderRadius:8, background:PLATFORMS[modalPlatform].bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:PLATFORMS[modalPlatform].color }}>
                            {acc[0].toUpperCase()}
                          </div>
                          <span style={{ fontSize:12, color:t.text }}>@{acc}</span>
                        </div>
                        <button onClick={()=>removeAccount(modalPlatform,acc)} style={{ background:"none", border:"none", cursor:"pointer", color:t.textSub }}>
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    ))
                }
              </div>
            </div>
            <div style={{ padding:"14px 20px", borderTop:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:t.textSub }}>{Object.values(circle).flat().length} total accounts</span>
              <button onClick={()=>setShowModal(false)} style={{ padding:"8px 20px", borderRadius:10, background:PLATFORMS[modalPlatform].color, color:modalPlatform==="X"?"#0d0d12":"#fff", border:"none", cursor:"pointer", fontSize:12, fontWeight:700 }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
