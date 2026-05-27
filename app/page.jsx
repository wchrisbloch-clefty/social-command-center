'use client';
// AetherHub v1.0 — Elite Social Intelligence & Growth Command Center
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, Globe, Users, TrendingUp, FileText, Bell,
  BarChart2, Settings, ChevronLeft, ChevronRight, Search, Sun, Moon,
  Zap, Bookmark, BookmarkCheck, Plus, Trash2, X, Sparkles, RefreshCw,
  Brain, Hash, Filter, Clock, ArrowUpRight, ArrowDownRight, Activity,
  Eye, Heart, Share2, AlertTriangle, CheckCircle, Info, Target, Rocket,
  ChevronDown, MoreHorizontal, Download, Key, Palette, Star, Flame,
  BellRing, Check,
} from 'lucide-react';

// ─── THEME ─────────────────────────────────────────────────────────────────────
const T = {
  dark: {
    bg:'#08080F', surface:'#0F0F1A', raised:'#161625', card:'#13131F',
    border:'rgba(255,255,255,0.06)', borderMid:'rgba(255,255,255,0.11)',
    text:'#F0F0FA', textSub:'#6B6B8A', textMuted:'#2E2E4A',
    glass:'rgba(255,255,255,0.03)', glassBorder:'rgba(255,255,255,0.07)',
    sidebarBg:'#09090F', sidebarBorder:'rgba(255,255,255,0.05)',
  },
  light: {
    bg:'#F4F5FB', surface:'#FFFFFF', raised:'#F8F9FE', card:'#FFFFFF',
    border:'rgba(0,0,0,0.07)', borderMid:'rgba(0,0,0,0.12)',
    text:'#0F0F1E', textSub:'#64647A', textMuted:'#B0B0C8',
    glass:'rgba(0,0,0,0.02)', glassBorder:'rgba(0,0,0,0.06)',
    sidebarBg:'#FFFFFF', sidebarBorder:'rgba(0,0,0,0.06)',
  },
};

