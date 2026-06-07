'use client';
// AetherHub v2.0 — Elite Trend Intelligence & Content Discovery Platform

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Sun, Moon, Zap, Bookmark, BookmarkCheck, Plus, Trash2, X,
  Sparkles, RefreshCw, Brain, Hash, Clock, ArrowUpRight, ArrowDownRight,
  Activity, AlertTriangle, CheckCircle, Info, Target, Rocket, Download,
  Key, Palette, Star, Flame, BellRing, Check, Bell, Settings, TrendingUp,
  BarChart2, FileText, Link, Copy, ChevronRight, Globe, Eye, Users,
  Heart, Filter, Menu, Compass, MoreHorizontal, Play, BookOpen, Layers,
} from 'lucide-react';

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  dark: {
    bg:'#06060F', surface:'#0B0B1A', raised:'#0F0F26', card:'#0D0D20',
    border:'rgba(255,255,255,0.05)', borderMid:'rgba(255,255,255,0.09)', borderHigh:'rgba(255,255,255,0.16)',
    text:'#EAEAFF', textSub:'#5C5C80', textMuted:'#21213F',
    glass:'rgba(255,255,255,0.025)', glassBorder:'rgba(255,255,255,0.06)',
    navBg:'rgba(6,6,15,0.9)',
    accent:'#6366F1', accentSub:'rgba(99,102,241,0.12)', accentBorder:'rgba(99,102,241,0.28)',
  },
  light: {
    bg:'#ECEEF8', surface:'#FFFFFF', raised:'#F4F4FC', card:'#FFFFFF',
    border:'rgba(0,0,0,0.055)', borderMid:'rgba(0,0,0,0.09)', borderHigh:'rgba(0,0,0,0.15)',
    text:'#0D0D1E', textSub:'#585878', textMuted:'#ABABCB',
    glass:'rgba(0,0,0,0.015)', glassBorder:'rgba(0,0,0,0.05)',
    navBg:'rgba(236,238,248,0.92)',
    accent:'#6366F1', accentSub:'rgba(99,102,241,0.08)', accentBorder:'rgba(99,102,241,0.22)',
  },
};