// ─── PLATFORM CONFIG ───────────────────────────────────────────────────────────
const PLAT = {
  LinkedIn:  { color:'#2D88FF', glow:'rgba(45,136,255,0.25)',  bg:'rgba(45,136,255,0.08)',  border:'rgba(45,136,255,0.2)',  icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
  X:         { color:'#E8EAF0', glow:'rgba(232,234,240,0.15)', bg:'rgba(232,234,240,0.06)', border:'rgba(232,234,240,0.14)', icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 5.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  Instagram: { color:'#F0609E', glow:'rgba(240,96,158,0.25)',  bg:'rgba(240,96,158,0.07)',  border:'rgba(240,96,158,0.18)', icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg> },
  YouTube:   { color:'#FF4444', glow:'rgba(255,68,68,0.2)',    bg:'rgba(255,68,68,0.07)',   border:'rgba(255,68,68,0.18)',  icon:<svg width="14" height="10" viewBox="0 0 24 17" fill="currentColor"><path d="M23.495 2.205a3.02 3.02 0 0 0-2.122-2.136C19.505 0 12 0 12 0s-7.505 0-9.374.069A3.02 3.02 0 0 0 .505 2.205 31.247 31.247 0 0 0 0 8.465a31.247 31.247 0 0 0 .505 6.26 3.02 3.02 0 0 0 2.121 2.136C4.495 17 12 17 12 17s7.505 0 9.373-.069a3.02 3.02 0 0 0 2.122-2.136A31.247 31.247 0 0 0 24 8.465a31.247 31.247 0 0 0-.505-6.26zM9.609 12.093V4.837l6.264 3.628-6.264 3.628z"/></svg> },
  TikTok:    { color:'#69C9D0', glow:'rgba(105,201,208,0.2)',  bg:'rgba(105,201,208,0.07)', border:'rgba(105,201,208,0.18)',icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.94a8.24 8.24 0 0 0 4.83 1.55V7.04a4.85 4.85 0 0 1-1.06-.35z"/></svg> },
};

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────
const KPIS = [
  { id:'reach',  label:'Total Reach',     value:'2.41M',  delta:'+12.3%', pos:true,  color:'#6366F1', spark:[180,220,195,280,310,290,340,380,420,390,450,490] },
  { id:'eng',    label:'Engagement Rate', value:'4.7%',   delta:'+0.8%',  pos:true,  color:'#22D3EE', spark:[3.8,4.1,3.9,4.3,4.5,4.2,4.6,4.4,4.8,4.7,4.9,4.7] },
  { id:'follow', label:'New Followers',   value:'+1,247', delta:'+18.2%', pos:true,  color:'#10B981', spark:[820,950,1100,980,1300,1250,1400,1200,1350,1500,1380,1600] },
  { id:'sent',   label:'Sentiment Score', value:'87/100', delta:'+3pts',  pos:true,  color:'#F59E0B', spark:[78,80,82,79,84,83,85,84,86,85,87,87] },
];

const GROWTH_DATA = [1820,1950,2100,1980,2300,2450,2600,2900,3100,2950,3200,3500,3800,4100,4350,4600,4900,5100,4950,5300,5600,5900,6200,6500,6800,7100,7400,7800,8200,8700];

const MOCK_POSTS = {
  LinkedIn: [
    { id:'li1', author:'satyanadella',  time:'1h',  signal:'high',   velocity:'+340%', bw:['AI','productivity','Microsoft'],  eng:'4.2K reactions', content:"The next wave of productivity isn't about doing more — it's about deciding better. We're embedding AI reasoning directly into every workflow at Microsoft." },
    { id:'li2', author:'reidhoffman',   time:'3h',  signal:'high',   velocity:'+180%', bw:['founders','strategy','growth'],   eng:'2.8K reactions', content:"Counterintuitive take: the founders winning right now aren't moving fast and breaking things. They're moving deliberately and fixing things before they break." },
    { id:'li3', author:'garyvee',       time:'5h',  signal:'rising', velocity:'+95%',  bw:['content','creator','brand'],      eng:'1.4K reactions', content:"Your personal brand is the single highest-ROI investment you can make in 2025. Every post is a sales call. Every comment is a handshake." },
  ],
  X: [
    { id:'x1', author:'sama',           time:'22m', signal:'high',   velocity:'+520%', bw:['AI','AGI','OpenAI'],              eng:'3.1K reposts',   content:"We are closer to AGI than most people think. The pace of capability gain has not slowed. It has accelerated. Prepare accordingly." },
    { id:'x2', author:'paulg',          time:'2h',  signal:'high',   velocity:'+210%', bw:['founders','startups','growth'],   eng:'1.4K reposts',   content:"The best startup founders I know share one trait: extreme clarity on what problem they're solving. Not 'making money'. A specific human problem." },
    { id:'x3', author:'levelsio',       time:'6h',  signal:'rising', velocity:'+75%',  bw:['indie','revenue','SaaS'],         eng:'987 reposts',    content:"$2.1M ARR with no employees. No investors. No office. Just code, customers, and compounding." },
  ],
  Instagram: [
    { id:'ig1', author:'visualcreator', time:'45m', signal:'high',   velocity:'+290%', bw:['reel','photography','authentic'], eng:'89K views',      content:"Shot this at 4am. No filter. Sometimes the best frames happen when everyone else is asleep. New reel dropping tomorrow." },
    { id:'ig2', author:'alexhormozi',   time:'4h',  signal:'high',   velocity:'+140%', bw:['business','money','growth'],      eng:'41K views',      content:"The gap between where you are and where you want to be is not motivation. It's skill. Get obsessively good at the thing that moves the needle." },
    { id:'ig3', author:'mrbeast',       time:'8h',  signal:'rising', velocity:'+55%',  bw:['viral','challenge','collab'],     eng:'128K views',     content:"Just filmed something that's going to break YouTube records. Can't say what yet. But if you follow me, you'll want to be online Sunday at 3pm ET." },
  ],
  YouTube: [
    { id:'yt1', author:'andrewhuberman',time:'3h',  signal:'high',   velocity:'+380%', bw:['science','focus','neuroscience'],eng:'48K views',      content:"NEW: 'The Science of Deep Focus' — 2hr deep dive into neurochemistry of attention, dopamine regulation, and protocols for sustained cognitive performance." },
    { id:'yt2', author:'lexfridman',    time:'1d',  signal:'high',   velocity:'+890%', bw:['AGI','podcast','AI'],             eng:'312K views',     content:"Just posted my 4-hour conversation with a researcher working on AGI timelines. This one kept me up at night. We go places most podcasts won't." },
    { id:'yt3', author:'techreviewer',  time:'2d',  signal:'rising', velocity:'+95%',  bw:['AI','tools','review'],            eng:'89K views',      content:"I used ONLY AI tools to run my channel for 30 days. Scripting, editing, thumbnails, SEO — all AI. Here's what actually worked." },
  ],
  TikTok: [
    { id:'tt1', author:'khaby.lame',    time:'30m', signal:'high',   velocity:'+640%', bw:['viral','comedy','reaction'],      eng:'2.1M views',     content:"POV: Someone explains a 10-step life hack for something that takes 2 seconds. *shrugs and does it the normal way* #fyp" },
    { id:'tt2', author:'charlidamelio', time:'2h',  signal:'rising', velocity:'+180%', bw:['dance','trend','collab'],         eng:'890K views',     content:"This new sound is everything. Taught myself this in 20 min and now I can't stop. Duet this and show me yours!" },
  ],
};

const TRENDING = {
  LinkedIn:  [{ tag:'#AIProductivity',   v:'12.4K', d:'+31%' },{ tag:'#FutureOfWork',    v:'9.1K',  d:'+18%' },{ tag:'#LeadershipMindset',v:'7.8K', d:'+9%'  },{ tag:'#B2BGrowth',      v:'5.3K', d:'+14%' }],
  X:         [{ tag:'#BuildInPublic',    v:'31.2K', d:'+44%' },{ tag:'#AIStrategy',       v:'22.8K', d:'+61%' },{ tag:'#CreatorEconomy',   v:'18.4K',d:'+27%' },{ tag:'#IndieHacker',    v:'9.7K', d:'+13%' }],
  Instagram: [{ tag:'#ContentCreator',  v:'28.1K', d:'+22%' },{ tag:'#BrandIdentity',    v:'14.7K', d:'+11%' },{ tag:'#AestheticFeed',    v:'11.2K',d:'+6%'  },{ tag:'#ReelTrends',     v:'8.4K', d:'+19%' }],
  YouTube:   [{ tag:'#LongFormContent', v:'19.3K', d:'+16%' },{ tag:'#PodcastClips',      v:'14.1K', d:'+29%' },{ tag:'#ScienceExplained', v:'11.8K',d:'+12%' },{ tag:'#TechReview',     v:'8.6K', d:'+7%'  }],
  TikTok:    [{ tag:'#ForYouPage',      v:'89.2K', d:'+72%' },{ tag:'#TikTokMadeMeDoIt', v:'41K',   d:'+35%' },{ tag:'#FYP',              v:'64.1K',d:'+18%' },{ tag:'#ViralVideo',     v:'29K',  d:'+41%' }],
};

const ALERTS = [
  { id:'a1', type:'spike',    sev:'critical', msg:'@lexfridman post gaining +890% velocity on YouTube — viral opportunity window open now',           time:'2m ago',  plat:'YouTube',  read:false },
  { id:'a2', type:'mention',  sev:'high',     msg:'Keyword "AI strategy" spiking +61% on X — 22.8K mentions in last hour',                           time:'8m ago',  plat:'X',        read:false },
  { id:'a3', type:'follower', sev:'high',     msg:'Follower growth rate up 18.2% vs 7-day average — maintain current posting cadence',                time:'15m ago', plat:'all',      read:false },
  { id:'a4', type:'negative', sev:'medium',   msg:'Sentiment dip detected on Instagram (-3pts) — monitor comments on recent posts',                   time:'1h ago',  plat:'Instagram',read:true  },
  { id:'a5', type:'trend',    sev:'medium',   msg:'#BuildInPublic trending +44% on X — consider engaging with this hashtag today',                    time:'2h ago',  plat:'X',        read:true  },
  { id:'a6', type:'spike',    sev:'low',      msg:'LinkedIn engagement rate above baseline for the 5th consecutive day',                              time:'3h ago',  plat:'LinkedIn', read:true  },
];

const CONTENT_IDEAS = [
  { id:'ci1', hook:'Thread: 5 AI tools that replaced a full-time hire for me in 2025',   plat:'X',         trend:'#AIProductivity', score:94 },
  { id:'ci2', hook:'Why I turned down $2M in VC and built to $1M ARR alone instead',    plat:'LinkedIn',  trend:'#IndieHacker',    score:91 },
  { id:'ci3', hook:'POV: Day 1 vs Day 365 of building in public — what changed',        plat:'Instagram', trend:'#BuildInPublic',  score:88 },
  { id:'ci4', hook:"I analyzed 100 viral creator posts. Here's the single pattern",     plat:'YouTube',   trend:'#CreatorEconomy', score:85 },
  { id:'ci5', hook:'Uncomfortable truth about personal brand that nobody talks about',  plat:'TikTok',    trend:'#ForYouPage',     score:82 },
];

const ACTIONS = [
  { id:'ac1', label:"Engage with @sama's thread on X — high signal, +520% velocity",         icon:<Zap size={13}/>,       color:'#6366F1', plat:'X'         },
  { id:'ac2', label:"Reply to top 3 comments on @andrewhuberman's YouTube video",            icon:<Heart size={13}/>,     color:'#FF4444', plat:'YouTube'   },
  { id:'ac3', label:'Post on LinkedIn during 8–10am window — your peak engagement time',      icon:<Clock size={13}/>,     color:'#2D88FF', plat:'LinkedIn'  },
  { id:'ac4', label:'Create Reel using trending #ContentCreator audio — 28K+ mentions today', icon:<Activity size={13}/>,  color:'#F0609E', plat:'Instagram' },
  { id:'ac5', label:'Comment on 5 posts tagged #BuildInPublic — 73% audience overlap',        icon:<Target size={13}/>,    color:'#22D3EE', plat:'X'         },
];

const DEFAULT_CIRCLE = {
  LinkedIn:  ['satyanadella','reidhoffman','garyvee','levelsio'],
  X:         ['sama','paulg','levelsio','naval'],
  Instagram: ['visualcreator','alexhormozi','mrbeast'],
  YouTube:   ['andrewhuberman','lexfridman','techreviewer'],
  TikTok:    ['khaby.lame','charlidamelio'],
};

const NAV = [
  { id:'dashboard',    label:'Dashboard',    icon:<LayoutDashboard size={18}/> },
  { id:'sources',      label:'Sources',      icon:<Globe size={18}/>            },
  { id:'intelligence', label:'Intelligence', icon:<Brain size={18}/>            },
  { id:'trending',     label:'Trending',     icon:<TrendingUp size={18}/>       },
  { id:'content',      label:'Content',      icon:<FileText size={18}/>         },
  { id:'alerts',       label:'Alerts',       icon:<Bell size={18}/>             },
  { id:'growth',       label:'Growth',       icon:<BarChart2 size={18}/>        },
  { id:'settings',     label:'Settings',     icon:<Settings size={18}/>         },
];

const VIEW_LABELS = {
  dashboard:'Executive Dashboard', sources:'Source Pages', intelligence:'Audience Intelligence',
  trending:'Trending & Discovery', content:'Content Intelligence', alerts:'Alerts & Monitoring',
  growth:'Growth Tools', settings:'Settings',
};

// ─── UTILITIES ─────────────────────────────────────────────────────────────────
function sparkPath(data, w = 80, h = 28) {
  if (!data || data.length < 2) return { line:'', area:'' };
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => [
    ((i / (data.length - 1)) * w).toFixed(1),
    (h - ((v - min) / range) * h * 0.85 - h * 0.07).toFixed(1),
  ]);
  const line = pts.map((p, i) => `${i===0?'M':'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = `M ${pts[0][0]} ${h} L ${pts.map(p=>`${p[0]} ${p[1]}`).join(' L ')} L ${pts[pts.length-1][0]} ${h} Z`;
  return { line, area, pts };
}

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function sigColor(sig) {
  if (sig === 'high')   return { c:'#10B981', bg:'rgba(16,185,129,0.12)',  label:'HIGH'     };
  if (sig === 'rising') return { c:'#F59E0B', bg:'rgba(245,158,11,0.12)',  label:'RISING'   };
  return                       { c:'#52525B', bg:'rgba(82,82,91,0.1)',     label:'MODERATE' };
}

// ─── BASE COMPONENTS ───────────────────────────────────────────────────────────
function Sparkline({ data, color, width = 80, height = 28 }) {
  const { line, area } = sparkPath(data, width, height);
  const id = `sg${color.replace('#','')}`;
  return (
    <svg width={width} height={height} style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function KPICard({ kpi, t }) {
  return (
    <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:16, padding:'18px 20px', display:'flex', flexDirection:'column', gap:10, flex:1, minWidth:160, position:'relative', overflow:'hidden', transition:'box-shadow 0.25s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 30px ${kpi.color}20`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, ${kpi.color}, transparent)`, borderRadius:'16px 16px 0 0' }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <span style={{ fontSize:11, fontWeight:600, color:t.textSub, textTransform:'uppercase', letterSpacing:'0.05em' }}>{kpi.label}</span>
        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:kpi.pos?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.12)', color:kpi.pos?'#10B981':'#EF4444', display:'flex', alignItems:'center', gap:2 }}>
          {kpi.pos?<ArrowUpRight size={10}/>:<ArrowDownRight size={10}/>}{kpi.delta}
        </span>
      </div>
      <div style={{ fontSize:26, fontWeight:700, color:t.text, letterSpacing:'-0.02em', lineHeight:1 }}>{kpi.value}</div>
      <Sparkline data={kpi.spark} color={kpi.color} width={80} height={24}/>
    </div>
  );
}

function GlassCard({ children, style, t }) {
  return (
    <div style={{ background:t.glass, border:`1px solid ${t.glassBorder}`, borderRadius:16, backdropFilter:'blur(12px)', ...style }}>
      {children}
    </div>
  );
}

function PostCard({ post, platform, t, bookmarks, onBookmark }) {
  const cfg = PLAT[platform] || PLAT.LinkedIn;
  const sig = sigColor(post.signal);
  const bk  = bookmarks?.some(b => b.id === post.id);
  return (
    <div style={{ borderRadius:14, padding:'14px 16px', border:`1px solid ${t.border}`, background:t.glass, marginBottom:6, transition:'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = t.borderMid}
      onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:cfg.bg, border:`1px solid ${cfg.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:cfg.color, flexShrink:0 }}>
            {post.author[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:t.text }}>@{post.author}</div>
            <div style={{ fontSize:10, color:t.textSub, display:'flex', alignItems:'center', gap:3 }}>
              <Clock size={9}/>{post.time} ago · <span style={{ color:cfg.color }}>{post.eng}</span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:5, background:sig.bg, color:sig.c, letterSpacing:'0.05em' }}>{sig.label}</span>
          <span style={{ fontSize:9, fontWeight:700, color:'#10B981' }}>{post.velocity}</span>
          {onBookmark && (
            <button onClick={() => onBookmark(post, platform)} style={{ background:'none', border:'none', cursor:'pointer', color:bk?'#F59E0B':t.textSub, padding:2 }}>
              {bk ? <BookmarkCheck size={13}/> : <Bookmark size={13}/>}
            </button>
          )}
        </div>
      </div>
      <p style={{ fontSize:12, lineHeight:1.6, color:t.text, marginBottom:8 }}>{post.content.slice(0,160)}{post.content.length>160?'…':''}</p>
      <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
        {post.bw?.map((w, i) => (
          <span key={i} style={{ fontSize:10, padding:'2px 7px', borderRadius:5, fontWeight:600, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>{w}</span>
        ))}
      </div>
    </div>
  );
}