// ─── PLATFORM CONFIG ──────────────────────────────────────────────────────────
const PLAT = {
  LinkedIn:  { color:'#2D88FF', glow:'rgba(45,136,255,0.22)',  bg:'rgba(45,136,255,0.07)',  border:'rgba(45,136,255,0.18)',  icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
  X:         { color:'#E8EAF0', glow:'rgba(232,234,240,0.12)', bg:'rgba(232,234,240,0.05)', border:'rgba(232,234,240,0.12)', icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 5.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  Instagram: { color:'#F0609E', glow:'rgba(240,96,158,0.22)',  bg:'rgba(240,96,158,0.07)',  border:'rgba(240,96,158,0.17)', icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg> },
  YouTube:   { color:'#FF4444', glow:'rgba(255,68,68,0.18)',   bg:'rgba(255,68,68,0.06)',   border:'rgba(255,68,68,0.16)',  icon:<svg width="14" height="10" viewBox="0 0 24 17" fill="currentColor"><path d="M23.495 2.205a3.02 3.02 0 0 0-2.122-2.136C19.505 0 12 0 12 0s-7.505 0-9.374.069A3.02 3.02 0 0 0 .505 2.205 31.247 31.247 0 0 0 0 8.465a31.247 31.247 0 0 0 .505 6.26 3.02 3.02 0 0 0 2.121 2.136C4.495 17 12 17 12 17s7.505 0 9.373-.069a3.02 3.02 0 0 0 2.122-2.136A31.247 31.247 0 0 0 24 8.465a31.247 31.247 0 0 0-.505-6.26zM9.609 12.093V4.837l6.264 3.628-6.264 3.628z"/></svg> },
  TikTok:    { color:'#69C9D0', glow:'rgba(105,201,208,0.18)', bg:'rgba(105,201,208,0.06)', border:'rgba(105,201,208,0.16)',icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.94a8.24 8.24 0 0 0 4.83 1.55V7.04a4.85 4.85 0 0 1-1.06-.35z"/></svg> },
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
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
  { id:'a1', sev:'critical', msg:'@lexfridman post gaining +890% velocity on YouTube — viral opportunity window open now', time:'2m ago',  plat:'YouTube',  read:false },
  { id:'a2', sev:'high',     msg:'Keyword "AI strategy" spiking +61% on X — 22.8K mentions in last hour',                time:'8m ago',  plat:'X',        read:false },
  { id:'a3', sev:'high',     msg:'Follower growth rate up 18.2% vs 7-day average — maintain current posting cadence',    time:'15m ago', plat:'all',      read:false },
  { id:'a4', sev:'medium',   msg:'Sentiment dip detected on Instagram (-3pts) — monitor comments on recent posts',       time:'1h ago',  plat:'Instagram',read:true  },
  { id:'a5', sev:'medium',   msg:'#BuildInPublic trending +44% on X — consider engaging with this hashtag today',        time:'2h ago',  plat:'X',        read:true  },
  { id:'a6', sev:'low',      msg:'LinkedIn engagement rate above baseline for the 5th consecutive day',                  time:'3h ago',  plat:'LinkedIn', read:true  },
];

const CONTENT_IDEAS = [
  { id:'ci1', hook:'Thread: 5 AI tools that replaced a full-time hire for me in 2025',  plat:'X',         trend:'#AIProductivity', score:94 },
  { id:'ci2', hook:'Why I turned down $2M in VC and built to $1M ARR alone instead',   plat:'LinkedIn',  trend:'#IndieHacker',    score:91 },
  { id:'ci3', hook:'POV: Day 1 vs Day 365 of building in public — what changed',       plat:'Instagram', trend:'#BuildInPublic',  score:88 },
  { id:'ci4', hook:"I analyzed 100 viral creator posts. Here's the single pattern",    plat:'YouTube',   trend:'#CreatorEconomy', score:85 },
  { id:'ci5', hook:'Uncomfortable truth about personal brand that nobody talks about', plat:'TikTok',    trend:'#ForYouPage',     score:82 },
];

// ─── NEW DATA ─────────────────────────────────────────────────────────────────
const TOPIC_AREAS = [
  { id:'ai',      label:'AI & Technology',    icon:'🤖', color:'#6366F1', mentions:847,  delta:'+31%', pos:true,  keywords:['AI','AGI','OpenAI','productivity','technology','machine'] },
  { id:'biz',     label:'Business & Strategy', icon:'💼', color:'#22D3EE', mentions:423,  delta:'+18%', pos:true,  keywords:['founders','startups','growth','SaaS','revenue','strategy'] },
  { id:'creator', label:'Creator Economy',    icon:'🎨', color:'#F0609E', mentions:612,  delta:'+44%', pos:true,  keywords:['creator','content','viral','brand','reel','audience'] },
  { id:'finance', label:'Finance & Markets',  icon:'📈', color:'#10B981', mentions:289,  delta:'+9%',  pos:true,  keywords:['investing','market','crypto','money','stocks','finance'] },
  { id:'sports',  label:'Sports & Culture',   icon:'🏆', color:'#F59E0B', mentions:156,  delta:'+7%',  pos:true,  keywords:['sports','NFL','NBA','football','basketball','culture'] },
];

const KEYWORD_TRENDS = {
  football: [{ tag:'#CollegeFootball',v:'89.2K',d:'+44%',plat:'X' },{ tag:'#NFLDraft',v:'41.3K',d:'+28%',plat:'X' },{ tag:'#SEC',v:'23.1K',d:'+19%',plat:'X' },{ tag:'#CFB',v:'18.7K',d:'+33%',plat:'YouTube' }],
  kentucky: [{ tag:'#BigBlueNation',v:'12.4K',d:'+67%',plat:'X' },{ tag:'#Wildcats',v:'8.9K',d:'+42%',plat:'Instagram' },{ tag:'#SEC',v:'23.1K',d:'+19%',plat:'X' },{ tag:'#KentuckyFootball',v:'5.2K',d:'+89%',plat:'X' }],
  ai:       [{ tag:'#AIStrategy',v:'22.8K',d:'+61%',plat:'LinkedIn' },{ tag:'#ChatGPT',v:'45.1K',d:'+18%',plat:'X' },{ tag:'#MachineLearning',v:'31.2K',d:'+24%',plat:'YouTube' },{ tag:'#BuildWithAI',v:'9.8K',d:'+52%',plat:'X' }],
  crypto:   [{ tag:'#Bitcoin',v:'112.4K',d:'+18%',plat:'X' },{ tag:'#Ethereum',v:'67.2K',d:'+12%',plat:'X' },{ tag:'#DeFi',v:'23.1K',d:'+29%',plat:'X' },{ tag:'#Web3',v:'18.9K',d:'+14%',plat:'LinkedIn' }],
  startup:  [{ tag:'#BuildInPublic',v:'31.2K',d:'+44%',plat:'X' },{ tag:'#IndieHacker',v:'9.7K',d:'+13%',plat:'X' },{ tag:'#SaaS',v:'14.1K',d:'+22%',plat:'LinkedIn' },{ tag:'#Founder',v:'19.3K',d:'+16%',plat:'LinkedIn' }],
  nba:      [{ tag:'#NBA',v:'67.2K',d:'+22%',plat:'X' },{ tag:'#NBAPlayoffs',v:'41.3K',d:'+38%',plat:'X' },{ tag:'#Basketball',v:'28.1K',d:'+14%',plat:'Instagram' }],
  nfl:      [{ tag:'#NFL',v:'89.2K',d:'+18%',plat:'X' },{ tag:'#NFLDraft',v:'41.3K',d:'+28%',plat:'X' },{ tag:'#SuperBowl',v:'23.1K',d:'+12%',plat:'Instagram' }],
  creator:  [{ tag:'#CreatorEconomy',v:'18.4K',d:'+27%',plat:'X' },{ tag:'#ContentCreator',v:'28.1K',d:'+22%',plat:'Instagram' },{ tag:'#ForYouPage',v:'89.2K',d:'+72%',plat:'TikTok' },{ tag:'#BuildInPublic',v:'31.2K',d:'+44%',plat:'X' }],
  sports:   [{ tag:'#Sports',v:'44.1K',d:'+12%',plat:'X' },{ tag:'#NFL',v:'89.2K',d:'+18%',plat:'X' },{ tag:'#NBA',v:'67.2K',d:'+22%',plat:'X' },{ tag:'#CollegeFootball',v:'89.2K',d:'+44%',plat:'X' }],
  tech:     [{ tag:'#TechNews',v:'31.2K',d:'+19%',plat:'X' },{ tag:'#AIStrategy',v:'22.8K',d:'+61%',plat:'LinkedIn' },{ tag:'#TechReview',v:'8.6K',d:'+7%',plat:'YouTube' },{ tag:'#BuildWithAI',v:'9.8K',d:'+52%',plat:'X' }],
};

const RECOMMENDED = [
  { id:'r1', title:"Sam Altman on AGI timelines — 4hr conversation",  platform:'YouTube',  author:'lexfridman',     stat:'312K views',     signal:'high'  },
  { id:'r2', title:"$2.1M ARR with no employees — full breakdown",     platform:'X',        author:'levelsio',       stat:'987 reposts',    signal:'high'  },
  { id:'r3', title:"The Science of Deep Focus — neurochemistry guide", platform:'YouTube',  author:'andrewhuberman', stat:'48K views',      signal:'rising'},
  { id:'r4', title:"Microsoft AI workflow — what's actually changing", platform:'LinkedIn', author:'satyanadella',   stat:'4.2K reactions', signal:'high'  },
  { id:'r5', title:"Founder to $1M ARR — the uncomfortable truth",    platform:'LinkedIn', author:'reidhoffman',    stat:'2.8K reactions', signal:'rising'},
];

const DEFAULT_CIRCLE = {
  LinkedIn:  ['satyanadella','reidhoffman','garyvee','levelsio'],
  X:         ['sama','paulg','levelsio','naval'],
  Instagram: ['visualcreator','alexhormozi','mrbeast'],
  YouTube:   ['andrewhuberman','lexfridman','techreviewer'],
  TikTok:    ['khaby.lame','charlidamelio'],
};

const NAV_TABS = [
  { id:'feed',         label:'Feed',         icon:<Zap size={16}/>         },
  { id:'discover',     label:'Discover',     icon:<Compass size={16}/>     },
  { id:'intelligence', label:'Intelligence', icon:<Brain size={16}/>       },
  { id:'studio',       label:'Studio',       icon:<FileText size={16}/>    },
  { id:'alerts',       label:'Alerts',       icon:<Bell size={16}/>        },
  { id:'sources',      label:'Sources',      icon:<Globe size={16}/>       },
  { id:'settings',     label:'Settings',     icon:<Settings size={16}/>    },
];

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function useWindowSize() {
  const [w, setW] = useState(1280);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return w;
}

function fmt(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
  return String(n);
}

function sigColor(sig) {
  if (sig==='high')   return { c:'#10B981', bg:'rgba(16,185,129,0.12)',  label:'HIGH'    };
  if (sig==='rising') return { c:'#F59E0B', bg:'rgba(245,158,11,0.12)',  label:'RISING'  };
  return                     { c:'#52525B', bg:'rgba(82,82,91,0.1)',     label:'MODERATE'};
}

function searchTrending(query) {
  if (!query.trim()) return null;
  const q = query.toLowerCase();
  const matchKey = Object.keys(KEYWORD_TRENDS).find(k => q.includes(k) || k.includes(q.split(' ')[0]));
  if (matchKey) return KEYWORD_TRENDS[matchKey];
  const tagMatches = Object.values(TRENDING).flat().filter(t => t.tag.toLowerCase().includes(q));
  if (tagMatches.length) return tagMatches;
  const bwMatches = Object.entries(MOCK_POSTS).flatMap(([plat, posts]) =>
    posts.filter(p => p.content.toLowerCase().includes(q) || p.bw?.some(w => w.toLowerCase().includes(q)))
      .flatMap(p => (p.bw||[]).map(w => ({ tag:`#${w}`, v:'—', d:'trending', plat })))
  );
  return bwMatches.length ? [...new Map(bwMatches.map(x=>[x.tag,x])).values()] : [];
}

function postsForFilter(filter) {
  if (!filter) return Object.entries(MOCK_POSTS).flatMap(([plat,ps])=>ps.map(p=>({...p,platform:plat})));
  const f = filter.replace('#','').toLowerCase();
  return Object.entries(MOCK_POSTS).flatMap(([plat,ps]) =>
    ps.filter(p => p.content.toLowerCase().includes(f) || p.bw?.some(w=>w.toLowerCase().includes(f)) || p.author.toLowerCase().includes(f))
      .map(p=>({...p,platform:plat}))
  );
}

// ─── BASE COMPONENTS ──────────────────────────────────────────────────────────
function PostCard({ post, platform, t, bookmarks, onBookmark, compact }) {
  const cfg = PLAT[platform] || PLAT.LinkedIn;
  const sig = sigColor(post.signal);
  const bk  = bookmarks?.some(b => b.id === post.id);
  return (
    <div style={{ borderRadius:14, padding:compact?'10px 12px':'14px 16px', border:`1px solid ${t.border}`, background:t.glass, marginBottom:7, transition:'all 0.18s', cursor:'default' }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor=cfg.border; e.currentTarget.style.background=t.raised; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor=t.border; e.currentTarget.style.background=t.glass; }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:30, height:30, borderRadius:9, background:cfg.bg, border:`1px solid ${cfg.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:cfg.color, flexShrink:0 }}>
            {post.author[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:t.text, display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ color:cfg.color }}>{cfg.icon}</span>@{post.author}
            </div>
            <div style={{ fontSize:10, color:t.textSub, display:'flex', alignItems:'center', gap:3 }}>
              <Clock size={9}/>{post.time} · <span style={{ color:cfg.color }}>{post.eng}</span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ fontSize:9, fontWeight:800, padding:'2px 6px', borderRadius:5, background:sig.bg, color:sig.c }}>{sig.label}</span>
          <span style={{ fontSize:9, fontWeight:700, color:'#10B981' }}>{post.velocity}</span>
          {onBookmark && (
            <button onClick={()=>onBookmark(post,platform)} style={{ background:'none', border:'none', cursor:'pointer', color:bk?'#F59E0B':t.textSub, padding:2 }}>
              {bk?<BookmarkCheck size={12}/>:<Bookmark size={12}/>}
            </button>
          )}
        </div>
      </div>
      <p style={{ fontSize:12, lineHeight:1.6, color:t.text, marginBottom:7 }}>
        {compact ? post.content.slice(0,100)+'…' : post.content.slice(0,180)+(post.content.length>180?'…':'')}
      </p>
      <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
        {post.bw?.slice(0,3).map((w,i)=>(
          <span key={i} style={{ fontSize:10, padding:'2px 7px', borderRadius:5, fontWeight:600, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>{w}</span>
        ))}
      </div>
    </div>
  );
}

function TopicCard({ topic, t, active, onClick }) {
  return (
    <div onClick={onClick} style={{ borderRadius:16, padding:'15px 16px', background:active?`${topic.color}14`:t.card, border:`1px solid ${active?topic.color+'55':t.border}`, cursor:'pointer', transition:'all 0.18s', position:'relative', overflow:'hidden' }}
      onMouseEnter={e=>{ if (!active) e.currentTarget.style.borderColor=topic.color+'40'; }}
      onMouseLeave={e=>{ if (!active) e.currentTarget.style.borderColor=t.border; }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, ${topic.color}, transparent)`, opacity:active?1:0.5 }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:7 }}>
        <span style={{ fontSize:18 }}>{topic.icon}</span>
        <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:5, background:'rgba(16,185,129,0.12)', color:'#10B981', display:'flex', alignItems:'center', gap:2 }}>
          <ArrowUpRight size={9}/>{topic.delta}
        </span>
      </div>
      <div style={{ fontSize:20, fontWeight:800, color:t.text, letterSpacing:'-0.02em', marginBottom:2 }}>{fmt(topic.mentions)}</div>
      <div style={{ fontSize:11, color:t.textSub, fontWeight:600 }}>{topic.label}</div>
    </div>
  );
}