// ─── AI BRIEF ──────────────────────────────────────────────────────────────────
function AIBriefPanel({ platform, t }) {
  const [brief,   setBrief]   = useState('');
  const [loading, setLoading] = useState(false);
  const [ts,      setTs]      = useState(null);
  const prevPlat = useRef(null);
  const cfg = PLAT[platform] || {};

  const generate = useCallback(async () => {
    setLoading(true); setBrief('');
    const posts = MOCK_POSTS[platform] || [];
    const summary = posts.map((p, i) => `${i+1}. @${p.author}: "${p.content.slice(0,100)}" — Signal: ${p.signal}, Velocity: ${p.velocity}`).join('\n');
    const prompt = `You are a social media intelligence analyst. Platform: ${platform}.\n\nTop posts:\n${summary}\n\nWrite exactly 3 bullet points (use • character):\n• What dominant narrative is emerging on ${platform} right now\n• Which specific account to engage with TODAY and exactly why\n• One concrete action to take in the next 24 hours\n\nEach bullet: one sharp sentence. Chief of staff tone. No fluff.`;
    try {
      const r = await fetch('/api/brief', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, type:'brief' }) });
      const d = await r.json();
      setBrief(d.text || 'Unable to generate brief.');
    } catch { setBrief('Connection failed. Check your API key in Vercel → Settings → Environment Variables.'); }
    setLoading(false);
    setTs(new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }));
  }, [platform]);

  useEffect(() => {
    if (prevPlat.current !== platform) { prevPlat.current = platform; generate(); }
  }, [platform, generate]);

  return (
    <div style={{ background:cfg.bg||t.glass, border:`1px solid ${cfg.border||t.glassBorder}`, borderRadius:16, padding:16, boxShadow:cfg.glow?`0 0 24px ${cfg.glow}`:'none' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <Brain size={13} style={{ color:cfg.color||'#6366F1' }}/>
          <span style={{ fontSize:11, fontWeight:700, color:cfg.color||'#6366F1', letterSpacing:'0.04em', textTransform:'uppercase' }}>AI Brief · {platform}</span>
          {ts && <span style={{ fontSize:10, color:t.textSub, display:'flex', alignItems:'center', gap:3 }}><Clock size={9}/>{ts}</span>}
        </div>
        <button onClick={generate} disabled={loading}
          style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:8, background:cfg.color||'#6366F1', color:platform==='X'?'#0d0d12':'#fff', border:'none', cursor:'pointer', opacity:loading?0.6:1 }}>
          {loading?<RefreshCw size={10} style={{ animation:'spin 1s linear infinite' }}/>:<Sparkles size={10}/>}
          {loading?'Thinking…':'Refresh'}
        </button>
      </div>
      {loading && (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[85,70,55].map((w, i) => <div key={i} style={{ height:7, borderRadius:4, background:t.border, width:`${w}%`, animation:'pulse 1.5s ease-in-out infinite' }}/>)}
        </div>
      )}
      {!loading && brief && (
        <div style={{ fontSize:11, lineHeight:1.75, color:t.textSub }}>
          {brief.split('\n').filter(l => l.trim()).map((line, i) => (
            <div key={i} style={{ display:'flex', gap:7, marginBottom:6 }}>
              {line.startsWith('•') && <span style={{ color:cfg.color||'#6366F1', flexShrink:0, marginTop:1 }}>•</span>}
              <span style={{ color:line.startsWith('•')?t.text:t.textSub }}>{line.replace(/^•\s*/,'')}</span>
            </div>
          ))}
        </div>
      )}
      {!loading && !brief && <p style={{ fontSize:11, color:t.textMuted }}>Generating your {platform} intelligence brief…</p>}
    </div>
  );
}