// ─── AI BRIEF ─────────────────────────────────────────────────────────────────
function AIBriefPanel({ platform, t }) {
  const [brief,   setBrief]   = useState('');
  const [loading, setLoading] = useState(false);
  const [ts,      setTs]      = useState(null);
  const prevPlat = useRef(null);
  const cfg = PLAT[platform] || {};

  const generate = useCallback(async () => {
    setLoading(true); setBrief('');
    const posts = MOCK_POSTS[platform] || [];
    const summary = posts.map((p,i)=>`${i+1}. @${p.author}: "${p.content.slice(0,100)}" — Signal: ${p.signal}, Velocity: ${p.velocity}`).join('\n');
    const prompt = `Social intelligence analyst. Platform: ${platform}.\n\nTop posts:\n${summary}\n\nWrite exactly 3 bullet points (use • character):\n• Dominant narrative on ${platform} right now\n• Which account to engage TODAY and exactly why\n• One concrete 24-hour action\n\nSharp, chief-of-staff tone. No fluff.`;
    try {
      const r = await fetch('/api/brief', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, type:'brief' }) });
      const d = await r.json();
      setBrief(d.text || 'Unable to generate brief.');
    } catch { setBrief('Connection failed. Add an API key in Settings → Environment Variables.'); }
    setLoading(false);
    setTs(new Date().toLocaleTimeString([],{ hour:'2-digit', minute:'2-digit' }));
  }, [platform]);

  useEffect(() => {
    if (prevPlat.current !== platform) { prevPlat.current = platform; generate(); }
  }, [platform, generate]);

  return (
    <div style={{ background:cfg.bg||t.glass, border:`1px solid ${cfg.border||t.glassBorder}`, borderRadius:16, padding:16, boxShadow:cfg.glow?`0 0 28px ${cfg.glow}`:'none' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <Brain size={13} style={{ color:cfg.color||'#6366F1' }}/>
          <span style={{ fontSize:11, fontWeight:700, color:cfg.color||'#6366F1', textTransform:'uppercase', letterSpacing:'0.04em' }}>AI Brief · {platform}</span>
          {ts && <span style={{ fontSize:10, color:t.textSub }}>{ts}</span>}
        </div>
        <button onClick={generate} disabled={loading} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:8, background:cfg.color||'#6366F1', color:platform==='X'?'#0d0d12':'#fff', border:'none', cursor:'pointer', opacity:loading?0.6:1 }}>
          {loading?<RefreshCw size={10} style={{ animation:'spin 1s linear infinite' }}/>:<Sparkles size={10}/>}
          {loading?'Thinking…':'Refresh'}
        </button>
      </div>
      {loading && [85,70,55].map((w,i)=><div key={i} style={{ height:7, borderRadius:4, background:t.border, width:`${w}%`, marginBottom:6, animation:'pulse 1.5s ease-in-out infinite' }}/>)}
      {!loading && brief && (
        <div style={{ fontSize:11, lineHeight:1.75 }}>
          {brief.split('\n').filter(l=>l.trim()).map((line,i)=>(
            <div key={i} style={{ display:'flex', gap:7, marginBottom:5 }}>
              {line.startsWith('•')&&<span style={{ color:cfg.color||'#6366F1', flexShrink:0 }}>•</span>}
              <span style={{ color:line.startsWith('•')?t.text:t.textSub }}>{line.replace(/^•\s*/,'')}</span>
            </div>
          ))}
        </div>
      )}
      {!loading && !brief && <p style={{ fontSize:11, color:t.textSub }}>Generating {platform} intelligence brief…</p>}
    </div>
  );
}