// ─── MORNING DIGEST ────────────────────────────────────────────────────────────
function MorningDigest({ t }) {
  const [bullets, setBullets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ts,      setTs]      = useState(null);
  const done = useRef(false);

  const generate = useCallback(async () => {
    setLoading(true); setBullets([]);
    const summaries = Object.entries(MOCK_POSTS).map(([plat, posts]) => {
      const top = posts[0];
      return `${plat}: @${top.author} — "${top.content.slice(0,80)}" (${top.signal} signal, ${top.velocity})`;
    }).join('\n');
    const prompt = `Morning briefing for a social media command center. Top posts:\n\n${summaries}\n\nWrite exactly 5 bullet points — one per platform (LinkedIn, X, Instagram, YouTube, TikTok). Format:\n• [Platform]: one sharp sentence on what's dominating right now\n\nPunchy. Executive summary. Each bullet under 20 words.`;
    try {
      const r = await fetch('/api/brief', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, type:'digest' }) });
      const d = await r.json();
      setBullets((d.text||'').split('\n').filter(l => l.trim() && l.includes('•')));
    } catch { setBullets(['• Unable to generate digest. Check your API configuration.']); }
    setLoading(false);
    setTs(new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }));
  }, []);

  useEffect(() => { if (!done.current) { done.current = true; generate(); } }, [generate]);

  const platColor = { LinkedIn:'#2D88FF', X:'#E8EAF0', Instagram:'#F0609E', YouTube:'#FF4444', TikTok:'#69C9D0' };

  return (
    <GlassCard t={t} style={{ padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#10B981', animation:'pulse 2s ease-in-out infinite' }}/>
          <span style={{ fontSize:11, fontWeight:700, color:'#10B981', letterSpacing:'0.06em', textTransform:'uppercase' }}>Morning Digest</span>
          {ts && <span style={{ fontSize:10, color:t.textSub }}>{ts}</span>}
        </div>
        <button onClick={generate} style={{ fontSize:10, color:t.textSub, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
          <RefreshCw size={10}/>Refresh
        </button>
      </div>
      {loading && <div style={{ display:'flex', flexDirection:'column', gap:6 }}>{[90,75,80,70,65].map((w,i)=><div key={i} style={{ height:7, borderRadius:4, background:t.border, width:`${w}%`, animation:'pulse 1.5s ease-in-out infinite' }}/>)}</div>}
      {!loading && bullets.map((line, i) => {
        const clean = line.replace(/^•\s*/,'');
        const plat  = Object.keys(platColor).find(p => clean.startsWith(p));
        return (
          <div key={i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'flex-start' }}>
            <span style={{ color:plat?platColor[plat]:'#10B981', fontSize:12, flexShrink:0, marginTop:1 }}>•</span>
            <span style={{ fontSize:11, lineHeight:1.65, color:t.text }}>{clean}</span>
          </div>
        );
      })}
      {!loading && !bullets.length && <p style={{ fontSize:11, color:t.textMuted }}>Loading intelligence…</p>}
    </GlassCard>
  );
}

// ─── VIEWS ─────────────────────────────────────────────────────────────────────
function DashboardView({ t, onNav }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [liveStats, setLiveStats] = useState({ reach:2410000, mentions:4782, active:31 });

  useEffect(() => {
    const iv = setInterval(() => {
      setLiveStats(s => ({
        reach:    s.reach    + Math.floor(Math.random() * 50 - 10),
        mentions: s.mentions + Math.floor(Math.random() * 8  - 2),
        active:   Math.max(20, s.active + Math.floor(Math.random() * 6 - 3)),
      }));
    }, 3500);
    return () => clearInterval(iv);
  }, []);

  const toggleBk = (post, plat) => setBookmarks(prev => prev.some(b => b.id === post.id) ? prev.filter(b => b.id !== post.id) : [...prev, { ...post, platform:plat }]);

  const HEAT_COLORS   = [['#6366F1','#4F46E5','#22D3EE','#818CF8','#6366F1'],['#22D3EE','#6366F1','#10B981','#22D3EE','#F59E0B'],['#10B981','#818CF8','#6366F1','#10B981','#22D3EE'],['#F59E0B','#22D3EE','#EF4444','#6366F1','#10B981']];
  const HEAT_OPACITY  = [[0.9,0.5,0.8,0.3,0.6],[0.4,0.7,0.9,0.5,0.3],[0.8,0.4,0.5,0.7,0.9],[0.3,0.6,0.4,0.8,0.5]];
  const HEAT_TAGS     = [['#AIStrategy','#BuildInPublic','#FutureOfWork','#DeepDive','#Leadership'],['#CreatorEconomy','#AGI','#BrandIdentity','#ForYouPage','#Investing'],['#IndieHacker','#ContentCreator','#AIProductivity','#ScienceExplained','#LongForm'],['#Startups','#PersonalBrand','#Viral','#AItools','#GrowthHacking']];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:10, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.18)', width:'fit-content' }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#10B981', animation:'pulse 2s ease-in-out infinite' }}/>
        <span style={{ fontSize:11, fontWeight:600, color:'#10B981' }}>LIVE</span>
        <span style={{ fontSize:11, color:'#10B981', opacity:0.8 }}>· {fmt(liveStats.reach)} reach · {fmt(liveStats.mentions)} mentions · {liveStats.active} active accounts</span>
      </div>

      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        {KPIS.map(k => <KPICard key={k.id} kpi={k} t={t}/>)}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16, alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <MorningDigest t={t}/>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <Zap size={13} style={{ color:'#6366F1' }}/>
              <span style={{ fontSize:12, fontWeight:700, color:t.text }}>Top Signals — All Platforms</span>
            </div>
            {Object.entries(MOCK_POSTS).slice(0,3).map(([plat, posts]) => (
              <div key={plat} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <span style={{ color:PLAT[plat]?.color }}>{PLAT[plat]?.icon}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:PLAT[plat]?.color, textTransform:'uppercase', letterSpacing:'0.04em' }}>{plat}</span>
                </div>
                <PostCard post={posts[0]} platform={plat} t={t} bookmarks={bookmarks} onBookmark={toggleBk}/>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14, position:'sticky', top:0 }}>
          <GlassCard t={t} style={{ padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
              <Activity size={13} style={{ color:'#22D3EE' }}/>
              <span style={{ fontSize:11, fontWeight:700, color:t.text }}>Trending Heat Map</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4 }}>
              {HEAT_COLORS.map((row, ri) => row.map((color, ci) => (
                <div key={`${ri}-${ci}`} title={HEAT_TAGS[ri][ci]}
                  style={{ height:26, borderRadius:6, background:color, opacity:HEAT_OPACITY[ri][ci], cursor:'default', transition:'opacity 0.3s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = HEAT_OPACITY[ri][ci]}
                />
              )))}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:10 }}>
              {HEAT_TAGS.flat().slice(0,5).map((tag, i) => (
                <span key={i} style={{ fontSize:9, padding:'2px 6px', borderRadius:4, background:t.glass, border:`1px solid ${t.border}`, color:t.textSub }}>{tag}</span>
              ))}
            </div>
          </GlassCard>

          <GlassCard t={t} style={{ padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
              <Target size={13} style={{ color:'#F59E0B' }}/>
              <span style={{ fontSize:11, fontWeight:700, color:t.text }}>Recommended Actions</span>
            </div>
            {ACTIONS.slice(0,4).map((a, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8, padding:'8px 10px', borderRadius:10, background:t.glass, border:`1px solid ${t.border}` }}>
                <span style={{ color:a.color, flexShrink:0, marginTop:1 }}>{a.icon}</span>
                <span style={{ fontSize:11, lineHeight:1.55, color:t.textSub }}>{a.label}</span>
              </div>
            ))}
            <button onClick={() => onNav('growth')}
              style={{ width:'100%', fontSize:11, fontWeight:600, padding:'7px 0', borderRadius:10, background:'rgba(99,102,241,0.1)', color:'#6366F1', border:'1px solid rgba(99,102,241,0.2)', cursor:'pointer' }}>
              View all growth actions →
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function SourcesView({ t, circle, setCircle }) {
  const [modal,     setModal]     = useState(null);
  const [newAcc,    setNewAcc]    = useState('');
  const [auditPlat, setAuditPlat] = useState(null);

  const addAcc = () => {
    if (!newAcc.trim() || !modal) return;
    setCircle(prev => ({ ...prev, [modal]: [...(prev[modal]||[]).filter(a => a !== newAcc.trim()), newAcc.trim()] }));
    setNewAcc('');
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <p style={{ fontSize:13, color:t.textSub }}>{Object.values(circle).flat().length} total sources connected across all platforms.</p>
        <button onClick={() => setModal(Object.keys(PLAT)[0])}
          style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, padding:'8px 16px', borderRadius:10, background:'#6366F1', color:'#fff', border:'none', cursor:'pointer' }}>
          <Plus size={14}/>Add Source
        </button>
      </div>

      {Object.entries(PLAT).map(([plat, cfg]) => (
        <div key={plat}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:cfg.color }}>{cfg.icon}</span>
              <span style={{ fontSize:13, fontWeight:700, color:t.text }}>{plat}</span>
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:cfg.bg, color:cfg.color, fontWeight:600 }}>{(circle[plat]||[]).length} sources</span>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setAuditPlat(auditPlat===plat?null:plat)}
                style={{ fontSize:11, fontWeight:600, padding:'5px 12px', borderRadius:8, background:auditPlat===plat?cfg.color:cfg.bg, color:auditPlat===plat?(plat==='X'?'#0d0d12':'#fff'):cfg.color, border:`1px solid ${cfg.border}`, cursor:'pointer' }}>
                {auditPlat===plat?'✓ Auditing':'Audit'}
              </button>
              <button onClick={() => setModal(plat)}
                style={{ padding:'5px 8px', borderRadius:8, background:t.glass, color:t.textSub, border:`1px solid ${t.border}`, cursor:'pointer', display:'flex', alignItems:'center' }}>
                <Plus size={12}/>
              </button>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px, 1fr))', gap:8 }}>
            {(circle[plat]||[]).map((acc, i) => (
              <div key={i} style={{ borderRadius:12, padding:'12px 14px', background:t.card, border:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                  <div style={{ width:30, height:30, borderRadius:9, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:cfg.color, flexShrink:0 }}>
                    {acc[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize:12, fontWeight:600, color:t.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>@{acc}</span>
                </div>
                <button onClick={() => setCircle(prev => ({ ...prev, [plat]:prev[plat].filter(a=>a!==acc) }))}
                  style={{ background:'none', border:'none', cursor:'pointer', color:t.textMuted, flexShrink:0 }}><Trash2 size={12}/></button>
              </div>
            ))}
            {(circle[plat]||[]).length === 0 && (
              <div style={{ borderRadius:12, padding:'20px 14px', background:t.glass, border:`1px dashed ${t.border}`, display:'flex', flexDirection:'column', alignItems:'center', gap:6, cursor:'pointer' }} onClick={() => setModal(plat)}>
                <Plus size={16} style={{ color:t.textMuted }}/><span style={{ fontSize:11, color:t.textMuted }}>Add {plat} source</span>
              </div>
            )}
          </div>
          {auditPlat===plat && (
            <div style={{ marginTop:10, padding:14, borderRadius:12, background:cfg.bg, border:`1px solid ${cfg.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                <RefreshCw size={12} style={{ color:cfg.color, animation:'spin 2s linear infinite' }}/>
                <span style={{ fontSize:11, fontWeight:700, color:cfg.color }}>Live audit in progress…</span>
              </div>
              {MOCK_POSTS[plat]?.slice(0,2).map((p,i) => (
                <div key={i} style={{ fontSize:11, color:t.textSub, padding:'5px 0', borderBottom:`1px solid ${t.border}` }}>
                  <span style={{ color:cfg.color, fontWeight:600 }}>@{p.author}</span> — {p.eng} · Signal: <span style={{ color:sigColor(p.signal).c }}>{p.signal}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(10px)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ width:'100%', maxWidth:440, borderRadius:20, background:t.surface, border:`1px solid ${t.borderMid}`, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${t.border}` }}>
              <h3 style={{ fontFamily:'var(--font-syne), sans-serif', fontSize:16, fontWeight:800, color:t.text }}>Add {modal} Source</h3>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:t.textSub }}><X size={18}/></button>
            </div>
            <div style={{ padding:20 }}>
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                <input value={newAcc} onChange={e => setNewAcc(e.target.value)} onKeyDown={e => e.key==='Enter'&&addAcc()} placeholder={`Add ${modal} handle…`}
                  style={{ flex:1, fontSize:13, padding:'10px 14px', borderRadius:10, border:`1px solid ${PLAT[modal]?.border||t.border}`, background:t.glass, color:t.text, outline:'none' }}/>
                <button onClick={addAcc} style={{ padding:'10px 16px', borderRadius:10, background:PLAT[modal]?.color||'#6366F1', color:modal==='X'?'#0d0d12':'#fff', border:'none', cursor:'pointer' }}><Plus size={16}/></button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto' }}>
                {(circle[modal]||[]).map((acc,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:9, background:t.glass, border:`1px solid ${t.border}` }}>
                    <span style={{ fontSize:12, color:t.text }}>@{acc}</span>
                    <button onClick={() => setCircle(prev => ({ ...prev, [modal]:prev[modal].filter(a=>a!==acc) }))} style={{ background:'none', border:'none', cursor:'pointer', color:t.textSub }}><Trash2 size={13}/></button>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding:'12px 20px', borderTop:`1px solid ${t.border}`, display:'flex', justifyContent:'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding:'8px 20px', borderRadius:10, background:PLAT[modal]?.color||'#6366F1', color:modal==='X'?'#0d0d12':'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:700 }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IntelligenceView({ t }) {
  const [activePlat,   setActivePlat]   = useState('LinkedIn');
  const [activeFilter, setActiveFilter] = useState(null);
  const cfg = PLAT[activePlat];
  const allBw = [...new Set(Object.values(MOCK_POSTS).flatMap(p => p.flatMap(x => x.bw||[])))];

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {Object.keys(PLAT).map(plat => (
            <button key={plat} onClick={() => setActivePlat(plat)}
              style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:700, padding:'6px 12px', borderRadius:10, cursor:'pointer', border:`1px solid ${activePlat===plat?PLAT[plat].color:t.border}`, background:activePlat===plat?PLAT[plat].bg:t.glass, color:activePlat===plat?PLAT[plat].color:t.textSub }}>
              <span style={{ color:PLAT[plat].color }}>{PLAT[plat].icon}</span>{plat}
            </button>
          ))}
        </div>
        <AIBriefPanel platform={activePlat} t={t}/>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
            <Users size={13} style={{ color:cfg.color }}/>
            <span style={{ fontSize:12, fontWeight:700, color:t.text }}>Inner Circle · {activePlat}</span>
          </div>
          {(MOCK_POSTS[activePlat]||[]).map(post => <PostCard key={post.id} post={post} platform={activePlat} t={t}/>)}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12, position:'sticky', top:0 }}>
        <GlassCard t={t} style={{ padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
            <Hash size={13} style={{ color:'#6366F1' }}/><span style={{ fontSize:11, fontWeight:700, color:t.text }}>Buzzword Radar</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {allBw.slice(0,18).map((w, i) => {
              const active = activeFilter === w;
              return (
                <button key={i} onClick={() => setActiveFilter(active?null:w)}
                  style={{ fontSize:11, padding:'3px 9px', borderRadius:7, fontWeight:600, cursor:'pointer', border:`1px solid ${active?'#6366F1':'rgba(99,102,241,0.2)'}`, background:active?'#6366F1':'rgba(99,102,241,0.07)', color:active?'#fff':'#818CF8' }}>
                  {w}
                </button>
              );
            })}
          </div>
        </GlassCard>
        <GlassCard t={t} style={{ padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
            <Target size={13} style={{ color:'#22D3EE' }}/><span style={{ fontSize:11, fontWeight:700, color:t.text }}>Audience Segments</span>
          </div>
          {[{ label:'Founders & Builders', pct:34, color:'#6366F1' },{ label:'Creators & Influencers', pct:28, color:'#F0609E' },{ label:'Investors & Execs', pct:22, color:'#22D3EE' },{ label:'Tech Enthusiasts', pct:16, color:'#10B981' }].map((seg,i) => (
            <div key={i} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:11, color:t.textSub }}>{seg.label}</span>
                <span style={{ fontSize:11, fontWeight:700, color:seg.color }}>{seg.pct}%</span>
              </div>
              <div style={{ height:4, borderRadius:4, background:t.border }}>
                <div style={{ height:4, borderRadius:4, background:seg.color, width:`${seg.pct}%` }}/>
              </div>
            </div>
          ))}
        </GlassCard>
        <GlassCard t={t} style={{ padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
            <TrendingUp size={13} style={{ color:cfg.color }}/><span style={{ fontSize:11, fontWeight:700, color:t.text }}>Trending in Circle</span>
          </div>
          {(TRENDING[activePlat]||[]).map((item,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${t.border}` }}>
              <span style={{ fontSize:11, fontWeight:600, color:cfg.color }}>{item.tag}</span>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:10, color:t.textSub }}>{item.v}</div>
                <div style={{ fontSize:10, fontWeight:700, color:'#10B981' }}>{item.d}</div>
              </div>
            </div>
          ))}
        </GlassCard>
      </div>
    </div>
  );
}

function TrendingView({ t }) {
  const [activePlat, setActivePlat] = useState('all');
  const allTrending = Object.entries(TRENDING).flatMap(([plat, items]) => items.map(item => ({ ...item, plat, color:PLAT[plat]?.color||'#6366F1' })));
  const sorted    = [...allTrending].sort((a,b) => parseFloat(b.d)-parseFloat(a.d));
  const displayed = activePlat==='all' ? sorted : sorted.filter(x => x.plat===activePlat);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        <button onClick={() => setActivePlat('all')}
          style={{ fontSize:11, fontWeight:700, padding:'6px 14px', borderRadius:10, cursor:'pointer', border:`1px solid ${activePlat==='all'?'#6366F1':t.border}`, background:activePlat==='all'?'rgba(99,102,241,0.12)':t.glass, color:activePlat==='all'?'#6366F1':t.textSub }}>
          All Platforms
        </button>
        {Object.keys(PLAT).map(plat => (
          <button key={plat} onClick={() => setActivePlat(plat)}
            style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'6px 12px', borderRadius:10, cursor:'pointer', border:`1px solid ${activePlat===plat?PLAT[plat].color:t.border}`, background:activePlat===plat?PLAT[plat].bg:t.glass, color:activePlat===plat?PLAT[plat].color:t.textSub }}>
            <span style={{ color:PLAT[plat].color }}>{PLAT[plat].icon}</span>{plat}
          </button>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {displayed.map((item, i) => (
          <div key={i} style={{ borderRadius:14, padding:'14px 16px', background:t.card, border:`1px solid ${t.border}`, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:18, fontWeight:800, color:t.textMuted, width:28, flexShrink:0 }}>#{i+1}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                <span style={{ color:item.color }}>{PLAT[item.plat]?.icon}</span>
                <span style={{ fontSize:12, fontWeight:700, color:item.color }}>{item.tag}</span>
              </div>
              <div style={{ fontSize:10, color:t.textSub }}>{item.v} mentions · <span style={{ fontWeight:700, color:'#10B981' }}>{item.d}</span></div>
            </div>
            <Sparkline data={[20,35,28,45,38,52,48,61,55,70,65,parseFloat(item.d)]} color={item.color} width={40} height={18}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentView({ t }) {
  const [generating, setGenerating] = useState(false);

  const genIdeas = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1500));
    setGenerating(false);
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <Flame size={14} style={{ color:'#F59E0B' }}/>
          <span style={{ fontSize:13, fontWeight:700, color:t.text }}>Top Performing Posts — All Platforms</span>
        </div>
        {Object.entries(MOCK_POSTS).flatMap(([plat, posts]) => posts.map(p => ({ ...p, platform:plat }))).sort((a,b) => a.signal==='high'?-1:1).slice(0,8).map(post => (
          <div key={post.id}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
              <span style={{ color:PLAT[post.platform]?.color }}>{PLAT[post.platform]?.icon}</span>
              <span style={{ fontSize:10, fontWeight:700, color:PLAT[post.platform]?.color, textTransform:'uppercase', letterSpacing:'0.04em' }}>{post.platform}</span>
            </div>
            <PostCard post={post} platform={post.platform} t={t}/>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12, position:'sticky', top:0 }}>
        <GlassCard t={t} style={{ padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
            <Sparkles size={13} style={{ color:'#6366F1' }}/><span style={{ fontSize:11, fontWeight:700, color:t.text }}>AI Content Ideas</span>
          </div>
          <button onClick={genIdeas} disabled={generating}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontSize:12, fontWeight:700, padding:'10px 0', borderRadius:10, background:'linear-gradient(135deg, #6366F1, #22D3EE)', color:'#fff', border:'none', cursor:'pointer', opacity:generating?0.7:1, marginBottom:12 }}>
            {generating?<RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }}/>:<Sparkles size={13}/>}
            {generating?'Generating…':'Generate Ideas'}
          </button>
          {CONTENT_IDEAS.map((idea) => (
            <div key={idea.id} style={{ borderRadius:10, padding:'10px 12px', background:t.glass, border:`1px solid ${t.border}`, marginBottom:6 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ color:PLAT[idea.plat]?.color }}>{PLAT[idea.plat]?.icon}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:PLAT[idea.plat]?.color }}>{idea.plat}</span>
                  <span style={{ fontSize:10, color:t.textSub }}>{idea.trend}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <Star size={9} style={{ color:'#F59E0B' }}/>
                  <span style={{ fontSize:10, fontWeight:700, color:'#F59E0B' }}>{idea.score}</span>
                </div>
              </div>
              <p style={{ fontSize:11, lineHeight:1.55, color:t.text }}>{idea.hook}</p>
            </div>
          ))}
        </GlassCard>
      </div>
    </div>
  );
}

function AlertsView({ t }) {
  const [alerts,  setAlerts]  = useState(ALERTS);
  const [filter,  setFilter]  = useState('all');
  const unread = alerts.filter(a => !a.read).length;

  const markRead = id => setAlerts(prev => prev.map(a => a.id===id?{ ...a, read:true }:a));
  const markAll  = ()  => setAlerts(prev => prev.map(a => ({ ...a, read:true })));
  const dismiss  = id => setAlerts(prev => prev.filter(a => a.id!==id));

  const sevStyle = sev => ({
    critical: { color:'#EF4444', bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.2)',  icon:<AlertTriangle size={13}/> },
    high:     { color:'#F59E0B', bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.2)', icon:<Zap size={13}/> },
    medium:   { color:'#6366F1', bg:'rgba(99,102,241,0.1)',  border:'rgba(99,102,241,0.18)',icon:<Info size={13}/> },
    low:      { color:'#10B981', bg:'rgba(16,185,129,0.1)',  border:'rgba(16,185,129,0.18)',icon:<CheckCircle size={13}/> },
  }[sev] || { color:t.textSub, bg:t.glass, border:t.border, icon:<Bell size={13}/> });

  const filtered = filter==='all' ? alerts : filter==='unread' ? alerts.filter(a=>!a.read) : alerts.filter(a=>a.sev===filter);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          {unread>0 && <span style={{ fontSize:11, padding:'3px 10px', borderRadius:7, background:'rgba(239,68,68,0.12)', color:'#EF4444', fontWeight:700 }}>{unread} unread</span>}
          {['all','unread','critical','high','medium','low'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ fontSize:10, fontWeight:600, padding:'4px 10px', borderRadius:7, cursor:'pointer', border:`1px solid ${filter===f?'#6366F1':t.border}`, background:filter===f?'rgba(99,102,241,0.12)':t.glass, color:filter===f?'#6366F1':t.textSub, textTransform:'capitalize' }}>
              {f}
            </button>
          ))}
        </div>
        {unread>0 && <button onClick={markAll} style={{ fontSize:11, color:t.textSub, background:'none', border:'none', cursor:'pointer' }}>Mark all read</button>}
      </div>
      {filtered.length===0 && (
        <div style={{ padding:'48px 0', textAlign:'center' }}>
          <CheckCircle size={32} style={{ color:t.textMuted, margin:'0 auto 10px' }}/>
          <p style={{ fontSize:13, color:t.textSub }}>No alerts matching &quot;{filter}&quot;</p>
        </div>
      )}
      {filtered.map(alert => {
        const s = sevStyle(alert.sev);
        const platCfg = PLAT[alert.plat];
        return (
          <div key={alert.id} style={{ borderRadius:14, padding:'14px 16px', background:alert.read?t.glass:s.bg, border:`1px solid ${alert.read?t.border:s.border}`, display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:32, height:32, borderRadius:9, background:s.bg, border:`1px solid ${s.border}`, display:'flex', alignItems:'center', justifyContent:'center', color:s.color, flexShrink:0 }}>{s.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:4, background:s.bg, color:s.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>{alert.sev}</span>
                {platCfg && <span style={{ color:platCfg.color, display:'flex', alignItems:'center', gap:3, fontSize:10, fontWeight:600 }}>{platCfg.icon} {alert.plat}</span>}
                {!alert.read && <div style={{ width:6, height:6, borderRadius:'50%', background:'#EF4444' }}/>}
              </div>
              <p style={{ fontSize:12, lineHeight:1.55, color:alert.read?t.textSub:t.text, marginBottom:4 }}>{alert.msg}</p>
              <span style={{ fontSize:10, color:t.textMuted, display:'flex', alignItems:'center', gap:3 }}><Clock size={9}/>{alert.time}</span>
            </div>
            <div style={{ display:'flex', gap:4, flexShrink:0 }}>
              {!alert.read && <button onClick={() => markRead(alert.id)} style={{ fontSize:10, padding:'4px 8px', borderRadius:7, background:'rgba(16,185,129,0.1)', color:'#10B981', border:'1px solid rgba(16,185,129,0.2)', cursor:'pointer' }}>Read</button>}
              <button onClick={() => dismiss(alert.id)} style={{ padding:'4px 6px', borderRadius:7, background:t.glass, color:t.textSub, border:`1px solid ${t.border}`, cursor:'pointer', display:'flex' }}><X size={11}/></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GrowthView({ t }) {
  const [range, setRange] = useState('30d');
  const data  = range==='7d' ? GROWTH_DATA.slice(-7) : range==='14d' ? GROWTH_DATA.slice(-14) : GROWTH_DATA;
  const W=580, H=130;
  const min=Math.min(...data), max=Math.max(...data), rv=max-min||1;
  const pts = data.map((v,i) => [((i/(data.length-1))*W).toFixed(1),(H-((v-min)/rv)*H*0.88-H*0.06).toFixed(1)]);
  const linePath = pts.map((p,i) => `${i===0?'M':'L'} ${p[0]} ${p[1]}`).join(' ');
  const aPath    = `M ${pts[0][0]} ${H} L ${pts.map(p=>`${p[0]} ${p[1]}`).join(' L ')} L ${pts[pts.length-1][0]} ${H} Z`;
  const growth   = ((data[data.length-1]-data[0])/data[0]*100).toFixed(1);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:18, padding:24 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
          <div>
            <p style={{ fontSize:11, color:t.textSub, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>Follower Growth</p>
            <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
              <span style={{ fontSize:28, fontWeight:700, color:t.text, letterSpacing:'-0.02em' }}>{fmt(data[data.length-1])}</span>
              <span style={{ fontSize:13, fontWeight:700, color:'#10B981', display:'flex', alignItems:'center', gap:2 }}><ArrowUpRight size={13}/>{growth}%</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:5 }}>
            {['7d','14d','30d'].map(r => (
              <button key={r} onClick={() => setRange(r)}
                style={{ fontSize:11, fontWeight:700, padding:'5px 12px', borderRadius:8, cursor:'pointer', border:`1px solid ${range===r?'#6366F1':t.border}`, background:range===r?'rgba(99,102,241,0.12)':t.glass, color:range===r?'#6366F1':t.textSub }}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <svg width="100%" viewBox={`0 0 ${W} ${H+10}`} style={{ overflow:'visible', display:'block' }}>
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.22"/>
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0"/>
            </linearGradient>
          </defs>
          {[0,0.25,0.5,0.75,1].map((f,i) => <line key={i} x1="0" y1={H*f} x2={W} y2={H*f} stroke={t.border} strokeWidth="1"/>)}
          <path d={aPath} fill="url(#growthGrad)"/>
          <path d={linePath} fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="5" fill="#6366F1" stroke={t.card} strokeWidth="2"/>
        </svg>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <GlassCard t={t} style={{ padding:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
            <BarChart2 size={13} style={{ color:'#22D3EE' }}/><span style={{ fontSize:12, fontWeight:700, color:t.text }}>Platform Breakdown</span>
          </div>
          {[{ label:'LinkedIn', count:3420, delta:'+8.2%',  color:'#2D88FF' },
            { label:'X',        count:4890, delta:'+12.4%', color:'#E8EAF0' },
            { label:'Instagram',count:2810, delta:'+22.1%', color:'#F0609E' },
            { label:'YouTube',  count:5340, delta:'+9.8%',  color:'#FF4444' },
            { label:'TikTok',   count:8600, delta:'+41.2%', color:'#69C9D0' }].map((plat,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid ${t.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ color:plat.color }}>{PLAT[plat.label]?.icon}</span>
                <span style={{ fontSize:12, color:t.textSub }}>{plat.label}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, fontWeight:600, color:t.text }}>{fmt(plat.count)}</span>
                <span style={{ fontSize:11, fontWeight:700, color:'#10B981' }}>{plat.delta}</span>
              </div>
            </div>
          ))}
        </GlassCard>

        <GlassCard t={t} style={{ padding:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
            <Rocket size={13} style={{ color:'#F59E0B' }}/><span style={{ fontSize:12, fontWeight:700, color:t.text }}>Growth Actions</span>
          </div>
          {ACTIONS.map((a,i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 10px', borderRadius:10, background:t.glass, border:`1px solid ${t.border}`, marginBottom:6, cursor:'pointer', transition:'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = a.color+'40'}
              onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
              <span style={{ color:a.color, flexShrink:0, marginTop:1 }}>{a.icon}</span>
              <span style={{ fontSize:11, lineHeight:1.55, color:t.textSub }}>{a.label}</span>
            </div>
          ))}
          <button style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:11, fontWeight:600, padding:'8px 0', borderRadius:10, background:'rgba(245,158,11,0.1)', color:'#F59E0B', border:'1px solid rgba(245,158,11,0.2)', cursor:'pointer', marginTop:4 }}>
            <Download size={12}/>Export Growth Report
          </button>
        </GlassCard>
      </div>
    </div>
  );
}

function SettingsView({ t, dark, onDark }) {
  const [showKey, setShowKey] = useState(false);
  const [notif,   setNotif]   = useState({ spikes:true, sentiment:true, growth:false });
  const [saved,   setSaved]   = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:800 }}>
      <GlassCard t={t} style={{ padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:16 }}>
          <Key size={14} style={{ color:'#6366F1' }}/><span style={{ fontSize:13, fontWeight:700, color:t.text }}>API Keys</span>
        </div>
        <p style={{ fontSize:11, color:t.textSub, marginBottom:14, lineHeight:1.65 }}>Add keys in <strong style={{ color:t.text }}>Vercel → Settings → Environment Variables</strong> and redeploy. Keys are never stored in the browser.</p>
        {[{ id:'groq',   label:'GROQ_API_KEY',                   hint:'Free at console.groq.com — fastest inference' },
          { id:'google', label:'GOOGLE_AI_KEY / GEMINI_API_KEY', hint:'Free at aistudio.google.com — 500 req/day' },
          { id:'claude', label:'ANTHROPIC_API_KEY',              hint:'Paid at console.anthropic.com — highest quality' }].map(f => (
          <div key={f.id} style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:600, color:t.textSub, display:'block', marginBottom:5, letterSpacing:'0.04em', fontFamily:'monospace' }}>{f.label}</label>
            <div style={{ display:'flex', gap:6 }}>
              <input type={showKey?'text':'password'} readOnly value="•••••••••••••••••••"
                style={{ flex:1, fontSize:12, padding:'8px 12px', borderRadius:9, border:`1px solid ${t.border}`, background:t.glass, color:t.textSub, outline:'none', fontFamily:'monospace' }}/>
              <button onClick={() => setShowKey(s=>!s)}
                style={{ padding:'8px 10px', borderRadius:9, background:t.glass, border:`1px solid ${t.border}`, color:t.textSub, cursor:'pointer', display:'flex' }}><Eye size={13}/></button>
            </div>
            <p style={{ fontSize:10, color:t.textMuted, marginTop:3 }}>{f.hint}</p>
          </div>
        ))}
      </GlassCard>

      <GlassCard t={t} style={{ padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:16 }}>
          <Palette size={14} style={{ color:'#22D3EE' }}/><span style={{ fontSize:13, fontWeight:700, color:t.text }}>Appearance & Notifications</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:12, background:t.glass, border:`1px solid ${t.border}`, marginBottom:16 }}>
          <div>
            <p style={{ fontSize:12, fontWeight:600, color:t.text }}>Dark Mode</p>
            <p style={{ fontSize:10, color:t.textSub }}>Obsidian dark interface (recommended)</p>
          </div>
          <button onClick={onDark} style={{ width:44, height:24, borderRadius:12, background:dark?'#6366F1':t.border, border:'none', cursor:'pointer', position:'relative', transition:'background 0.3s', flexShrink:0 }}>
            <div style={{ position:'absolute', top:3, left:dark?21:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.3s' }}/>
          </button>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
          <BellRing size={13} style={{ color:'#F59E0B' }}/><span style={{ fontSize:12, fontWeight:700, color:t.text }}>Alert Preferences</span>
        </div>
        {[{ id:'spikes', label:'Spike Alerts', desc:'Notify on +200% velocity posts' },
          { id:'sentiment', label:'Sentiment Alerts', desc:'Notify on negative sentiment drops' },
          { id:'growth', label:'Growth Milestones', desc:'Notify on follower milestones' }].map(n => (
          <div key={n.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${t.border}` }}>
            <div>
              <p style={{ fontSize:12, color:t.text }}>{n.label}</p>
              <p style={{ fontSize:10, color:t.textSub }}>{n.desc}</p>
            </div>
            <button onClick={() => setNotif(prev => ({ ...prev, [n.id]:!prev[n.id] }))}
              style={{ width:38, height:21, borderRadius:10, background:notif[n.id]?'#6366F1':t.border, border:'none', cursor:'pointer', position:'relative', transition:'background 0.3s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:2.5, left:notif[n.id]?18:2.5, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.3s' }}/>
            </button>
          </div>
        ))}
      </GlassCard>

      <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'flex-end' }}>
        <button onClick={save}
          style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:700, padding:'10px 24px', borderRadius:12, background:saved?'#10B981':'#6366F1', color:'#fff', border:'none', cursor:'pointer', transition:'background 0.3s' }}>
          {saved?<><Check size={15}/>Saved!</>:<><Download size={15}/>Save Settings</>}
        </button>
      </div>
    </div>
  );
}