// ─── SUMMARIZE PANEL ──────────────────────────────────────────────────────────
function SummarizePanel({ t }) {
  const [input,   setInput]   = useState('');
  const [result,  setResult]  = useState('');
  const [loading, setLoading] = useState(false);
  const [copied,  setCopied]  = useState(false);

  const run = async () => {
    if (!input.trim()) return;
    setLoading(true); setResult('');
    const prompt = `Analyze this content for a social media strategist:\n\n${input.slice(0,2500)}\n\nRespond with:\n• Main Topic: one sentence\n• Key Takeaways: 3 sharp bullet points\n• Trend Signal: rising, plateauing, or declining? Why?\n• Recommended Action: one concrete next step\n\nBe punchy. Executive-summary level.`;
    try {
      const r = await fetch('/api/brief', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, type:'brief' }) });
      const d = await r.json();
      setResult(d.text || 'Unable to analyze. Try again.');
    } catch { setResult('Connection failed. Check your API key in Settings.'); }
    setLoading(false);
  };

  const copy = () => { navigator.clipboard?.writeText(result); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  return (
    <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:18, padding:22 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Brain size={16} style={{ color:'#6366F1' }}/>
        </div>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:t.text }}>AI Source Summarizer</div>
          <div style={{ fontSize:11, color:t.textSub }}>Paste any URL, article, tweet, or text — get instant intelligence</div>
        </div>
      </div>
      <textarea value={input} onChange={e=>setInput(e.target.value)}
        placeholder={"Paste a URL, article, post, or any text here…\n\nExamples:\n• https://techcrunch.com/2025/...\n• Paste raw article or LinkedIn post text\n• A tweet thread or YouTube description"}
        style={{ width:'100%', height:140, resize:'vertical', padding:'12px 14px', borderRadius:12, border:`1px solid ${input?t.borderMid:t.border}`, background:t.glass, color:t.text, fontSize:12, lineHeight:1.65, outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'border-color 0.2s' }}
        onFocus={e=>e.target.style.borderColor=t.borderMid}
        onBlur={e=>e.target.style.borderColor=input?t.borderMid:t.border}
      />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
        <span style={{ fontSize:10, color:t.textMuted }}>{input.length.toLocaleString()} chars</span>
        <div style={{ display:'flex', gap:8 }}>
          {input && <button onClick={()=>{setInput('');setResult('');}} style={{ fontSize:11, padding:'7px 14px', borderRadius:10, border:`1px solid ${t.border}`, background:t.glass, color:t.textSub, cursor:'pointer' }}>Clear</button>}
          <button onClick={run} disabled={loading||!input.trim()}
            style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'8px 20px', borderRadius:10, background:'linear-gradient(135deg,#6366F1,#22D3EE)', color:'#fff', border:'none', cursor:loading||!input.trim()?'not-allowed':'pointer', opacity:!input.trim()?0.45:1 }}>
            {loading?<RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }}/>:<Sparkles size={13}/>}
            {loading?'Analyzing…':'Analyze'}
          </button>
        </div>
      </div>
      {result && (
        <div style={{ marginTop:14, padding:16, borderRadius:14, background:t.glass, border:'1px solid rgba(99,102,241,0.2)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#6366F1', textTransform:'uppercase', letterSpacing:'0.04em' }}>Intelligence Brief</span>
            <button onClick={copy} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, padding:'3px 8px', borderRadius:7, border:`1px solid ${t.border}`, background:t.glass, color:t.textSub, cursor:'pointer' }}>
              {copied?<Check size={10}/>:<Copy size={10}/>}{copied?'Copied':'Copy'}
            </button>
          </div>
          <div style={{ fontSize:11, lineHeight:1.8 }}>
            {result.split('\n').filter(l=>l.trim()).map((line,i)=>(
              <div key={i} style={{ display:'flex', gap:7, marginBottom:5 }}>
                {line.startsWith('•')&&<span style={{ color:'#6366F1', flexShrink:0 }}>•</span>}
                <span style={{ color:line.startsWith('•')?t.text:t.textSub }}>{line.replace(/^•\s*/,'')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MORNING DIGEST ───────────────────────────────────────────────────────────
function MorningDigest({ t }) {
  const [bullets, setBullets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ts,      setTs]      = useState(null);
  const done = useRef(false);

  const generate = useCallback(async () => {
    setLoading(true); setBullets([]);
    const summaries = Object.entries(MOCK_POSTS).map(([plat,posts])=>{
      const top = posts[0];
      return `${plat}: @${top.author} — "${top.content.slice(0,80)}" (${top.signal} signal, ${top.velocity})`;
    }).join('\n');
    const prompt = `Morning briefing. Top posts:\n\n${summaries}\n\nWrite exactly 5 bullet points — one per platform:\n• [Platform]: one sharp sentence on what's dominating\n\nPunchy. Executive summary. Each bullet under 20 words.`;
    try {
      const r = await fetch('/api/brief', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, type:'digest' }) });
      const d = await r.json();
      setBullets((d.text||'').split('\n').filter(l=>l.trim()&&l.includes('•')));
    } catch { setBullets(['• Unable to generate digest. Check your API configuration.']); }
    setLoading(false);
    setTs(new Date().toLocaleTimeString([],{ hour:'2-digit', minute:'2-digit' }));
  }, []);

  useEffect(()=>{ if (!done.current) { done.current=true; generate(); } }, [generate]);

  const platColor = { LinkedIn:'#2D88FF', X:'#E8EAF0', Instagram:'#F0609E', YouTube:'#FF4444', TikTok:'#69C9D0' };

  return (
    <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:16, padding:18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#10B981', animation:'pulse 2s ease-in-out infinite' }}/>
          <span style={{ fontSize:11, fontWeight:700, color:'#10B981', letterSpacing:'0.06em', textTransform:'uppercase' }}>Morning Digest</span>
          {ts && <span style={{ fontSize:10, color:t.textSub }}>{ts}</span>}
        </div>
        <button onClick={generate} style={{ fontSize:10, color:t.textSub, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
          <RefreshCw size={10}/>Refresh
        </button>
      </div>
      {loading && [90,75,80,70,65].map((w,i)=><div key={i} style={{ height:7, borderRadius:4, background:t.border, width:`${w}%`, marginBottom:6, animation:'pulse 1.5s ease-in-out infinite' }}/>)}
      {!loading && bullets.map((line,i)=>{
        const clean = line.replace(/^•\s*/,'');
        const plat  = Object.keys(platColor).find(p=>clean.startsWith(p));
        return (
          <div key={i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'flex-start' }}>
            <span style={{ color:plat?platColor[plat]:'#10B981', fontSize:12, flexShrink:0 }}>•</span>
            <span style={{ fontSize:11, lineHeight:1.65, color:t.text }}>{clean}</span>
          </div>
        );
      })}
      {!loading && !bullets.length && <p style={{ fontSize:11, color:t.textSub }}>Loading intelligence…</p>}
    </div>
  );
}

// ─── RIGHT PANEL ──────────────────────────────────────────────────────────────
function RightPanel({ t, activeFilter, setActiveFilter }) {
  const allBuzz = [...new Set(Object.values(MOCK_POSTS).flatMap(p=>p.flatMap(x=>x.bw||[])))];
  const topTrending = Object.entries(TRENDING).flatMap(([plat,items])=>items.map(item=>({...item,plat}))).sort((a,b)=>parseFloat(b.d)-parseFloat(a.d)).slice(0,8);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Trending Now */}
      <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:16, padding:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
          <Flame size={13} style={{ color:'#EF4444' }}/>
          <span style={{ fontSize:11, fontWeight:700, color:t.text, textTransform:'uppercase', letterSpacing:'0.05em' }}>Trending Now</span>
        </div>
        {topTrending.map((item,i)=>{
          const cfg = PLAT[item.plat];
          const isActive = activeFilter===item.tag;
          return (
            <div key={i} onClick={()=>setActiveFilter(isActive?null:item.tag)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid ${t.border}`, cursor:'pointer', transition:'opacity 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.opacity='0.75'}
              onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:10, color:t.textMuted, width:18, textAlign:'center', fontWeight:700 }}>#{i+1}</span>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:isActive?'#818CF8':cfg?.color||t.text }}>{item.tag}</div>
                  <div style={{ fontSize:9, color:t.textSub, display:'flex', alignItems:'center', gap:3 }}>
                    <span style={{ color:cfg?.color }}>{cfg?.icon}</span>{item.v}
                  </div>
                </div>
              </div>
              <span style={{ fontSize:10, fontWeight:700, color:'#10B981' }}>{item.d}</span>
            </div>
          );
        })}
      </div>

      {/* Buzzwords */}
      <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:16, padding:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <Hash size={13} style={{ color:'#6366F1' }}/>
            <span style={{ fontSize:11, fontWeight:700, color:t.text, textTransform:'uppercase', letterSpacing:'0.05em' }}>Buzzwords</span>
          </div>
          {activeFilter && <button onClick={()=>setActiveFilter(null)} style={{ fontSize:9, padding:'2px 7px', borderRadius:5, background:'rgba(99,102,241,0.15)', color:'#818CF8', border:'none', cursor:'pointer' }}>Clear ×</button>}
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {allBuzz.slice(0,18).map((w,i)=>{
            const active = activeFilter===w || activeFilter===`#${w}`;
            return (
              <button key={i} onClick={()=>setActiveFilter(active?null:w)}
                style={{ fontSize:10, padding:'3px 9px', borderRadius:20, fontWeight:600, cursor:'pointer', border:`1px solid ${active?'#6366F1':'rgba(99,102,241,0.2)'}`, background:active?'rgba(99,102,241,0.18)':'rgba(99,102,241,0.05)', color:active?'#A5B4FC':'#818CF8', transition:'all 0.15s' }}>
                {w}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recommended Viewings */}
      <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:16, padding:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
          <Star size={13} style={{ color:'#F59E0B' }}/>
          <span style={{ fontSize:11, fontWeight:700, color:t.text, textTransform:'uppercase', letterSpacing:'0.05em' }}>Recommended</span>
        </div>
        {RECOMMENDED.map(item=>{
          const cfg = PLAT[item.platform];
          const sig = sigColor(item.signal);
          return (
            <div key={item.id} style={{ marginBottom:9, padding:'10px 11px', borderRadius:12, background:t.glass, border:`1px solid ${t.border}`, cursor:'pointer', transition:'all 0.18s' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=cfg?.border||t.borderMid; e.currentTarget.style.background=t.raised; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=t.border; e.currentTarget.style.background=t.glass; }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                <span style={{ color:cfg?.color }}>{cfg?.icon}</span>
                <span style={{ fontSize:9, fontWeight:700, color:cfg?.color }}>{item.platform}</span>
                <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:4, background:sig.bg, color:sig.c, marginLeft:'auto' }}>{sig.label}</span>
              </div>
              <p style={{ fontSize:11, fontWeight:600, color:t.text, lineHeight:1.4, marginBottom:4 }}>{item.title}</p>
              <div style={{ fontSize:10, color:t.textSub }}>@{item.author} · {item.stat}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── VIEWS ────────────────────────────────────────────────────────────────────
function FeedView({ t, activeFilter, setActiveFilter, onNav }) {
  const [bookmarks,   setBookmarks]   = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);
  const [liveStats,   setLiveStats]   = useState({ reach:2410000, mentions:4782, active:31 });

  useEffect(()=>{
    const iv = setInterval(()=>{
      setLiveStats(s=>({
        reach:    s.reach    + Math.floor(Math.random()*50-10),
        mentions: s.mentions + Math.floor(Math.random()*8-2),
        active:   Math.max(20, s.active+Math.floor(Math.random()*6-3)),
      }));
    }, 3500);
    return ()=>clearInterval(iv);
  }, []);

  const toggleBk = (post,plat) => setBookmarks(prev=>prev.some(b=>b.id===post.id)?prev.filter(b=>b.id!==post.id):[...prev,{...post,platform:plat}]);

  const handleTopicClick = (topic) => {
    if (activeTopic===topic.id) { setActiveTopic(null); setActiveFilter(null); }
    else { setActiveTopic(topic.id); setActiveFilter(topic.keywords[0]); }
  };

  const filterKey = activeFilter || (activeTopic ? TOPIC_AREAS.find(x=>x.id===activeTopic)?.keywords[0] : null);
  const filtered  = postsForFilter(filterKey);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {/* Live indicator */}
      <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:10, background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.18)', width:'fit-content' }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#10B981', animation:'pulse 2s ease-in-out infinite' }}/>
        <span style={{ fontSize:11, fontWeight:600, color:'#10B981' }}>LIVE · {fmt(liveStats.reach)} reach · {fmt(liveStats.mentions)} mentions · {liveStats.active} active</span>
      </div>

      {/* Topic cards */}
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:t.textSub, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Your Topics — click to filter</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:10 }}>
          {TOPIC_AREAS.map(topic=>(
            <TopicCard key={topic.id} topic={topic} t={t} active={activeTopic===topic.id} onClick={()=>handleTopicClick(topic)}/>
          ))}
        </div>
      </div>

      {/* Active filter */}
      {filterKey && (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:t.textSub }}>Showing:</span>
          <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#818CF8' }}>{activeFilter||TOPIC_AREAS.find(x=>x.id===activeTopic)?.label}</span>
            <button onClick={()=>{setActiveFilter(null);setActiveTopic(null);}} style={{ background:'none', border:'none', cursor:'pointer', color:'#818CF8', padding:0, display:'flex' }}><X size={11}/></button>
          </div>
          <span style={{ fontSize:11, color:t.textSub }}>{filtered.length} posts</span>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div>
          <MorningDigest t={t}/>
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:t.text, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              <Zap size={13} style={{ color:'#6366F1' }}/>
              {filterKey ? 'Filtered Posts' : 'Top Signals — All Platforms'}
            </div>
            {(filtered.length
              ? filtered
              : Object.entries(MOCK_POSTS).flatMap(([plat,ps])=>ps.slice(0,1).map(p=>({...p,platform:plat})))
            ).slice(0,6).map(post=>(
              <PostCard key={post.id} post={post} platform={post.platform} t={t} bookmarks={bookmarks} onBookmark={toggleBk}/>
            ))}
          </div>
        </div>
        <div>
          {bookmarks.length>0 && (
            <div style={{ marginBottom:14, padding:16, borderRadius:16, background:t.card, border:`1px solid ${t.border}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:t.text, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                <BookmarkCheck size={13} style={{ color:'#F59E0B' }}/>Saved ({bookmarks.length})
              </div>
              {bookmarks.slice(0,3).map(p=><PostCard key={p.id} post={p} platform={p.platform} t={t} bookmarks={bookmarks} onBookmark={toggleBk} compact/>)}
            </div>
          )}
          <div style={{ padding:16, borderRadius:16, background:t.card, border:`1px solid ${t.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:t.text, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
              <Target size={13} style={{ color:'#22D3EE' }}/>Quick Actions
            </div>
            {[
              { label:"Engage @sama's AGI thread — +520% velocity", color:'#6366F1' },
              { label:'Post on LinkedIn 8–10am — peak engagement window', color:'#2D88FF' },
              { label:'Create Reel using #ContentCreator audio trend', color:'#F0609E' },
              { label:'Comment on 5x #BuildInPublic posts today', color:'#22D3EE' },
            ].map((a,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:7, padding:'8px 10px', borderRadius:10, background:t.glass, border:`1px solid ${t.border}` }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:a.color, flexShrink:0, marginTop:4 }}/>
                <span style={{ fontSize:11, lineHeight:1.5, color:t.textSub }}>{a.label}</span>
              </div>
            ))}
            <button onClick={()=>onNav('studio')} style={{ width:'100%', fontSize:11, fontWeight:600, padding:'8px 0', borderRadius:10, background:t.accentSub, color:t.accent, border:`1px solid ${t.accentBorder}`, cursor:'pointer', marginTop:4 }}>
              Open Content Studio →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscoverView({ t, setActiveFilter, onNav }) {
  const [query,      setQuery]      = useState('');
  const [results,    setResults]    = useState(null);
  const [searching,  setSearching]  = useState(false);
  const [activePlat, setActivePlat] = useState('all');
  const inputRef = useRef(null);

  useEffect(()=>{
    if (!query.trim()) { setResults(null); setSearching(false); return; }
    setSearching(true);
    const id = setTimeout(()=>{ setResults(searchTrending(query)); setSearching(false); }, 350);
    return ()=>clearTimeout(id);
  }, [query]);

  const allTrending = Object.entries(TRENDING).flatMap(([plat,items])=>items.map(item=>({...item,plat}))).sort((a,b)=>parseFloat(b.d)-parseFloat(a.d));
  const displayed   = activePlat==='all' ? allTrending : allTrending.filter(x=>x.plat===activePlat);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
      {/* Search */}
      <div style={{ position:'relative' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 18px', borderRadius:14, border:`1px solid ${query?'#6366F1':t.borderMid}`, background:t.card, transition:'all 0.2s', boxShadow:query?'0 0 0 3px rgba(99,102,241,0.1)':'none' }}>
          <Search size={18} style={{ color:query?'#6366F1':t.textSub, flexShrink:0 }}/>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="Search topics, hashtags — e.g. 'kentucky football', 'AI strategy', 'crypto', 'creator'…"
            style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:14, color:t.text, fontFamily:'inherit' }}/>
          {searching && <RefreshCw size={14} style={{ color:t.textSub, animation:'spin 1s linear infinite', flexShrink:0 }}/>}
          {query && !searching && <button onClick={()=>{setQuery('');setResults(null);}} style={{ background:'none', border:'none', cursor:'pointer', color:t.textSub, display:'flex' }}><X size={14}/></button>}
        </div>

        {/* Results dropdown */}
        {results !== null && query && (
          <div style={{ position:'absolute', top:'calc(100% + 8px)', left:0, right:0, borderRadius:14, background:t.surface, border:`1px solid ${t.borderMid}`, boxShadow:'0 20px 60px rgba(0,0,0,0.45)', zIndex:50, padding:18 }}>
            <div style={{ fontSize:11, fontWeight:700, color:t.textSub, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>
              Top trending for &ldquo;{query}&rdquo;
            </div>
            {results.length > 0 ? (
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {results.slice(0,10).map((item,i)=>{
                  const cfg = PLAT[item.plat];
                  return (
                    <button key={i} onClick={()=>{ setActiveFilter(item.tag); setQuery(''); setResults(null); onNav('feed'); }}
                      style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'7px 13px', borderRadius:20, border:`1px solid ${cfg?.border||t.border}`, background:cfg?.bg||t.glass, color:cfg?.color||t.text, cursor:'pointer', transition:'all 0.15s' }}
                      onMouseEnter={e=>e.currentTarget.style.opacity='0.8'}
                      onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                      {cfg?.icon}
                      {item.tag}
                      <span style={{ fontSize:10, color:'#10B981', fontWeight:700 }}>{item.d}</span>
                      {item.v!=='—' && <span style={{ fontSize:10, color:t.textSub }}>{item.v}</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize:12, color:t.textSub }}>No trending topics found for &ldquo;{query}&rdquo;. Try: football, ai, crypto, startup, creator, nba, nfl</p>
            )}
          </div>
        )}
      </div>

      {/* Platform filter pills */}
      <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
        <button onClick={()=>setActivePlat('all')} style={{ fontSize:11, fontWeight:700, padding:'6px 14px', borderRadius:20, cursor:'pointer', border:`1px solid ${activePlat==='all'?'#6366F1':t.border}`, background:activePlat==='all'?'rgba(99,102,241,0.12)':t.glass, color:activePlat==='all'?'#818CF8':t.textSub }}>
          All Platforms
        </button>
        {Object.entries(PLAT).map(([plat,cfg])=>(
          <button key={plat} onClick={()=>setActivePlat(plat)} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'6px 12px', borderRadius:20, cursor:'pointer', border:`1px solid ${activePlat===plat?cfg.color:t.border}`, background:activePlat===plat?cfg.bg:t.glass, color:activePlat===plat?cfg.color:t.textSub }}>
            <span style={{ color:cfg.color }}>{cfg.icon}</span>{plat}
          </button>
        ))}
      </div>

      {/* Trending grid */}
      <div>
        <div style={{ fontSize:12, fontWeight:700, color:t.text, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
          <TrendingUp size={14} style={{ color:'#EF4444' }}/>
          Trending {activePlat==='all'?'Everywhere':`on ${activePlat}`} — click any topic to filter your feed
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:10 }}>
          {displayed.map((item,i)=>{
            const cfg = PLAT[item.plat];
            return (
              <div key={i} onClick={()=>{ setActiveFilter(item.tag); onNav('feed'); }}
                style={{ borderRadius:14, padding:'13px 16px', background:t.card, border:`1px solid ${t.border}`, display:'flex', alignItems:'center', gap:12, cursor:'pointer', transition:'all 0.18s' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=cfg?.border||t.borderMid; e.currentTarget.style.transform='translateY(-1px)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=t.border; e.currentTarget.style.transform='none'; }}>
                <div style={{ fontSize:18, fontWeight:800, color:t.textMuted, width:28, flexShrink:0, textAlign:'center' }}>#{i+1}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                    <span style={{ color:cfg?.color }}>{cfg?.icon}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:cfg?.color||t.text }}>{item.tag}</span>
                  </div>
                  <div style={{ fontSize:10, color:t.textSub }}>{item.v} mentions · <span style={{ fontWeight:700, color:'#10B981' }}>{item.d}</span></div>
                </div>
                <ChevronRight size={13} style={{ color:t.textMuted }}/>
              </div>
            );
          })}
        </div>
      </div>

      {/* Topic exploration */}
      <div>
        <div style={{ fontSize:12, fontWeight:700, color:t.text, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
          <Layers size={14} style={{ color:'#6366F1' }}/>Explore by Topic Area
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10 }}>
          {TOPIC_AREAS.map(topic=>(
            <div key={topic.id} onClick={()=>{ setActiveFilter(topic.keywords[0]); onNav('feed'); }}
              style={{ borderRadius:14, padding:'14px 15px', background:t.card, border:`1px solid ${t.border}`, cursor:'pointer', transition:'all 0.18s', position:'relative', overflow:'hidden' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=topic.color+'55'; e.currentTarget.style.background=`${topic.color}08`; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=t.border; e.currentTarget.style.background=t.card; }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${topic.color},transparent)` }}/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:20 }}>{topic.icon}</span>
                <span style={{ fontSize:10, fontWeight:700, color:'#10B981' }}>{topic.delta}</span>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:t.text, marginBottom:6 }}>{topic.label}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {topic.keywords.slice(0,3).map((kw,i)=>(
                  <span key={i} style={{ fontSize:9, padding:'2px 6px', borderRadius:4, background:`${topic.color}12`, color:topic.color, border:`1px solid ${topic.color}30`, fontWeight:600 }}>{kw}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IntelligenceView({ t }) {
  const [activePlat, setActivePlat] = useState('LinkedIn');
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <SummarizePanel t={t}/>
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        {Object.keys(PLAT).map(plat=>(
          <button key={plat} onClick={()=>setActivePlat(plat)}
            style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:700, padding:'6px 12px', borderRadius:10, cursor:'pointer', border:`1px solid ${activePlat===plat?PLAT[plat].color:t.border}`, background:activePlat===plat?PLAT[plat].bg:t.glass, color:activePlat===plat?PLAT[plat].color:t.textSub }}>
            <span style={{ color:PLAT[plat].color }}>{PLAT[plat].icon}</span>{plat}
          </button>
        ))}
      </div>
      <AIBriefPanel platform={activePlat} t={t}/>
      <div>
        <div style={{ fontSize:12, fontWeight:700, color:t.text, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
          <Users size={13} style={{ color:PLAT[activePlat]?.color }}/>Inner Circle · {activePlat}
        </div>
        {(MOCK_POSTS[activePlat]||[]).map(post=><PostCard key={post.id} post={post} platform={activePlat} t={t}/>)}
      </div>
    </div>
  );
}

function StudioView({ t }) {
  const [generating, setGenerating] = useState(false);
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>
      <div>
        <div style={{ fontSize:12, fontWeight:700, color:t.text, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
          <Flame size={14} style={{ color:'#F59E0B' }}/>Top Performing Content — All Platforms
        </div>
        {Object.entries(MOCK_POSTS).flatMap(([plat,posts])=>posts.map(p=>({...p,platform:plat}))).sort((a,b)=>a.signal==='high'?-1:1).slice(0,8).map(post=>(
          <div key={post.id}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
              <span style={{ color:PLAT[post.platform]?.color }}>{PLAT[post.platform]?.icon}</span>
              <span style={{ fontSize:10, fontWeight:700, color:PLAT[post.platform]?.color, textTransform:'uppercase', letterSpacing:'0.04em' }}>{post.platform}</span>
            </div>
            <PostCard post={post} platform={post.platform} t={t}/>
          </div>
        ))}
      </div>
      <div>
        <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:16, padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
            <Sparkles size={13} style={{ color:'#6366F1' }}/><span style={{ fontSize:11, fontWeight:700, color:t.text }}>AI Content Ideas</span>
          </div>
          <button onClick={()=>{ setGenerating(true); setTimeout(()=>setGenerating(false),1500); }} disabled={generating}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontSize:12, fontWeight:700, padding:'10px 0', borderRadius:10, background:'linear-gradient(135deg,#6366F1,#22D3EE)', color:'#fff', border:'none', cursor:'pointer', opacity:generating?0.7:1, marginBottom:12 }}>
            {generating?<RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }}/>:<Sparkles size={13}/>}
            {generating?'Generating…':'Generate New Ideas'}
          </button>
          {CONTENT_IDEAS.map(idea=>(
            <div key={idea.id} style={{ borderRadius:10, padding:'10px 12px', background:t.glass, border:`1px solid ${t.border}`, marginBottom:6 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ color:PLAT[idea.plat]?.color }}>{PLAT[idea.plat]?.icon}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:PLAT[idea.plat]?.color }}>{idea.plat}</span>
                  <span style={{ fontSize:10, color:t.textSub }}>{idea.trend}</span>
                </div>
                <span style={{ fontSize:10, fontWeight:700, color:'#F59E0B' }}>★{idea.score}</span>
              </div>
              <p style={{ fontSize:11, lineHeight:1.55, color:t.text }}>{idea.hook}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertsView({ t }) {
  const [alerts, setAlerts] = useState(ALERTS);
  const [filter, setFilter] = useState('all');
  const unread = alerts.filter(a=>!a.read).length;
  const markRead = id=>setAlerts(prev=>prev.map(a=>a.id===id?{...a,read:true}:a));
  const markAll  = () =>setAlerts(prev=>prev.map(a=>({...a,read:true})));
  const dismiss  = id =>setAlerts(prev=>prev.filter(a=>a.id!==id));
  const sevStyle = sev=>({
    critical:{ color:'#EF4444', bg:'rgba(239,68,68,0.1)',  border:'rgba(239,68,68,0.2)',  icon:<AlertTriangle size={13}/> },
    high:    { color:'#F59E0B', bg:'rgba(245,158,11,0.1)', border:'rgba(245,158,11,0.2)', icon:<Zap size={13}/> },
    medium:  { color:'#6366F1', bg:'rgba(99,102,241,0.1)', border:'rgba(99,102,241,0.18)',icon:<Info size={13}/> },
    low:     { color:'#10B981', bg:'rgba(16,185,129,0.1)', border:'rgba(16,185,129,0.18)',icon:<CheckCircle size={13}/> },
  }[sev]||{ color:t.textSub, bg:t.glass, border:t.border, icon:<Bell size={13}/> });
  const filtered = filter==='all'?alerts:filter==='unread'?alerts.filter(a=>!a.read):alerts.filter(a=>a.sev===filter);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          {unread>0&&<span style={{ fontSize:11, padding:'3px 10px', borderRadius:7, background:'rgba(239,68,68,0.12)', color:'#EF4444', fontWeight:700 }}>{unread} unread</span>}
          {['all','unread','critical','high','medium','low'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{ fontSize:10, fontWeight:600, padding:'4px 10px', borderRadius:7, cursor:'pointer', border:`1px solid ${filter===f?'#6366F1':t.border}`, background:filter===f?'rgba(99,102,241,0.12)':t.glass, color:filter===f?'#6366F1':t.textSub, textTransform:'capitalize' }}>{f}</button>
          ))}
        </div>
        {unread>0&&<button onClick={markAll} style={{ fontSize:11, color:t.textSub, background:'none', border:'none', cursor:'pointer' }}>Mark all read</button>}
      </div>
      {filtered.map(alert=>{
        const s=sevStyle(alert.sev);
        return (
          <div key={alert.id} style={{ borderRadius:14, padding:'14px 16px', background:alert.read?t.glass:s.bg, border:`1px solid ${alert.read?t.border:s.border}`, display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:32, height:32, borderRadius:9, background:s.bg, border:`1px solid ${s.border}`, display:'flex', alignItems:'center', justifyContent:'center', color:s.color, flexShrink:0 }}>{s.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:4, background:s.bg, color:s.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>{alert.sev}</span>
                {alert.plat!=='all'&&PLAT[alert.plat]&&<span style={{ color:PLAT[alert.plat].color, display:'flex', alignItems:'center', gap:3, fontSize:10 }}>{PLAT[alert.plat].icon}{alert.plat}</span>}
                {!alert.read&&<div style={{ width:6, height:6, borderRadius:'50%', background:'#EF4444' }}/>}
              </div>
              <p style={{ fontSize:12, lineHeight:1.55, color:alert.read?t.textSub:t.text, marginBottom:4 }}>{alert.msg}</p>
              <span style={{ fontSize:10, color:t.textMuted, display:'flex', alignItems:'center', gap:3 }}><Clock size={9}/>{alert.time}</span>
            </div>
            <div style={{ display:'flex', gap:4, flexShrink:0 }}>
              {!alert.read&&<button onClick={()=>markRead(alert.id)} style={{ fontSize:10, padding:'4px 8px', borderRadius:7, background:'rgba(16,185,129,0.1)', color:'#10B981', border:'1px solid rgba(16,185,129,0.2)', cursor:'pointer' }}>Read</button>}
              <button onClick={()=>dismiss(alert.id)} style={{ padding:'4px 6px', borderRadius:7, background:t.glass, color:t.textSub, border:`1px solid ${t.border}`, cursor:'pointer', display:'flex' }}><X size={11}/></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SourcesView({ t, circle, setCircle }) {
  const [modal,  setModal]  = useState(null);
  const [newAcc, setNewAcc] = useState('');
  const addAcc = ()=>{ if (!newAcc.trim()||!modal) return; setCircle(prev=>({...prev,[modal]:[...(prev[modal]||[]).filter(a=>a!==newAcc.trim()),newAcc.trim()]})); setNewAcc(''); };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <p style={{ fontSize:13, color:t.textSub }}>{Object.values(circle).flat().length} sources tracked · manually add any handle below</p>
        <button onClick={()=>setModal(Object.keys(PLAT)[0])} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, padding:'8px 16px', borderRadius:10, background:'#6366F1', color:'#fff', border:'none', cursor:'pointer' }}>
          <Plus size={14}/>Add Source
        </button>
      </div>
      {Object.entries(PLAT).map(([plat,cfg])=>(
        <div key={plat}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:cfg.color }}>{cfg.icon}</span>
              <span style={{ fontSize:13, fontWeight:700, color:t.text }}>{plat}</span>
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:cfg.bg, color:cfg.color, fontWeight:600 }}>{(circle[plat]||[]).length} following</span>
            </div>
            <button onClick={()=>setModal(plat)} style={{ padding:'5px 8px', borderRadius:8, background:t.glass, color:t.textSub, border:`1px solid ${t.border}`, cursor:'pointer', display:'flex' }}><Plus size={12}/></button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(155px, 1fr))', gap:8 }}>
            {(circle[plat]||[]).map((acc,i)=>(
              <div key={i} style={{ borderRadius:12, padding:'10px 12px', background:t.card, border:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:cfg.color }}>{acc[0].toUpperCase()}</div>
                  <span style={{ fontSize:12, fontWeight:600, color:t.text }}>@{acc}</span>
                </div>
                <button onClick={()=>setCircle(prev=>({...prev,[plat]:prev[plat].filter(a=>a!==acc)}))} style={{ background:'none', border:'none', cursor:'pointer', color:t.textMuted }}><Trash2 size={11}/></button>
              </div>
            ))}
            {!(circle[plat]||[]).length&&(
              <div onClick={()=>setModal(plat)} style={{ borderRadius:12, padding:'18px 12px', background:t.glass, border:`1px dashed ${t.border}`, display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer' }}>
                <Plus size={14} style={{ color:t.textMuted }}/><span style={{ fontSize:11, color:t.textMuted }}>Add source</span>
              </div>
            )}
          </div>
        </div>
      ))}
      {modal&&(
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(10px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ width:'100%', maxWidth:420, borderRadius:20, background:t.surface, border:`1px solid ${t.borderMid}`, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${t.border}` }}>
              <h3 style={{ fontFamily:'var(--font-syne),sans-serif', fontSize:15, fontWeight:800, color:t.text }}>Add {modal} Source</h3>
              <button onClick={()=>setModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:t.textSub }}><X size={16}/></button>
            </div>
            <div style={{ padding:18 }}>
              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                <input value={newAcc} onChange={e=>setNewAcc(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addAcc()} placeholder="@handle"
                  style={{ flex:1, fontSize:13, padding:'9px 12px', borderRadius:10, border:`1px solid ${PLAT[modal]?.border||t.border}`, background:t.glass, color:t.text, outline:'none' }}/>
                <button onClick={addAcc} style={{ padding:'9px 14px', borderRadius:10, background:PLAT[modal]?.color||'#6366F1', color:modal==='X'?'#0d0d12':'#fff', border:'none', cursor:'pointer' }}><Plus size={15}/></button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:180, overflowY:'auto' }}>
                {(circle[modal]||[]).map((acc,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 10px', borderRadius:8, background:t.glass, border:`1px solid ${t.border}` }}>
                    <span style={{ fontSize:12, color:t.text }}>@{acc}</span>
                    <button onClick={()=>setCircle(prev=>({...prev,[modal]:prev[modal].filter(a=>a!==acc)}))} style={{ background:'none', border:'none', cursor:'pointer', color:t.textSub }}><Trash2 size={12}/></button>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding:'10px 18px', borderTop:`1px solid ${t.border}`, display:'flex', justifyContent:'flex-end' }}>
              <button onClick={()=>setModal(null)} style={{ padding:'7px 18px', borderRadius:10, background:PLAT[modal]?.color||'#6366F1', color:modal==='X'?'#0d0d12':'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:700 }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsView({ t, dark, onDark }) {
  const [notif, setNotif] = useState({ spikes:true, sentiment:true, growth:false });
  const [saved, setSaved] = useState(false);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:780 }}>
      <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:16, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
          <Key size={14} style={{ color:'#6366F1' }}/><span style={{ fontSize:13, fontWeight:700, color:t.text }}>AI API Keys</span>
        </div>
        <p style={{ fontSize:11, color:t.textSub, marginBottom:14, lineHeight:1.65 }}>Add keys in <strong style={{ color:t.text }}>Vercel → Settings → Environment Variables</strong> and redeploy.</p>
        {[
          { label:'GROQ_API_KEY',                   hint:'Free · console.groq.com · fastest inference' },
          { label:'GOOGLE_AI_KEY / GEMINI_API_KEY', hint:'Free · aistudio.google.com · 500 req/day' },
          { label:'ANTHROPIC_API_KEY',              hint:'Paid · console.anthropic.com · highest quality' },
        ].map((f,i)=>(
          <div key={i} style={{ marginBottom:12 }}>
            <label style={{ fontSize:10, fontWeight:700, color:t.textSub, display:'block', marginBottom:4, fontFamily:'monospace', letterSpacing:'0.04em' }}>{f.label}</label>
            <input type="password" readOnly value="•••••••••••••••••••" style={{ width:'100%', fontSize:12, padding:'8px 12px', borderRadius:9, border:`1px solid ${t.border}`, background:t.glass, color:t.textSub, outline:'none', fontFamily:'monospace', boxSizing:'border-box' }}/>
            <p style={{ fontSize:10, color:t.textMuted, marginTop:2 }}>{f.hint}</p>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:16, padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
            <Palette size={14} style={{ color:'#22D3EE' }}/><span style={{ fontSize:13, fontWeight:700, color:t.text }}>Appearance</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:12, background:t.glass, border:`1px solid ${t.border}` }}>
            <div>
              <p style={{ fontSize:12, fontWeight:600, color:t.text }}>Dark Mode</p>
              <p style={{ fontSize:10, color:t.textSub }}>Obsidian dark (recommended)</p>
            </div>
            <button onClick={onDark} style={{ width:44, height:24, borderRadius:12, background:dark?'#6366F1':t.border, border:'none', cursor:'pointer', position:'relative', transition:'background 0.3s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:3, left:dark?21:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.3s' }}/>
            </button>
          </div>
        </div>
        <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:16, padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
            <BellRing size={14} style={{ color:'#F59E0B' }}/><span style={{ fontSize:13, fontWeight:700, color:t.text }}>Alerts</span>
          </div>
          {[{ id:'spikes', label:'Spike Alerts', desc:'+200% velocity posts' },{ id:'sentiment', label:'Sentiment Alerts', desc:'Negative drops' },{ id:'growth', label:'Growth Milestones', desc:'Follower milestones' }].map(n=>(
            <div key={n.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${t.border}` }}>
              <div>
                <p style={{ fontSize:12, color:t.text }}>{n.label}</p>
                <p style={{ fontSize:10, color:t.textSub }}>{n.desc}</p>
              </div>
              <button onClick={()=>setNotif(prev=>({...prev,[n.id]:!prev[n.id]}))} style={{ width:38, height:21, borderRadius:10, background:notif[n.id]?'#6366F1':t.border, border:'none', cursor:'pointer', position:'relative', transition:'background 0.3s', flexShrink:0 }}>
                <div style={{ position:'absolute', top:2.5, left:notif[n.id]?18:2.5, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.3s' }}/>
              </button>
            </div>
          ))}
        </div>
        <button onClick={()=>{ setSaved(true); setTimeout(()=>setSaved(false),2000); }}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontSize:12, fontWeight:700, padding:'10px 0', borderRadius:12, background:saved?'#10B981':'#6366F1', color:'#fff', border:'none', cursor:'pointer', transition:'background 0.3s' }}>
          {saved?<><Check size={14}/>Saved!</>:<><Download size={14}/>Save Settings</>}
        </button>
      </div>
    </div>
  );
}

// ─── TOP NAV ──────────────────────────────────────────────────────────────────
function TopNav({ view, onNav, dark, onDark, t, alertCount, isMobile }) {
  return (
    <div style={{ height:isMobile?52:58, background:t.navBg, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', paddingLeft:isMobile?14:22, paddingRight:isMobile?14:18, gap:10, flexShrink:0, position:'sticky', top:0, zIndex:100 }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, marginRight:6 }}>
        <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#6366F1,#22D3EE)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Zap size={14} color="#fff" fill="#fff"/>
        </div>
        <span style={{ fontFamily:'var(--font-syne),sans-serif', fontSize:15, fontWeight:800, background:'linear-gradient(135deg,#6366F1,#22D3EE)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', whiteSpace:'nowrap' }}>
          AetherHub
        </span>
      </div>

      {/* Desktop tabs */}
      {!isMobile && (
        <nav style={{ display:'flex', gap:1, flex:1, overflow:'hidden' }}>
          {NAV_TABS.map(tab=>{
            const active = view===tab.id;
            const badge  = tab.id==='alerts' && alertCount>0;
            return (
              <button key={tab.id} onClick={()=>onNav(tab.id)}
                style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:active?700:500, padding:'6px 11px', borderRadius:9, border:'none', cursor:'pointer', background:active?t.accentSub:'transparent', color:active?t.accent:t.textSub, transition:'all 0.15s', position:'relative', whiteSpace:'nowrap', flexShrink:0 }}>
                <span style={{ opacity:active?1:0.65 }}>{tab.icon}</span>
                {tab.label}
                {badge&&<span style={{ position:'absolute', top:5, right:5, width:5, height:5, borderRadius:'50%', background:'#EF4444' }}/>}
              </button>
            );
          })}
        </nav>
      )}

      {isMobile && <div style={{ flex:1 }}/>}

      {/* Right controls */}
      <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
        {alertCount>0&&(
          <button onClick={()=>onNav('alerts')} style={{ position:'relative', padding:7, borderRadius:9, border:`1px solid ${t.border}`, background:t.glass, color:t.textSub, cursor:'pointer', display:'flex' }}>
            <Bell size={14}/>
            <span style={{ position:'absolute', top:3, right:3, width:6, height:6, borderRadius:'50%', background:'#EF4444' }}/>
          </button>
        )}
        <button onClick={onDark} style={{ padding:7, borderRadius:9, border:`1px solid ${t.border}`, background:t.glass, color:t.textSub, cursor:'pointer', display:'flex' }}>
          {dark?<Sun size={14}/>:<Moon size={14}/>}
        </button>
        <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#6366F1,#22D3EE)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', cursor:'pointer' }}>A</div>
      </div>
    </div>
  );
}

function BottomNav({ view, onNav, t, alertCount }) {
  return (
    <div style={{ height:58, background:t.navBg, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderTop:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-around', flexShrink:0, position:'sticky', bottom:0, zIndex:100 }}>
      {NAV_TABS.slice(0,5).map(tab=>{
        const active = view===tab.id;
        const badge  = tab.id==='alerts' && alertCount>0;
        return (
          <button key={tab.id} onClick={()=>onNav(tab.id)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 0', border:'none', cursor:'pointer', background:'transparent', color:active?t.accent:t.textSub, position:'relative' }}>
            <span style={{ opacity:active?1:0.55 }}>{tab.icon}</span>
            <span style={{ fontSize:9, fontWeight:active?700:500 }}>{tab.label}</span>
            {badge&&<div style={{ position:'absolute', top:4, right:'calc(50% - 12px)', width:5, height:5, borderRadius:'50%', background:'#EF4444' }}/>}
          </button>
        );
      })}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function AetherHub() {
  const [view,         setView]         = useState('feed');
  const [dark,         setDark]         = useState(true);
  const [circle,       setCircle]       = useState(DEFAULT_CIRCLE);
  const [activeFilter, setActiveFilter] = useState(null);
  const [panelOpen,    setPanelOpen]    = useState(false);
  const w = useWindowSize();
  const isMobile   = w < 768;
  const showPanel  = w >= 1120;

  const t = dark ? T.dark : T.light;
  const unreadAlerts = ALERTS.filter(a=>!a.read).length;

  const viewLabel = { feed:'Feed', discover:'Discover', intelligence:'Intelligence', studio:'Content Studio', alerts:'Alerts', sources:'Sources', settings:'Settings' };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:t.bg, color:t.text, fontFamily:"var(--font-inter),-apple-system,sans-serif", overflow:'hidden' }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{ opacity:1; } 50%{ opacity:0.35; } }
        * { box-sizing: border-box; }
        input::placeholder,textarea::placeholder { color: rgba(120,120,160,0.45); }
      `}</style>

      <TopNav view={view} onNav={setView} dark={dark} onDark={()=>setDark(d=>!d)} t={t} alertCount={unreadAlerts} isMobile={isMobile}/>

      <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative' }}>
        {/* Main content */}
        <main style={{ flex:1, overflowY:'auto', padding:isMobile?'16px 14px':'22px 26px' }}>
          {/* Page header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <div>
              <h1 style={{ fontFamily:'var(--font-syne),sans-serif', fontSize:isMobile?17:20, fontWeight:800, color:t.text, margin:0, letterSpacing:'-0.02em' }}>{viewLabel[view]||'Feed'}</h1>
              {activeFilter&&view==='feed'&&<p style={{ fontSize:11, color:t.accent, marginTop:2 }}>Filtered: {activeFilter}</p>}
            </div>
            {!showPanel&&(
              <button onClick={()=>setPanelOpen(p=>!p)} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, padding:'6px 12px', borderRadius:10, border:`1px solid ${panelOpen?t.accent:t.border}`, background:panelOpen?t.accentSub:t.glass, color:panelOpen?t.accent:t.textSub, cursor:'pointer' }}>
                <TrendingUp size={12}/>Trends
              </button>
            )}
          </div>

          {view==='feed'         && <FeedView         t={t} activeFilter={activeFilter} setActiveFilter={setActiveFilter} onNav={setView}/>}
          {view==='discover'     && <DiscoverView     t={t} setActiveFilter={setActiveFilter} onNav={setView}/>}
          {view==='intelligence' && <IntelligenceView t={t}/>}
          {view==='studio'       && <StudioView       t={t}/>}
          {view==='alerts'       && <AlertsView       t={t}/>}
          {view==='sources'      && <SourcesView      t={t} circle={circle} setCircle={setCircle}/>}
          {view==='settings'     && <SettingsView     t={t} dark={dark} onDark={()=>setDark(d=>!d)}/>}
        </main>

        {/* Right intelligence panel */}
        {(showPanel||panelOpen) && (
          <aside style={{ width:280, minWidth:280, borderLeft:`1px solid ${t.border}`, overflowY:'auto', padding:'18px 14px', flexShrink:0, position:panelOpen&&!showPanel?'absolute':'relative', right:0, top:0, bottom:0, background:t.bg, zIndex:panelOpen&&!showPanel?50:undefined }}>
            {panelOpen&&!showPanel&&(
              <button onClick={()=>setPanelOpen(false)} style={{ position:'absolute', top:10, right:10, background:'none', border:'none', cursor:'pointer', color:t.textSub }}><X size={14}/></button>
            )}
            <RightPanel t={t} activeFilter={activeFilter} setActiveFilter={f=>{ setActiveFilter(f); setView('feed'); }}/>
          </aside>
        )}
      </div>

      {isMobile&&<BottomNav view={view} onNav={setView} t={t} alertCount={unreadAlerts}/>}
    </div>
  );
}