// ─── LAYOUT ────────────────────────────────────────────────────────────────────
function Sidebar({ collapsed, onCollapse, view, onNav, t, alertCount }) {
  return (
    <div style={{ width:collapsed?64:232, minWidth:collapsed?64:232, height:'100vh', background:t.sidebarBg, borderRight:`1px solid ${t.sidebarBorder}`, display:'flex', flexDirection:'column', transition:'width 0.25s ease, min-width 0.25s ease', flexShrink:0, overflow:'hidden', zIndex:10 }}>
      <div style={{ padding:collapsed?'18px 0':'18px 20px', display:'flex', alignItems:'center', gap:10, justifyContent:collapsed?'center':'flex-start', borderBottom:`1px solid ${t.sidebarBorder}`, minHeight:60 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg, #6366F1, #22D3EE)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Zap size={16} color="#fff" fill="#fff"/>
        </div>
        {!collapsed && (
          <span style={{ fontFamily:'var(--font-syne), sans-serif', fontSize:17, fontWeight:800, background:'linear-gradient(135deg, #6366F1, #22D3EE)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', whiteSpace:'nowrap' }}>
            AetherHub
          </span>
        )}
      </div>
      <nav style={{ flex:1, padding:'12px 8px', overflowY:'auto' }}>
        {NAV.map(item => {
          const active = view===item.id;
          const badge  = item.id==='alerts' && alertCount>0 ? alertCount : null;
          return (
            <button key={item.id} onClick={() => onNav(item.id)} title={collapsed?item.label:undefined}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:collapsed?'10px 0':'10px 12px', justifyContent:collapsed?'center':'flex-start', borderRadius:12, border:'none', cursor:'pointer', marginBottom:2, background:active?'rgba(99,102,241,0.12)':'transparent', color:active?'#6366F1':t.textSub, position:'relative', transition:'background 0.2s, color 0.2s' }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background=t.glass; e.currentTarget.style.color=t.text; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color=t.textSub; } }}>
              {active && <div style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)', width:3, height:20, borderRadius:'0 3px 3px 0', background:'#6366F1' }}/>}
              <span style={{ flexShrink:0 }}>{item.icon}</span>
              {!collapsed && <span style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap' }}>{item.label}</span>}
              {badge && !collapsed && <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:5, background:'rgba(239,68,68,0.15)', color:'#EF4444' }}>{badge}</span>}
              {badge && collapsed && <div style={{ position:'absolute', top:7, right:9, width:7, height:7, borderRadius:'50%', background:'#EF4444' }}/>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding:'12px 8px', borderTop:`1px solid ${t.sidebarBorder}` }}>
        <button onClick={() => onCollapse(!collapsed)}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:collapsed?'center':'space-between', padding:collapsed?'9px 0':'9px 12px', borderRadius:12, border:'none', cursor:'pointer', background:t.glass, color:t.textSub }}>
          {!collapsed && <span style={{ fontSize:12, fontWeight:600 }}>Collapse</span>}
          {collapsed?<ChevronRight size={16}/>:<ChevronLeft size={16}/>}
        </button>
      </div>
    </div>
  );
}

function TopBar({ view, dark, onDark, t }) {
  const [showSearch, setShowSearch] = useState(false);
  const [query,      setQuery]      = useState('');
  return (
    <div style={{ height:56, background:t.surface, borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', paddingLeft:24, paddingRight:20, gap:12, flexShrink:0 }}>
      <h2 style={{ fontFamily:'var(--font-syne), sans-serif', fontSize:16, fontWeight:800, color:t.text, margin:0, flex:1 }}>{VIEW_LABELS[view]||'Dashboard'}</h2>
      {showSearch && (
        <div style={{ position:'relative', flex:'0 0 280px' }}>
          <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:t.textSub }}/>
          <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Escape'&&setShowSearch(false)}
            placeholder="Search everything…"
            style={{ width:'100%', paddingLeft:32, paddingRight:30, paddingTop:8, paddingBottom:8, borderRadius:10, border:`1px solid ${t.borderMid}`, background:t.glass, color:t.text, fontSize:12, outline:'none' }}/>
          {query && <button onClick={() => setQuery('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:t.textSub }}><X size={11}/></button>}
        </div>
      )}
      <button onClick={() => setShowSearch(s=>!s)}
        style={{ padding:8, borderRadius:9, border:`1px solid ${showSearch?'#6366F1':t.border}`, background:showSearch?'rgba(99,102,241,0.1)':t.glass, color:showSearch?'#6366F1':t.textSub, cursor:'pointer', display:'flex' }}>
        <Search size={15}/>
      </button>
      <button onClick={onDark}
        style={{ padding:8, borderRadius:9, border:`1px solid ${t.border}`, background:t.glass, color:t.textSub, cursor:'pointer', display:'flex' }}>
        {dark?<Sun size={15}/>:<Moon size={15}/>}
      </button>
      <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg, #6366F1, #22D3EE)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', flexShrink:0 }}>A</div>
    </div>
  );
}

function OnboardingTour({ onClose, onNav, t }) {
  const [step, setStep] = useState(0);
  const steps = [
    { icon:<Zap size={32} color="#6366F1"/>,         title:'Welcome to AetherHub',    desc:'Your elite social intelligence command center. Track, analyze, and grow your presence across LinkedIn, X, Instagram, YouTube, and TikTok — from one premium dashboard.' },
    { icon:<LayoutDashboard size={32} color="#22D3EE"/>,title:'Executive Dashboard',  desc:'AI-powered morning briefings, live KPI cards with sparklines, trending heat maps, and top signals from your entire network — at a glance.' },
    { icon:<Brain size={32} color="#F0609E"/>,        title:'AI Intelligence Briefs',  desc:"Gemini-powered analysis of your inner circle's content. Know who to engage, what to post, and which trends to ride — before the crowd does." },
    { icon:<TrendingUp size={32} color="#10B981"/>,   title:'Trending & Discovery',    desc:'Real-time trending topics across all platforms, sorted by velocity. Spot viral opportunities before they peak.' },
    { icon:<Rocket size={32} color="#F59E0B"/>,       title:'Ready to Launch',         desc:'Add GROQ_API_KEY (free) or GOOGLE_AI_KEY in Vercel → Settings → Environment Variables to activate AI briefs. Then head to Sources to add your inner circle.' },
  ];
  const s = steps[step];
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(16px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:460, borderRadius:24, background:t.surface, border:'1px solid rgba(99,102,241,0.3)', overflow:'hidden', boxShadow:'0 0 80px rgba(99,102,241,0.2)' }}>
        <div style={{ height:3, background:t.border }}>
          <div style={{ height:3, background:'linear-gradient(90deg, #6366F1, #22D3EE)', width:`${((step+1)/steps.length)*100}%`, transition:'width 0.4s ease' }}/>
        </div>
        <div style={{ padding:36, textAlign:'center' }}>
          <div style={{ marginBottom:20 }}>{s.icon}</div>
          <h2 style={{ fontFamily:'var(--font-syne), sans-serif', fontSize:22, fontWeight:800, color:t.text, marginBottom:10 }}>{s.title}</h2>
          <p style={{ fontSize:14, lineHeight:1.7, color:t.textSub, marginBottom:28 }}>{s.desc}</p>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            {step>0 && (
              <button onClick={() => setStep(s=>s-1)}
                style={{ padding:'10px 20px', borderRadius:12, border:`1px solid ${t.border}`, background:t.glass, color:t.textSub, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                Back
              </button>
            )}
            <button onClick={() => { if (step<steps.length-1) setStep(s=>s+1); else { onClose(); onNav('dashboard'); } }}
              style={{ padding:'10px 28px', borderRadius:12, border:'none', background:'linear-gradient(135deg, #6366F1, #22D3EE)', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, boxShadow:'0 4px 20px rgba(99,102,241,0.4)' }}>
              {step<steps.length-1?'Next':'Get Started →'}
            </button>
          </div>
          <button onClick={onClose} style={{ marginTop:14, fontSize:11, color:t.textMuted, background:'none', border:'none', cursor:'pointer' }}>Skip tour</button>
        </div>
        <div style={{ display:'flex', gap:5, justifyContent:'center', paddingBottom:16 }}>
          {steps.map((_,i) => <div key={i} style={{ width:i===step?20:6, height:6, borderRadius:3, background:i===step?'#6366F1':t.border, transition:'width 0.3s' }}/>)}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function AetherHub() {
  const [view,       setView]       = useState('dashboard');
  const [collapsed,  setCollapsed]  = useState(false);
  const [dark,       setDark]       = useState(true);
  const [circle,     setCircle]     = useState(DEFAULT_CIRCLE);
  const [onboarding, setOnboarding] = useState(() => {
    try { return !localStorage.getItem('aether_onboarded'); } catch { return true; }
  });

  const t = dark ? T.dark : T.light;
  const unreadAlerts = ALERTS.filter(a => !a.read).length;

  const closeOnboarding = () => {
    setOnboarding(false);
    try { localStorage.setItem('aether_onboarded', '1'); } catch {}
  };

  return (
    <div style={{ display:'flex', height:'100vh', background:t.bg, color:t.text, fontFamily:"var(--font-inter), -apple-system, sans-serif", overflow:'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        * { box-sizing: border-box; }
      `}</style>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} view={view} onNav={setView} t={t} alertCount={unreadAlerts}/>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <TopBar view={view} dark={dark} onDark={() => setDark(d=>!d)} t={t}/>
        <main style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>
          {view==='dashboard'    && <DashboardView    t={t} onNav={setView}/>}
          {view==='sources'      && <SourcesView      t={t} circle={circle} setCircle={setCircle}/>}
          {view==='intelligence' && <IntelligenceView t={t} circle={circle}/>}
          {view==='trending'     && <TrendingView     t={t}/>}
          {view==='content'      && <ContentView      t={t} circle={circle}/>}
          {view==='alerts'       && <AlertsView       t={t}/>}
          {view==='growth'       && <GrowthView       t={t}/>}
          {view==='settings'     && <SettingsView     t={t} dark={dark} onDark={() => setDark(d=>!d)}/>}
        </main>
      </div>
      {onboarding && <OnboardingTour onClose={closeOnboarding} onNav={setView} t={t}/>}
    </div>
  );
}
