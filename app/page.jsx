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
  MessageSquare, Send, Upload,
} from 'lucide-react';

import { getFeed } from '../lib/adapters.js';
import {
  CATEGORIES, DEFAULT_CATEGORY, sortedCategories, categoryLabel,
  SPORTS_LEAGUES, SPORTS_TEAMS, teamsInLeague,
} from '../config/sources.js';
import {
  groupByCategory, velocitySummary, rankByVelocity,
  WINDOW_OPTIONS, DEFAULT_WINDOW_HOURS, VELOCITY_WORD,
} from '../lib/velocity.js';

// ─── THEME ────────────────────────────────────────────────────────────────────
// The palette now lives in app/globals.css as the MyNewsHub editorial token set.
// `T` reads those tokens rather than carrying hex literals, so the whole app —
// all seven views, not just the feed — retheme from one file and the dark-mode
// toggle is a single data-theme swap on <html> instead of a JS branch.
//
// Both entries are identical because the CSS vars already resolve per theme.
// The shape is kept so every existing view's `t.bg` / `t.textSub` still works.
const TOKENS = {
  bg:'var(--bg)', surface:'var(--surface)', raised:'var(--surface2)', card:'var(--surface)',
  border:'var(--border)', borderMid:'var(--border)', borderHigh:'var(--text4)',
  text:'var(--text)', textSub:'var(--text2)', textMuted:'var(--text3)',
  glass:'var(--surface2)', glassBorder:'var(--border2)',
  navBg:'var(--surface)',
  accent:'var(--accent)', accentSub:'var(--accent-bg)', accentBorder:'var(--border)',
};
const T = { dark: TOKENS, light: TOKENS };

// ─── PLATFORM CONFIG ──────────────────────────────────────────────────────────
const PLAT = {
  LinkedIn:  { color:'#2D88FF', glow:'rgba(45,136,255,0.22)',  bg:'rgba(45,136,255,0.07)',  border:'rgba(45,136,255,0.18)',  icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
  X:         { color:'#E8EAF0', glow:'rgba(232,234,240,0.12)', bg:'rgba(232,234,240,0.05)', border:'rgba(232,234,240,0.12)', icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 5.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  Instagram: { color:'#F0609E', glow:'rgba(240,96,158,0.22)',  bg:'rgba(240,96,158,0.07)',  border:'rgba(240,96,158,0.17)', icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg> },
  YouTube:   { color:'#FF4444', glow:'rgba(255,68,68,0.18)',   bg:'rgba(255,68,68,0.06)',   border:'rgba(255,68,68,0.16)',  icon:<svg width="14" height="10" viewBox="0 0 24 17" fill="currentColor"><path d="M23.495 2.205a3.02 3.02 0 0 0-2.122-2.136C19.505 0 12 0 12 0s-7.505 0-9.374.069A3.02 3.02 0 0 0 .505 2.205 31.247 31.247 0 0 0 0 8.465a31.247 31.247 0 0 0 .505 6.26 3.02 3.02 0 0 0 2.121 2.136C4.495 17 12 17 12 17s7.505 0 9.373-.069a3.02 3.02 0 0 0 2.122-2.136A31.247 31.247 0 0 0 24 8.465a31.247 31.247 0 0 0-.505-6.26zM9.609 12.093V4.837l6.264 3.628-6.264 3.628z"/></svg> },
  Reddit:    { color:'#D93900', glow:'rgba(217,57,0,0.18)',     bg:'rgba(217,57,0,0.06)',    border:'rgba(217,57,0,0.16)',   icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-6.991 4.87-3.861 0-6.99-2.176-6.99-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12.5c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.56-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg> },
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
  { id:'recommended',  label:'Recommended',  icon:<Users size={16}/>       },
  { id:'intelligence', label:'Intelligence', icon:<Brain size={16}/>       },
  { id:'studio',       label:'Studio',       icon:<FileText size={16}/>    },
  { id:'alerts',       label:'Alerts',       icon:<Bell size={16}/>        },
  { id:'sources',      label:'Sources',      icon:<Globe size={16}/>       },
  { id:'categories',   label:'Categories',   icon:<Layers size={16}/>      },
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

/**
 * Marks fabricated data as fabricated. See BRAND.md §7.8.
 *
 * The rule: nothing in this app renders a fabricated number without one of
 * these visible next to it. Amber rather than a neutral grey because this is a
 * caveat, not a label — it has to survive being glanced past.
 *
 * `compact` drops the wordmark to "DEMO" for tight rows where "DEMO DATA"
 * would wrap or crowd out the content it is annotating.
 */
function DemoChip({ compact = false, style }) {
  return (
    <span title="Sample content — not live platform data"
      style={{
        fontSize: compact ? 8 : 9, fontWeight: 800, letterSpacing: '0.04em',
        padding: compact ? '1px 4px' : '1px 5px', borderRadius: 4,
        background: 'rgba(245,158,11,0.14)', color: '#F59E0B',
        border: '1px solid rgba(245,158,11,0.32)',
        whiteSpace: 'nowrap', flexShrink: 0, ...style,
      }}>
      {compact ? 'DEMO' : 'DEMO DATA'}
    </span>
  );
}

function PostCard({ post, platform, t, bookmarks, onBookmark, compact }) {
  const [expanded, setExpanded] = useState(false);
  const [copied,   setCopied]   = useState(false);
  const cfg    = PLAT[platform] || PLAT.LinkedIn;
  const sig    = sigColor(post.signal);
  const bk     = bookmarks?.some(b => b.id === post.id);
  const isLong = post.content.length > 160;

  const displayContent = compact
    ? post.content.slice(0,110)+'…'
    : expanded ? post.content : post.content.slice(0,160)+(isLong?'':'' );

  const copyText = () => {
    navigator.clipboard?.writeText(`@${post.author} on ${platform}:\n\n${post.content}`);
    setCopied(true); setTimeout(()=>setCopied(false), 2000);
  };

  return (
    <div style={{ borderRadius:14, padding:compact?'10px 12px':'14px 16px', border:`1px solid ${t.border}`, background:t.glass, marginBottom:7, transition:'all 0.18s' }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor=cfg.border; e.currentTarget.style.background=t.raised; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor=t.border; e.currentTarget.style.background=t.glass; }}>
      {/* Header */}
      {/* flexWrap + minWidth:0 are load-bearing, not cosmetic: without them this
          row's min-content is the sum of the author cluster and the signal
          badge (~406px), and a grid track sized to that overflows any phone. */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8, flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0, flex:'1 1 auto' }}>
          <div style={{ width:30, height:30, borderRadius:9, background:cfg.bg, border:`1px solid ${cfg.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:cfg.color, flexShrink:0 }}>
            {post.author[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:t.text, display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
              <span style={{ color:cfg.color }}>{cfg.icon}</span>@{post.author}
              <span style={{ fontSize:9, fontWeight:600, padding:'1px 5px', borderRadius:4, background:cfg.bg, color:cfg.color }}>{platform}</span>
              {/* Every MOCK_POSTS render path funnels through PostCard, so one
                  chip here covers the feed, the inner circle, the studio list
                  and every filtered/search result. Per-card rather than
                  per-page on purpose: a cropped screenshot of a single card
                  still carries it. */}
              <DemoChip/>
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

      {/* Content */}
      <p style={{ fontSize:12, lineHeight:1.65, color:t.text, marginBottom:compact?6:8 }}>
        {displayContent}{isLong && !expanded && !compact ? '…' : ''}
      </p>

      {/* Expand / collapse */}
      {!compact && isLong && (
        <button onClick={()=>setExpanded(e=>!e)}
          style={{ fontSize:10, fontWeight:700, color:cfg.color, background:'none', border:'none', cursor:'pointer', padding:'0 0 6px 0', display:'flex', alignItems:'center', gap:3 }}>
          {expanded ? <>↑ Show less</> : <>↓ Read full post</>}
        </button>
      )}

      {/* Tags + actions */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:6 }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
          {post.bw?.slice(0,3).map((w,i)=>(
            <span key={i} style={{ fontSize:10, padding:'2px 7px', borderRadius:5, fontWeight:600, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>#{w}</span>
          ))}
        </div>
        {!compact && (
          <button onClick={copyText}
            style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:7, border:`1px solid ${t.border}`, background:t.glass, color:copied?'#10B981':t.textSub, cursor:'pointer', transition:'color 0.2s', flexShrink:0 }}>
            {copied?<Check size={9}/>:<Copy size={9}/>}{copied?'Copied!':'Copy post'}
          </button>
        )}
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
      <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, color:t.textSub, fontWeight:600 }}>{topic.label}</span>
        <DemoChip compact/>
      </div>
    </div>
  );
}

/**
 * Which provider actually answered — Groq, Gemini or Claude.
 *
 * `/api/brief` has always returned `provider`; every caller discarded it. That
 * is precisely how a misnamed env var fails silently: the fallback chain
 * quietly skips a tier, everything still works, and the only evidence is a
 * bill. Rendering it makes the chain observable at a glance.
 *
 * Colour carries the meaning: Groq and Gemini are the free tiers, Claude is
 * paid, so Claude is amber. Seeing amber when you expected green is the whole
 * point of the component.
 */
const PROVIDER_STYLE = {
  Groq:   { color:'#10B981', note:'free tier' },
  Gemini: { color:'#22D3EE', note:'free tier' },
  Claude: { color:'#F59E0B', note:'paid tier — the free providers did not answer' },
};

function ProviderBadge({ provider, t }) {
  if (!provider) return null;
  const cfg = PROVIDER_STYLE[provider] || { color: t.textSub, note: 'unrecognised provider' };
  return (
    <span title={`Answered by ${provider} — ${cfg.note}`}
      style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:4, letterSpacing:'0.04em',
               background:`${cfg.color}1A`, color:cfg.color, border:`1px solid ${cfg.color}40`,
               whiteSpace:'nowrap', flexShrink:0 }}>
      via {provider}
    </span>
  );
}

/** The counterpart to ProviderBadge: shown when no provider is configured.
 *  /api/brief returns { needsKey: true } with a 200 — a missing key is a setup
 *  step, not an error, so it must not read (or log) like a crash. */
function NeedsKeyNotice({ text }) {
  return (
    <div style={{
      border: '1px dashed var(--border)', borderRadius: 'var(--radius)',
      padding: '12px 14px', fontSize: 'var(--fs-body)', lineHeight: 1.55,
      color: 'var(--text2)', background: 'var(--surface2)',
    }}>
      <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>
        AI panels need a key
      </strong>
      {text || 'Add GROQ_API_KEY or GOOGLE_AI_API_KEY to enable AI panels.'}
      <div style={{ marginTop: 6, fontSize: 'var(--fs-meta)', color: 'var(--text3)' }}>
        Both have free tiers. See .env.example.
      </div>
    </div>
  );
}

// ─── AI BRIEF ─────────────────────────────────────────────────────────────────
function AIBriefPanel({ platform, t }) {
  const [brief,    setBrief]    = useState('');
  const [provider, setProvider] = useState(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [ts,       setTs]       = useState(null);
  const prevPlat = useRef(null);
  const cfg = PLAT[platform] || {};

  const generate = useCallback(async () => {
    setLoading(true); setBrief(''); setProvider(null); setNeedsKey(false);
    const posts = MOCK_POSTS[platform] || [];
    const summary = posts.map((p,i)=>`${i+1}. @${p.author}: "${p.content.slice(0,100)}" — Signal: ${p.signal}, Velocity: ${p.velocity}`).join('\n');
    const prompt = `Social intelligence analyst. Platform: ${platform}.\n\nTop posts:\n${summary}\n\nWrite exactly 3 bullet points (use • character):\n• Dominant narrative on ${platform} right now\n• Which account to engage TODAY and exactly why\n• One concrete 24-hour action\n\nSharp, chief-of-staff tone. No fluff.`;
    try {
      const r = await fetch('/api/brief', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, type:'brief' }) });
      const d = await r.json();
      setNeedsKey(Boolean(d.needsKey));
      setBrief(d.text || 'Unable to generate brief.');
      setProvider(d.provider || null);
    } catch { setBrief('Connection failed. Check your network and try again.'); }
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
          <ProviderBadge provider={provider} t={t}/>
          {ts && <span style={{ fontSize:10, color:t.textSub }}>{ts}</span>}
        </div>
        <button onClick={generate} disabled={loading} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:8, background:cfg.color||'#6366F1', color:platform==='X'?'#0d0d12':'#fff', border:'none', cursor:'pointer', opacity:loading?0.6:1 }}>
          {loading?<RefreshCw size={10} style={{ animation:'spin 1s linear infinite' }}/>:<Sparkles size={10}/>}
          {loading?'Thinking…':'Refresh'}
        </button>
      </div>
      {loading && [85,70,55].map((w,i)=><div key={i} style={{ height:7, borderRadius:4, background:t.border, width:`${w}%`, marginBottom:6, animation:'pulse 1.5s ease-in-out infinite' }}/>)}
      {!loading && needsKey && <NeedsKeyNotice text={brief}/>}
      {!loading && !needsKey && brief && (
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

// ─── ASK ANYTHING PANEL ───────────────────────────────────────────────────────
// Conversational Q&A over ANY source (URL / pasted text / uploaded .txt|.md file).
// Flow:  extract via POST /api/extract  →  chat via POST /api/brief { messages, context }.
// Reuses the existing Groq→Gemini→Claude fallback chain (no new AI providers).
//
// LIBRARY HOOK: `source` holds { title, text, sourceType }. A future
// "save this source to a library and re-query later" feature attaches here —
// persist `source` (and optionally `messages`) on load and add a picker to
// rehydrate them. The chat/context flow below stays identical, so it's an
// addition rather than a rewrite.
const SOURCE_META = {
  youtube: { label: 'YouTube',  color: '#FF4444' },
  podcast: { label: 'Podcast',  color: '#22D3EE' },
  article: { label: 'Article',  color: '#2D88FF' },
  text:    { label: 'Text',     color: '#6366F1' },
  file:    { label: 'File',     color: '#F0609E' },
};

function AskAnythingPanel({ t }) {
  const [inputMode, setInputMode] = useState('url');   // 'url' | 'paste'
  const [urlInput,  setUrlInput]  = useState('');
  const [pasteText, setPasteText] = useState('');
  const [source,    setSource]    = useState(null);    // { title, text, sourceType, truncated }
  const [extracting,setExtracting]= useState(false);
  const [error,     setError]     = useState('');
  const [messages,  setMessages]  = useState([]);      // { role, content }
  const [chatInput, setChatInput] = useState('');
  const [sending,   setSending]   = useState(false);
  const fileRef   = useRef(null);
  const scrollRef = useRef(null);
  const accent = '#6366F1';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior:'smooth' });
  }, [messages, sending]);

  const reset = () => { setSource(null); setMessages([]); setError(''); setChatInput(''); };

  const loadUrl = async () => {
    const u = urlInput.trim();
    if (!u) return;
    setExtracting(true); setError(''); setSource(null); setMessages([]);
    try {
      const r = await fetch('/api/extract', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ url:u }) });
      const d = await r.json();
      if (d.error) setError(d.error);
      else setSource(d);
    } catch { setError('Could not extract that URL. Try pasting the text instead.'); }
    setExtracting(false);
  };

  const loadPaste = () => {
    const txt = pasteText.trim();
    if (!txt) return;
    setError(''); setMessages([]);
    const title = (txt.split('\n').find(l=>l.trim()) || 'Pasted text').slice(0,60);
    setSource({ title, text: txt.slice(0,12000), sourceType:'text', truncated: txt.length>12000 });
  };

  // Files are parsed client-side (no server round-trip needed for text formats).
  const loadFile = (file) => {
    if (!file) return;
    setError('');
    const name = file.name || 'file';
    const ext  = (name.split('.').pop() || '').toLowerCase();
    if (ext === 'txt' || ext === 'md' || (file.type||'').startsWith('text/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const txt = String(reader.result || '');
        if (!txt.trim()) { setError('That file appears to be empty.'); return; }
        setMessages([]);
        setSource({ title:name, text:txt.slice(0,12000), sourceType:'file', truncated:txt.length>12000 });
      };
      reader.onerror = () => setError('Could not read that file.');
      reader.readAsText(file);
    } else if (ext === 'pdf') {
      // PDF text extraction requires a parser (e.g. pdfjs-dist) we intentionally
      // don't bundle per the "no heavy deps" constraint. For v1, ask the user to
      // paste the text or upload a .txt/.md file.
      setError('PDF parsing isn’t supported in v1 (avoids a heavy dependency) — copy the text and paste it, or upload a .txt/.md file.');
    } else {
      setError('Unsupported file type. Use .txt or .md, or paste the text.');
    }
  };

  const send = async (text) => {
    const q = (text ?? chatInput).trim();
    if (!q || !source || sending) return;
    const next = [...messages, { role:'user', content:q }];
    setMessages(next); setChatInput(''); setSending(true);
    try {
      const r = await fetch('/api/brief', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ messages: next, context: source.text, title: source.title }) });
      const d = await r.json();
      setMessages([...next, { role:'assistant', content: d.text || 'No response — please try again.' }]);
    } catch {
      setMessages([...next, { role:'assistant', content: 'Connection failed. Check your API key in Settings.' }]);
    }
    setSending(false);
  };

  const QUICK = [
    { label:'Summarize',     q:'Summarize this source in 4-5 tight bullet points.' },
    { label:'Key takeaways', q:'What are the key takeaways? List the most important points from the source.' },
    { label:'Quiz me',       q:'Ask me 3 quiz questions about this source to test my understanding, one at a time.' },
  ];

  const meta = source ? (SOURCE_META[source.sourceType] || SOURCE_META.text) : null;

  return (
    <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:18, padding:18 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <MessageSquare size={16} style={{ color:accent }}/>
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:t.text, display:'flex', alignItems:'center', gap:6 }}>
            Ask Anything <Sparkles size={12} style={{ color:accent }}/>
          </div>
          <div style={{ fontSize:11, color:t.textSub }}>Load a URL, text, or file — then chat about it</div>
        </div>
      </div>

      {/* ── Loader (no source yet) ── */}
      {!source && (
        <div>
          <div style={{ display:'flex', gap:6, marginBottom:10 }}>
            {['url','paste'].map(m=>(
              <button key={m} onClick={()=>{setInputMode(m); setError('');}}
                style={{ flex:1, fontSize:11, fontWeight:700, padding:'8px 10px', borderRadius:10, cursor:'pointer',
                  border:`1px solid ${inputMode===m?t.accentBorder:t.border}`, background:inputMode===m?t.accentSub:t.glass,
                  color:inputMode===m?accent:t.textSub, textTransform:'capitalize' }}>
                {m==='url'?'URL':'Paste text'}
              </button>
            ))}
            <button onClick={()=>fileRef.current?.click()}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:11, fontWeight:700, padding:'8px 10px', borderRadius:10, cursor:'pointer', border:`1px solid ${t.border}`, background:t.glass, color:t.textSub }}>
              <Upload size={13}/> File
            </button>
            <input ref={fileRef} type="file" accept=".txt,.md,.pdf,text/plain,text/markdown" style={{ display:'none' }}
              onChange={e=>{ loadFile(e.target.files?.[0]); e.target.value=''; }}/>
          </div>

          {inputMode==='url' ? (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <input value={urlInput} onChange={e=>setUrlInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') loadUrl(); }}
                placeholder="Paste an article, YouTube, or podcast URL…"
                style={{ flex:'1 1 200px', minWidth:0, fontSize:12, padding:'10px 12px', borderRadius:10, border:`1px solid ${urlInput?t.borderMid:t.border}`, background:t.glass, color:t.text, outline:'none' }}/>
              <button onClick={loadUrl} disabled={extracting||!urlInput.trim()}
                style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'10px 18px', borderRadius:10, background:'linear-gradient(135deg,#6366F1,#22D3EE)', color:'#fff', border:'none', cursor:extracting||!urlInput.trim()?'not-allowed':'pointer', opacity:!urlInput.trim()?0.45:1 }}>
                {extracting?<RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }}/>:<ArrowUpRight size={13}/>}
                {extracting?'Loading…':'Load'}
              </button>
            </div>
          ) : (
            <div>
              <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)}
                placeholder="Paste an article, transcript, dev plan, or any text here…"
                style={{ width:'100%', height:110, resize:'vertical', padding:'10px 12px', borderRadius:10, border:`1px solid ${pasteText?t.borderMid:t.border}`, background:t.glass, color:t.text, fontSize:12, lineHeight:1.6, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}/>
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
                <button onClick={loadPaste} disabled={!pasteText.trim()}
                  style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'9px 18px', borderRadius:10, background:'linear-gradient(135deg,#6366F1,#22D3EE)', color:'#fff', border:'none', cursor:!pasteText.trim()?'not-allowed':'pointer', opacity:!pasteText.trim()?0.45:1 }}>
                  <ArrowUpRight size={13}/> Load
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop:10, fontSize:11, color:'#F0609E', background:'rgba(240,96,158,0.08)', border:'1px solid rgba(240,96,158,0.2)', borderRadius:10, padding:'8px 12px', lineHeight:1.5 }}>
              <AlertTriangle size={12} style={{ verticalAlign:'-2px', marginRight:5 }}/>{error}
            </div>
          )}
        </div>
      )}

      {/* ── Ready state + chat ── */}
      {source && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:12, background:t.glass, border:`1px solid ${t.border}`, marginBottom:12 }}>
            <span style={{ flexShrink:0, fontSize:9, fontWeight:800, letterSpacing:'0.04em', textTransform:'uppercase', padding:'3px 7px', borderRadius:7, color:meta.color, background:`${meta.color}1A`, border:`1px solid ${meta.color}33` }}>{meta.label}</span>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, color:t.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{source.title}</div>
              <div style={{ fontSize:10, color:t.textSub, display:'flex', alignItems:'center', gap:5 }}>
                <CheckCircle size={10} style={{ color:'#10B981' }}/> Ready{source.truncated?' · truncated to 12k chars':''}
              </div>
            </div>
            <button onClick={reset} title="New source"
              style={{ flexShrink:0, display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'6px 10px', borderRadius:9, border:`1px solid ${t.border}`, background:t.glass, color:t.textSub, cursor:'pointer' }}>
              <RefreshCw size={11}/> New
            </button>
          </div>

          {/* Chat area */}
          <div ref={scrollRef} style={{ maxHeight:340, overflowY:'auto', display:'flex', flexDirection:'column', gap:10, padding:'2px', marginBottom:10 }}>
            {messages.length===0 && (
              <div style={{ fontSize:11, color:t.textSub, textAlign:'center', padding:'18px 8px', lineHeight:1.6 }}>
                <Brain size={18} style={{ color:accent, opacity:0.7, marginBottom:6 }}/>
                <div>Ask anything about this source, or tap a quick action below.</div>
              </div>
            )}
            {messages.map((m,i)=>(
              <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
                <div style={{ maxWidth:'86%', fontSize:12, lineHeight:1.65, padding:'9px 13px', borderRadius:14,
                  borderBottomRightRadius:m.role==='user'?4:14, borderBottomLeftRadius:m.role==='user'?14:4,
                  background:m.role==='user'?'linear-gradient(135deg,#6366F1,#22D3EE)':t.glass,
                  color:m.role==='user'?'#fff':t.text, border:m.role==='user'?'none':`1px solid ${t.border}`, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div style={{ display:'flex', justifyContent:'flex-start' }}>
                <div style={{ fontSize:11, color:t.textSub, padding:'9px 13px', borderRadius:14, background:t.glass, border:`1px solid ${t.border}`, display:'flex', alignItems:'center', gap:6 }}>
                  <RefreshCw size={12} style={{ animation:'spin 1s linear infinite', color:accent }}/> Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Quick-action chips */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
            {QUICK.map(qa=>(
              <button key={qa.label} onClick={()=>send(qa.q)} disabled={sending}
                style={{ display:'flex', alignItems:'center', gap:5, fontSize:10.5, fontWeight:700, padding:'6px 11px', borderRadius:999, cursor:sending?'not-allowed':'pointer', border:`1px solid ${t.accentBorder}`, background:t.accentSub, color:accent, opacity:sending?0.5:1 }}>
                <Sparkles size={10}/>{qa.label}
              </button>
            ))}
          </div>

          {/* Sticky input row */}
          <div style={{ position:'sticky', bottom:0, display:'flex', gap:8, alignItems:'flex-end', paddingTop:2, background:t.card }}>
            <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } }}
              placeholder="Ask a question…" disabled={sending}
              style={{ flex:1, minWidth:0, fontSize:12, padding:'11px 14px', borderRadius:12, border:`1px solid ${chatInput?t.borderMid:t.border}`, background:t.glass, color:t.text, outline:'none' }}/>
            <button onClick={()=>send()} disabled={sending||!chatInput.trim()} aria-label="Send"
              style={{ flexShrink:0, width:42, height:42, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:12, background:'linear-gradient(135deg,#6366F1,#22D3EE)', color:'#fff', border:'none', cursor:sending||!chatInput.trim()?'not-allowed':'pointer', opacity:!chatInput.trim()?0.45:1 }}>
              <Send size={16}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MORNING DIGEST ───────────────────────────────────────────────────────────
function MorningDigest({ t }) {
  const [bullets,  setBullets]  = useState([]);
  const [provider, setProvider] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [ts,       setTs]       = useState(null);
  const done = useRef(false);

  const generate = useCallback(async () => {
    setLoading(true); setBullets([]); setProvider(null);
    const summaries = Object.entries(MOCK_POSTS).map(([plat,posts])=>{
      const top = posts[0];
      return `${plat}: @${top.author} — "${top.content.slice(0,80)}" (${top.signal} signal, ${top.velocity})`;
    }).join('\n');
    const prompt = `Morning briefing. Top posts:\n\n${summaries}\n\nWrite exactly 5 bullet points — one per platform:\n• [Platform]: one sharp sentence on what's dominating\n\nPunchy. Executive summary. Each bullet under 20 words.`;
    try {
      const r = await fetch('/api/brief', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, type:'digest' }) });
      const d = await r.json();
      setBullets((d.text||'').split('\n').filter(l=>l.trim()&&l.includes('•')));
      setProvider(d.provider || null);
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
          <ProviderBadge provider={provider} t={t}/>
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
          <DemoChip compact style={{ marginLeft:'auto' }}/>
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
            <DemoChip compact/>
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
          <DemoChip compact style={{ marginLeft:'auto' }}/>
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

const TIER_WORD = { mainstream: 'Verified', street: 'Alt. perspective' };
const categoryLabelOf = id => categoryLabel(id);
// Nav order comes from the collection's `order`, not import order.
const NAV_CATEGORIES = () => sortedCategories(CATEGORIES);

// ─── LIVE FEED PLUMBING ───────────────────────────────────────────────────────
// Everything below renders from getFeed() → normalizeSignal(). No signal reaches
// a card without a tier, because normalizeSignal is the only way in.

/** Fetches the feed for a category. Never throws — an error is a render state. */
function useLiveFeed(category) {
  const [state, setState] = useState({ items: [], sources: [], degraded: 0, youtubeNeedsKey: false, loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    let alive = true;
    setState(s => ({ ...s, loading: true }));

    getFeed({ category, signal: ac.signal })
      .then(res => { if (alive) setState({ ...res, loading: false }); })
      .catch(err => {
        // getFeed already fails soft; this is the belt-and-braces path.
        console.warn('[feed] getFeed threw', err?.message);
        if (alive) setState({ items: [], sources: [], degraded: 0, youtubeNeedsKey: false, loading: false });
      });

    return () => { alive = false; ac.abort(); };
  }, [category, nonce]);

  return { ...state, refresh: () => setNonce(n => n + 1) };
}

/**
 * One signal. Metadata line, headline, then velocity + tier as WORDS.
 *
 * No platform logo (platform is plain text), no thumbnail, no arrow, gauge or
 * dot. Tier and velocity are unconditional — normalizeSignal guarantees both
 * exist, so nothing here has to defend against a missing one.
 */
function SignalCard({ item, lead = false }) {
  return (
    <button className={`signal${lead ? ' lead' : ''}`} data-cat={item.category}
      onClick={() => openItem(item)}>
      <span className="signal-main">
        <span className="signal-meta">
          <span className="cat-label" data-cat={item.category}>{categoryLabelOf(item.category)}</span>
          <span>·</span><span>{item.sourceLabel}</span>
          <span>·</span><span>{item.platform}</span>
          <span>·</span><time dateTime={item.publishedAt}>{item.time}</time>
          {item.topic && <><span>·</span><span>topic</span></>}
          {!item.live && <><span>·</span><span>Manual</span></>}
        </span>
        <span className="signal-head">{item.title}</span>
        {lead && item.content && <span className="signal-desc">{item.content}</span>}
      </span>
      <span className="signal-side">
        <span className={`vel vel-${item.signal}`}>{VELOCITY_WORD[item.signal]}</span>
        <span className="tier">{TIER_WORD[item.tier]}</span>
      </span>
    </button>
  );
}

const openItem = item => { if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer'); };

/** The signal list. One component for the lead and the rest — same card. */
function SignalList({ lead, items }) {
  return (
    <div className="signal-list">
      {lead && <SignalCard item={lead} lead/>}
      {items.map(i => <SignalCard key={i.id} item={i}/>)}
    </div>
  );
}

/** Right rail — the ranked "what's driving the feed right now" list. */
function LiveSignalRail({ items }) {
  const top = items.slice(0, 8);
  if (!top.length) return null;
  return (
    <section className="sop-strip">
      <div className="sop-head"><span className="sop-label">Live signal</span></div>
      <div className="sop-list">
        {top.map((item, i) => (
          <button key={item.id} className="sop-item" data-cat={item.category}
            onClick={() => openItem(item)}>
            <span className="sop-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="sop-item-title">{item.title}</span>
            <span className="sop-item-meta">
              <span className="cat-label" data-cat={item.category}>{categoryLabelOf(item.category)}</span>
              <span className="sop-item-time">{item.sourceLabel} · {item.time}</span>
              <span className={`vel vel-${item.signal}`}>{VELOCITY_WORD[item.signal]}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Which feeds answered and which didn't. Degradation is visible, not silent. */
function SourceHealth({ sources, youtubeNeedsKey }) {
  if (!sources.length && !youtubeNeedsKey) return null;
  const ok = sources.filter(s => s.ok).length;
  return (
    <section className="sop-strip">
      <div className="sop-head">
        <span className="sop-label">Sources</span>
        <span className="section-sub">{ok}/{sources.length} live</span>
      </div>
      <div className="src-health">
        {youtubeNeedsKey && (
          <div className="src-row">
            <span className="src-dot fail"/>
            <span className="src-name">YouTube</span>
            <span className="src-note">YOUTUBE_API_KEY not set</span>
          </div>
        )}
        {sources.map((s, i) => (
          <div className="src-row" key={`${s.platform}-${s.label}-${i}`}>
            <span className={`src-dot ${s.ok ? 'ok' : 'fail'}`}/>
            <span className="src-name">{s.label}</span>
            <span className="src-note" title={s.limitation ? `Needs ${s.needs} on your RSSHub instance` : undefined}>
              {s.ok ? `${s.count} items`
                    : s.limitation ? `needs ${s.needs}`
                    : (s.error || `HTTP ${s.status}`)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── DISCOVER (B1) ────────────────────────────────────────────────────────────
// "What's spiking in MY world" — every source, ranked by the velocity the
// pipeline already assigned, grouped by category. Ranking lives in
// lib/velocity.js and is shared with the Sports drill-down; there is deliberately
// no second velocity implementation.

/** The whole feed, unfiltered by category — Discover ranks across everything. */
function useAllSignals() {
  const [state, setState] = useState({ items: [], sources: [], loading: true, youtubeNeedsKey: false });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const ac = new AbortController();
    let alive = true;
    setState(s => ({ ...s, loading: true }));
    getFeed({ signal: ac.signal })
      .then(r => { if (alive) setState({ ...r, loading: false }); })
      .catch(e => {
        console.warn('[discover] getFeed failed', e?.message);
        if (alive) setState({ items: [], sources: [], loading: false, youtubeNeedsKey: false });
      });
    return () => { alive = false; ac.abort(); };
  }, [nonce]);
  return { ...state, refresh: () => setNonce(n => n + 1) };
}

function VelocityRow({ item }) {
  return (
    <button className="vrow" onClick={() => openItem(item)}>
      <span className="vrow-main">
        <span className="vrow-meta">
          <span className="cat-label" data-cat={item.category}>{categoryLabelOf(item.category)}</span>
          <span>·</span><span>{item.sourceLabel}</span>
          <span>·</span><span>{item.platform}</span>
          <span>·</span><time dateTime={item.publishedAt}>{item.time}</time>
          {item.topic && <><span>·</span><span>topic</span></>}
        </span>
        <span className="vrow-title">{item.title}</span>
      </span>
      <span className="vrow-side">
        <span className={`vel vel-${item.signal}`}>{VELOCITY_WORD[item.signal]}</span>
        <span className="tier">{TIER_WORD[item.tier]}</span>
      </span>
    </button>
  );
}

function DiscoverView() {
  const { items, loading, refresh } = useAllSignals();
  const [windowHours, setWindowHours] = useState(DEFAULT_WINDOW_HOURS);

  const groups = groupByCategory(items, { windowHours, perCategory: 6 });
  const summary = velocitySummary(items, windowHours);

  useEffect(() => {
    window.__aetherRefreshFeed = refresh;
    return () => { delete window.__aetherRefreshFeed; };
  }, [refresh]);

  return (
    <div className="stack">
      <div className="view-head">
        <div className="view-head-text">
          <h2 className="view-title">Discover</h2>
          <p className="view-sub">
            {loading
              ? 'Ranking your sources…'
              : `${summary.total} signals in the last ${windowHours}h · ${summary.high} High · ${summary.rising} Rising`}
          </p>
        </div>
        <div className="seg" role="group" aria-label="Time window">
          {WINDOW_OPTIONS.map(w => (
            <button key={w.hours}
              className={`seg-btn${windowHours === w.hours ? ' active' : ''}`}
              aria-pressed={windowHours === w.hours}
              onClick={() => setWindowHours(w.hours)}>{w.label}</button>
          ))}
        </div>
      </div>

      {loading && <div className="empty-note">Ranking your sources…</div>}

      {!loading && !groups.length && (
        <div className="empty-note">
          <strong>Nothing in the last {windowHours}h.</strong>
          <div style={{ marginTop: 8 }}>
            Widen the window, or check the source list — every source may be degraded.
          </div>
        </div>
      )}

      {groups.map(g => (
        <section key={g.id} className="vgroup">
          <div className="section-head">
            <span className="cat-label" data-cat={g.id}>{g.label}</span>
            <span className="section-sub">
              {g.total} signal{g.total === 1 ? '' : 's'}
              {g.high ? ` · ${g.high} High` : ''}{g.rising ? ` · ${g.rising} Rising` : ''}
            </span>
          </div>
          <div className="vlist">
            {g.items.map(i => <VelocityRow key={i.id} item={i}/>)}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── RECOMMENDED TO FOLLOW (B3) ───────────────────────────────────────────────
function RecommendedView() {
  const [state, setState] = useState({ recommendations: [], limits: [], mined: null, loading: true });
  const [added, setAdded] = useState({});
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/recommend', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (alive) setState({ ...d, loading: false }); })
      .catch(e => {
        console.warn('[recommend] fetch failed', e?.message);
        if (alive) setState({ recommendations: [], limits: ['Could not mine recommendations.'], mined: null, loading: false });
      });
    return () => { alive = false; };
  }, []);

  const add = async rec => {
    setBusy(rec.key);
    try {
      const r = await fetch('/api/sources', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: rec.platform, handle: rec.handle, label: rec.display,
          category: rec.category, person: rec.display.replace(/^@/, ''), reason: rec.reason,
        }),
      });
      const result = await r.json();
      setAdded(a => ({ ...a, [rec.key]: result }));
    } catch {
      setAdded(a => ({ ...a, [rec.key]: { added: false, message: 'Request failed.' } }));
    }
    setBusy(null);
  };

  const { recommendations, limits, loading } = state;

  return (
    <div className="stack">
      <div className="view-head">
        <div className="view-head-text">
          <h2 className="view-title">Recommended to follow</h2>
          <p className="view-sub">
            Accounts your sources keep pointing at that you do not follow yet,
            ranked by how many of your sources reference each.
          </p>
        </div>
      </div>

      {limits?.length > 0 && (
        <div className="note-block">
          <strong>What this could see</strong>
          <ul>{limits.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      )}

      {loading && <div className="empty-note">Mining your feed for referenced accounts…</div>}

      {!loading && !recommendations.length && (
        <div className="empty-note">
          <strong>No candidates yet.</strong>
          <div style={{ marginTop: 8 }}>
            This mines co-mentions out of the feed your own sources produced, so it
            needs a populated feed to work from. With YouTube unconfigured and X
            degraded on the free instance, there is very little text to read.
          </div>
        </div>
      )}

      <div className="rec-list">
        {recommendations.map(rec => {
          const res = added[rec.key];
          return (
            <div className="rec" key={rec.key}>
              <div className="rec-main">
                <div className="rec-name">{rec.display}</div>
                <div className="rec-meta">
                  <span className="cat-label" data-cat={rec.category}>{categoryLabelOf(rec.category)}</span>
                  <span>·</span><span>{rec.platform}</span>
                  <span>·</span><span>{rec.pointingCount} of your sources referenced this</span>
                </div>
                <div className="rec-why">
                  {rec.pointingSources.slice(0, 3).join(', ')}
                  {rec.pointingSources.length > 3 ? ` +${rec.pointingSources.length - 3} more` : ''}
                </div>
              </div>
              <div className="rec-action">
                {res?.added ? <span className="rec-ok">Added</span>
                  : res?.duplicate ? <span className="rec-note">Already following</span>
                  : res?.readOnly ? <span className="rec-note">Read-only — copy the line</span>
                  : !rec.handle ? <span className="rec-note">No handle</span>
                  : <button className="btn-primary" disabled={busy === rec.key} onClick={() => add(rec)}>
                      {busy === rec.key ? 'Adding…' : 'Add to Follow'}
                    </button>}
              </div>
              {res?.readOnly && <pre className="rec-line">{res.line}</pre>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SPORTS DRILL-DOWN (D1) ───────────────────────────────────────────────────
// Sports is the one category with two levels: league → team. Selecting either
// shows that subcategory's feed AND its trending panel.
//
// The trending panel is rankByVelocity() filtered to the subcategory — the SAME
// engine Discover uses. There is deliberately no second trending system: "what
// is spiking in Energy" and "what is spiking about the Texans" are one question
// with a different filter.

function SportsBreadcrumb({ league, team, onLeague, onRoot }) {
  return (
    <nav className="crumbs" aria-label="Sports navigation">
      <button className="crumb" onClick={onRoot}>Sports</button>
      {league && <><span className="crumb-sep">/</span>
        <button className="crumb" onClick={() => onLeague(league.id)}
          aria-current={!team ? 'page' : undefined}>{league.label}</button></>}
      {team && <><span className="crumb-sep">/</span>
        <span className="crumb current" aria-current="page">{team.label}</span></>}
    </nav>
  );
}

/** Trending for one subcategory. Same engine, one more filter. */
function SubcategoryTrending({ items, subcategory, windowHours }) {
  const ranked = rankByVelocity(items, { category: 'sports', subcategory, windowHours, limit: 6 });
  return (
    <section className="sop-strip">
      <div className="sop-head">
        <span className="sop-label">Trending · last {windowHours}h</span>
      </div>
      {ranked.length ? (
        <div className="sop-list">
          {ranked.map((item, i) => (
            <button key={item.id} className="sop-item" data-cat="sports" onClick={() => openItem(item)}>
              <span className="sop-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="sop-item-title">{item.title}</span>
              <span className="sop-item-meta">
                <span className="sop-item-time">{item.sourceLabel} · {item.time}</span>
                <span className={`vel vel-${item.signal}`}>{VELOCITY_WORD[item.signal]}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="view-sub">Nothing spiking here in the last {windowHours}h.</p>
      )}
    </section>
  );
}

function SportsView({ items, loading, windowHours = DEFAULT_WINDOW_HOURS }) {
  const [leagueId, setLeagueId] = useState(null);
  const [teamId, setTeamId]     = useState(null);

  const league = SPORTS_LEAGUES.find(l => l.id === leagueId) || null;
  const team   = SPORTS_TEAMS.find(t => t.id === teamId) || null;
  const active = teamId || leagueId;

  const openLeague = id => { setLeagueId(id); setTeamId(null); };
  const openRoot   = () => { setLeagueId(null); setTeamId(null); };

  // Counts per subcategory, so a league tile can say how much is moving without
  // the user drilling in first.
  const countFor = sub => rankByVelocity(items, { category: 'sports', subcategory: sub, windowHours }).length;

  const feed = active
    ? rankByVelocity(items, { category: 'sports', subcategory: active, windowHours, limit: 30 })
    : rankByVelocity(items, { category: 'sports', windowHours, limit: 30 });

  return (
    <div className="stack">
      <div className="view-head">
        <div className="view-head-text">
          <h2 className="view-title">{team ? team.label : league ? league.label : 'Sports'}</h2>
          <SportsBreadcrumb league={league} team={team} onLeague={openLeague} onRoot={openRoot}/>
        </div>
      </div>

      {/* Level 1 — leagues. Always visible; it is the way back up. */}
      <div className="drill" role="group" aria-label="Leagues">
        {SPORTS_LEAGUES.map(l => (
          <button key={l.id}
            className={`drill-item${leagueId === l.id ? ' active' : ''}`}
            aria-pressed={leagueId === l.id}
            onClick={() => (leagueId === l.id ? openRoot() : openLeague(l.id))}>
            <span className="drill-label">{l.label}</span>
            <span className="drill-count">{countFor(l.id)}</span>
          </button>
        ))}
      </div>

      {/* Level 2 — teams in the selected league. */}
      {league && teamsInLeague(league.id).length > 0 && (
        <div className="drill drill-teams" role="group" aria-label={`${league.label} teams`}>
          {teamsInLeague(league.id).map(t => (
            <button key={t.id}
              className={`drill-item${teamId === t.id ? ' active' : ''}`}
              aria-pressed={teamId === t.id}
              onClick={() => setTeamId(teamId === t.id ? null : t.id)}>
              <span className="drill-label">{t.label}</span>
              <span className="drill-count">{countFor(t.id)}</span>
            </button>
          ))}
        </div>
      )}

      {/* My teams, reachable without drilling through their league first. */}
      {!league && (
        <div className="drill drill-teams" role="group" aria-label="My teams">
          {SPORTS_TEAMS.map(t => (
            <button key={t.id} className="drill-item"
              onClick={() => { setLeagueId(t.league); setTeamId(t.id); }}>
              <span className="drill-label">{t.label}</span>
              <span className="drill-count">{countFor(t.id)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="page-grid">
        <div className="feed-col">
          <div className="section-head">
            <span className="section-label">
              {team ? team.label : league ? league.label : 'All sports'}
            </span>
            <span className="section-sub">
              {loading ? 'Loading…' : `${feed.length} signal${feed.length === 1 ? '' : 's'} · last ${windowHours}h`}
            </span>
          </div>

          {loading && <div className="empty-note">Loading sports signal…</div>}

          {!loading && !feed.length && (
            <div className="empty-note">
              <strong>Nothing here in the last {windowHours}h.</strong>
              <div style={{ marginTop: 8 }}>
                Sports pulls from Reddit, which needs no credentials — so an empty
                result here means the subreddit was quiet or unreachable, not that
                something is unconfigured. The source list shows which.
              </div>
            </div>
          )}

          {!loading && feed.length > 0 && <SignalList lead={feed[0]} items={feed.slice(1)}/>}
        </div>

        <aside>
          <SubcategoryTrending items={items} subcategory={active} windowHours={windowHours}/>
        </aside>
      </div>
    </div>
  );
}

// ─── CATEGORY MANAGER ─────────────────────────────────────────────────────────
// You drive: add, rename, recolor, merge, delete, reorder. Every mutation goes
// through /api/categories, which is the one writer for config/categories.js.
//
// Delete and merge always REASSIGN — you pick the target, or sources fall back
// to General. Nothing is ever orphaned, because a source pointing at a category
// that no longer exists is silent: it just stops appearing under any tab.

function ColorSwatches({ palette, value, onPick }) {
  return (
    <div className="swatches" role="group" aria-label="Category colour">
      {palette.map(p => (
        <button key={p.color} type="button"
          className={`swatch${value === p.color ? ' active' : ''}`}
          style={{ '--sw': p.color }}
          aria-label={p.name} aria-pressed={value === p.color}
          title={p.name}
          onClick={() => onPick(p)}/>
      ))}
    </div>
  );
}

function CategoryManager() {
  const [state, setState] = useState({ categories: [], palette: [], fallbackId: 'general', loading: true });
  const [busy, setBusy]     = useState(null);
  const [result, setResult] = useState(null);
  const [editing, setEditing] = useState(null);   // id being renamed
  const [draftLabel, setDraftLabel] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(null);
  const [confirming, setConfirming] = useState(null); // { kind, id, targetId }

  const load = useCallback(() => {
    fetch('/api/categories', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setState({ ...d, loading: false }))
      .catch(e => {
        console.warn('[categories] load failed', e?.message);
        setState(s => ({ ...s, loading: false }));
      });
  }, []);
  useEffect(load, [load]);

  const mutate = async (payload, key) => {
    setBusy(key); setResult(null);
    try {
      const r = await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      setResult(d);
      if (d.ok) { setState(s => ({ ...s, categories: d.categories.map(c => ({ ...c, sourceCount: s.categories.find(x => x.id === c.id)?.sourceCount ?? 0 })) })); load(); }
    } catch {
      setResult({ ok: false, error: 'Request failed.' });
    }
    setBusy(null); setConfirming(null); setEditing(null);
  };

  const { categories, palette, fallbackId, loading } = state;
  const move = (id, dir) => {
    const ids = categories.map(c => c.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    mutate({ action: 'reorder', order: ids }, `order-${id}`);
  };

  return (
    <div className="stack">
      <div className="view-head">
        <div className="view-head-text">
          <h2 className="view-title">Categories</h2>
          <p className="view-sub">
            Rename, recolour and reorder freely — sources attach by a stable id,
            never by the label, so nothing detaches. Deleting or merging always
            reassigns; a source is never left pointing at nothing.
          </p>
        </div>
      </div>

      {result && (
        <div className={`note-block${result.ok ? '' : ' note-warn'}`}>
          <strong>{result.ok ? 'Done' : 'Not applied'}</strong>
          <div>{result.message || result.error || result.note}</div>
          {result.ok && result.restartRequired && (
            <div style={{ marginTop: 6, color: 'var(--text3)' }}>
              Written to config/categories.js. Restart the dev server to see it in the nav —
              the config is read once at module load.
            </div>
          )}
          {result.readOnly && (
            <div style={{ marginTop: 6, color: 'var(--text3)' }}>
              Read-only filesystem, so nothing was written. {result.sourcesNote || ''}
            </div>
          )}
        </div>
      )}

      {loading && <div className="empty-note">Loading categories…</div>}

      {/* ── The collection ── */}
      <div className="cat-list">
        {categories.map((c, i) => (
          <div className="cat-row" key={c.id} data-cat={c.id}>
            <span className="cat-stripe" style={{ background: c.color }}/>

            <div className="cat-main">
              {editing === c.id ? (
                <form className="cat-edit" onSubmit={e => { e.preventDefault(); mutate({ action: 'rename', id: c.id, label: draftLabel }, `rename-${c.id}`); }}>
                  <input className="search-input cat-input" value={draftLabel} autoFocus
                    aria-label={`Rename ${c.label}`}
                    onChange={e => setDraftLabel(e.target.value)}/>
                  <button className="btn-primary" type="submit" disabled={busy === `rename-${c.id}`}>Save</button>
                  <button className="nav-btn" type="button" onClick={() => setEditing(null)}>Cancel</button>
                </form>
              ) : (
                <>
                  <div className="cat-name">{c.label}</div>
                  <div className="cat-meta">
                    <span>id <code className="cat-id">{c.id}</code></span>
                    <span>·</span>
                    <span>{c.sourceCount} source{c.sourceCount === 1 ? '' : 's'}</span>
                    {c.id === fallbackId && <><span>·</span><span>fallback, cannot be deleted</span></>}
                  </div>
                </>
              )}

              {editing !== c.id && (
                <ColorSwatches palette={palette} value={c.color}
                  onPick={p => mutate({ action: 'recolor', id: c.id, color: p.color }, `color-${c.id}`)}/>
              )}
            </div>

            <div className="cat-actions">
              <button className="nav-icon-btn" aria-label={`Move ${c.label} up`} title="Move up"
                disabled={i === 0 || busy} onClick={() => move(c.id, -1)}>↑</button>
              <button className="nav-icon-btn" aria-label={`Move ${c.label} down`} title="Move down"
                disabled={i === categories.length - 1 || busy} onClick={() => move(c.id, 1)}>↓</button>
              <button className="nav-btn" onClick={() => { setEditing(c.id); setDraftLabel(c.label); }}>Rename</button>
              <button className="nav-btn" onClick={() => setConfirming({ kind: 'merge', id: c.id, targetId: '' })}>Merge</button>
              <button className="nav-btn" disabled={c.id === fallbackId}
                onClick={() => setConfirming({ kind: 'delete', id: c.id, targetId: fallbackId })}>Delete</button>
            </div>

            {/* Confirm step — merge and delete both move sources, so neither runs
                on a single click. */}
            {confirming?.id === c.id && (
              <div className="cat-confirm">
                <div className="cat-confirm-text">
                  {confirming.kind === 'merge'
                    ? <>Move all <strong>{c.sourceCount}</strong> source{c.sourceCount === 1 ? '' : 's'} from <strong>{c.label}</strong> into:</>
                    : <>Delete <strong>{c.label}</strong>. Its <strong>{c.sourceCount}</strong> source{c.sourceCount === 1 ? '' : 's'} move to:</>}
                </div>
                <select className="search-input cat-select" value={confirming.targetId}
                  aria-label="Reassignment target"
                  onChange={e => setConfirming({ ...confirming, targetId: e.target.value })}>
                  <option value="">Choose a category…</option>
                  {categories.filter(x => x.id !== c.id).map(x => (
                    <option key={x.id} value={x.id}>{x.label}</option>
                  ))}
                </select>
                <button className="btn-primary" disabled={!confirming.targetId || busy}
                  onClick={() => mutate(
                    confirming.kind === 'merge'
                      ? { action: 'merge', fromId: c.id, toId: confirming.targetId }
                      : { action: 'delete', id: c.id, reassignTo: confirming.targetId },
                    `${confirming.kind}-${c.id}`)}>
                  {confirming.kind === 'merge' ? 'Merge' : 'Delete and reassign'}
                </button>
                <button className="nav-btn" onClick={() => setConfirming(null)}>Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Add ── */}
      <section className="cat-add">
        <div className="section-head">
          <span className="section-label">Add a category</span>
        </div>
        <form className="cat-add-form" onSubmit={e => {
          e.preventDefault();
          if (!newLabel.trim()) return;
          mutate({ action: 'add', label: newLabel.trim(), color: newColor }, 'add');
          setNewLabel(''); setNewColor(null);
        }}>
          <input className="search-input cat-input" placeholder="Category name"
            aria-label="New category name" value={newLabel}
            onChange={e => setNewLabel(e.target.value)}/>
          <ColorSwatches palette={palette} value={newColor} onPick={p => setNewColor(p.color)}/>
          <button className="btn-primary" type="submit" disabled={!newLabel.trim() || busy === 'add'}>
            {busy === 'add' ? 'Adding…' : 'Add category'}
          </button>
        </form>
        <p className="view-sub">
          A stable id is generated from the name once, at creation, and never
          regenerated — so you can rename it later without detaching anything.
        </p>
      </section>
    </div>
  );
}

// ─── VIEWS ────────────────────────────────────────────────────────────────────
function FeedView({ t, category, search, isMobile }) {
  // "General" is the everything page, not a bucket. After the roster landed,
  // no source is filed under `general`, so treating it as a filter opened the
  // app on an empty feed. Every other tab filters; General shows the lot.
  const { items, sources, degraded, youtubeNeedsKey, loading, refresh } =
    useLiveFeed(category === 'general' ? null : category);

  // Expose refresh to the masthead's refresh icon without threading it through
  // every view — the feed owns its own fetch, the nav just pokes it.
  useEffect(() => {
    window.__aetherRefreshFeed = refresh;
    return () => { delete window.__aetherRefreshFeed; };
  }, [refresh]);

  const q = (search || '').trim().toLowerCase();
  const visible = q
    ? items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.content.toLowerCase().includes(q) ||
        i.sourceLabel.toLowerCase().includes(q))
    : items;

  // Sports is the one category with a drill-down. Same data, same pipeline —
  // just a second level of navigation on top of it.
  if (category === 'sports') {
    return <SportsView items={visible} loading={loading}/>;
  }

  const [lead, ...rest] = visible;
  const rail = rest.slice(0, 4);
  const more = rest.slice(4, 20);

  return (
    <div className="page-grid">
      <div className="feed-col">
        <div className="section-head">
          <span className="section-label">{category === 'general' ? 'All signal' : categoryLabelOf(category)}</span>
          <span className="section-sub">
            {loading ? 'Loading…' : `${visible.length} signal${visible.length === 1 ? '' : 's'}`}
            {degraded > 0 && ` · ${degraded} source${degraded === 1 ? '' : 's'} degraded`}
          </span>
        </div>

        {loading && (
          <div className="empty-note" style={{ animation:'pulse 1.4s ease-in-out infinite' }}>
            Pulling live signal…
          </div>
        )}

        {!loading && !visible.length && (
          // Graceful fallback: the app renders, and it says exactly WHY it is
          // empty rather than quietly substituting invented posts.
          <div className="empty-note">
            <strong style={{ color:'var(--text2)' }}>No live signal for this category.</strong>
            <div style={{ marginTop:8 }}>
              {q
                ? <>Nothing matches “{search}”. Clear the search to see the full feed.</>
                : <>Every configured source for this category came back empty or unreachable.
                   The source list on the right shows which ones and why. Edit{' '}
                   <code>config/sources.js</code> to change what is pulled.</>}
            </div>
          </div>
        )}

        {!loading && lead && <SignalList lead={lead} items={[...rail, ...more]}/>}
      </div>

      <aside>
        <LiveSignalRail items={visible}/>
        <SourceHealth sources={sources} youtubeNeedsKey={youtubeNeedsKey}/>
      </aside>
    </div>
  );
}

function LegacyDiscoverView({ t, setActiveFilter, onNav }) {
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
      <div style={{ position:'relative' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 18px', borderRadius:14, border:`1px solid ${query?'#6366F1':t.borderMid}`, background:t.card, transition:'all 0.2s', boxShadow:query?'0 0 0 3px rgba(99,102,241,0.1)':'none' }}>
          <Search size={18} style={{ color:query?'#6366F1':t.textSub, flexShrink:0 }}/>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="Search topics, hashtags — e.g. 'kentucky football', 'AI strategy', 'crypto', 'creator'…"
            style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:14, color:t.text, fontFamily:'inherit' }}/>
          {searching && <RefreshCw size={14} style={{ color:t.textSub, animation:'spin 1s linear infinite', flexShrink:0 }}/>}
          {query && !searching && <button onClick={()=>{setQuery('');setResults(null);}} style={{ background:'none', border:'none', cursor:'pointer', color:t.textSub, display:'flex' }}><X size={14}/></button>}
        </div>
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
                      {cfg?.icon}{item.tag}
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
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <DemoChip compact/>
                  <span style={{ fontSize:10, fontWeight:700, color:'#10B981' }}>{topic.delta}</span>
                </div>
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
      <AskAnythingPanel t={t}/>
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

function StudioView({ t, isMobile }) {
  const [generating, setGenerating] = useState(false);
  return (
    // Mobile-first via CSS, not the isMobile prop: useWindowSize() starts at
    // 1280 and only corrects after mount, so a JS ternary rendered the desktop
    // two-column grid on a phone's first paint. The `1fr` track also had an
    // automatic min-content minimum that blew the column out to 407px inside a
    // 358px page — see .studio-grid in globals.css.
    <div className="studio-grid">
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
            <Sparkles size={13} style={{ color:'#6366F1' }}/><span style={{ fontSize:11, fontWeight:700, color:t.text }}>AI Content Ideas</span><DemoChip compact style={{ marginLeft:'auto' }}/>
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
          <div key={alert.id} style={{ borderRadius:14, padding:'14px 16px', background:alert.read?t.glass:s.bg, border:`1px solid ${alert.read?t.border:s.border}`, display:'flex', gap:12, alignItems:'flex-start', opacity:alert.read?0.5:1, transition:'opacity 0.3s, background 0.3s, border-color 0.3s' }}>
            <div style={{ width:32, height:32, borderRadius:9, background:alert.read?t.glass:s.bg, border:`1px solid ${alert.read?t.border:s.border}`, display:'flex', alignItems:'center', justifyContent:'center', color:alert.read?t.textSub:s.color, flexShrink:0, transition:'all 0.3s' }}>
              {alert.read ? <Check size={13}/> : s.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:4, background:s.bg, color:s.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>{alert.sev}</span>
                <DemoChip/>
                {alert.plat!=='all'&&PLAT[alert.plat]&&<span style={{ color:PLAT[alert.plat].color, display:'flex', alignItems:'center', gap:3, fontSize:10 }}>{PLAT[alert.plat].icon}{alert.plat}</span>}
                {!alert.read&&<div style={{ width:6, height:6, borderRadius:'50%', background:'#EF4444' }}/>}
                {alert.read&&<span style={{ fontSize:9, color:t.textSub, fontStyle:'italic' }}>read</span>}
              </div>
              <p style={{ fontSize:12, lineHeight:1.55, color:alert.read?t.textSub:t.text, marginBottom:4 }}>{alert.msg}</p>
              <span style={{ fontSize:10, color:t.textMuted, display:'flex', alignItems:'center', gap:3 }}><Clock size={9}/>{alert.time}</span>
            </div>
            <div style={{ display:'flex', gap:4, flexShrink:0 }}>
              {!alert.read
                ? <button onClick={()=>markRead(alert.id)} style={{ fontSize:10, fontWeight:700, padding:'5px 10px', borderRadius:7, background:'rgba(16,185,129,0.15)', color:'#10B981', border:'1px solid rgba(16,185,129,0.35)', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}><Check size={10}/>Mark Read</button>
                : <span style={{ fontSize:10, color:'#10B981', display:'flex', alignItems:'center', gap:3, padding:'5px 8px' }}><Check size={10}/>Done</span>
              }
              <button onClick={()=>dismiss(alert.id)} style={{ padding:'5px 7px', borderRadius:7, background:t.glass, color:t.textSub, border:`1px solid ${t.border}`, cursor:'pointer', display:'flex' }}><X size={11}/></button>
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

function SettingsView({ t, dark, onDark, isMobile }) {
  const [notif, setNotif] = useState({ spikes:true, sentiment:true, growth:false });
  const [saved, setSaved] = useState(false);

  return (
    <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:16, maxWidth:780 }}>
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

// ─── TOP BAR ──────────────────────────────────────────────────────────────────
// Two stacked rows, MyNewsHub's masthead:
//   1. status strip  — live flag · market ticker · weather chip
//   2. nav bar       — serif logo · category tabs w/ active underline · controls

function TopBar({ category, onCategory, dark, onDark, search, onSearch, onRefresh, onNav }) {
  return (
    <div className="topbar-wrap">
      <div className="nav-bar">
        <div className="nav-bar-inner">
          <div className="logo-wrap">
            <div className="logo">Aether<span>Hub</span></div>
            <div className="logo-tag">Social Intelligence</div>
          </div>

          <nav className="nav-tabs" aria-label="Categories">
            {NAV_CATEGORIES().map(c => (
              <button key={c.id}
                className={`nav-tab${category === c.id ? ' active' : ''}`}
                aria-current={category === c.id ? 'page' : undefined}
                onClick={() => onCategory(c.id)}>
                {c.label}
              </button>
            ))}
          </nav>

          <div className="nav-right">
            <input className="search-input" type="search" placeholder="Search"
              value={search} onChange={e => onSearch(e.target.value)} aria-label="Search the feed"/>
            <button className="nav-btn-blue" onClick={() => onNav('intelligence')}>
              <Sparkles size={12}/>Analyze
            </button>
            <button className="nav-icon-btn" onClick={onRefresh} aria-label="Refresh feed" title="Refresh feed">
              <RefreshCw size={14}/>
            </button>
            <button className="nav-icon-btn" onClick={onDark}
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={dark ? 'Light mode' : 'Dark mode'}>
              {dark ? <Sun size={14}/> : <Moon size={14}/>}
            </button>
            <button className="nav-avatar" onClick={() => onNav('settings')} aria-label="Profile">CB</button>
            <button className="nav-btn" onClick={() => onNav('sources')}>Customize</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Secondary nav for the non-feed views (Discover, Intelligence, Studio, …).
// The category tabs own the masthead, so the app sections sit just below it.
function SectionNav({ view, onNav, alertCount }) {
  return (
    <div style={{ borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
      <div style={{ maxWidth:1400, margin:'0 auto', padding:'0 var(--s4)', display:'flex', gap:2, overflowX:'auto' }}>
        {NAV_TABS.map(tab => {
          const active = view === tab.id;
          return (
            <button key={tab.id} onClick={() => onNav(tab.id)}
              style={{
                display:'flex', alignItems:'center', gap:6, padding:'10px 12px',
                background:'transparent', border:'none', cursor:'pointer', whiteSpace:'nowrap',
                fontFamily:'var(--ah-sans)', fontSize:12, fontWeight:active ? 700 : 500,
                color: active ? 'var(--accent)' : 'var(--text3)',
                borderBottom:`2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                position:'relative',
              }}>
              <span style={{ opacity: active ? 1 : 0.7 }}>{tab.icon}</span>
              {tab.label}
              {tab.id === 'alerts' && alertCount > 0 && (
                <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--red)' }}/>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function AetherHub() {
  const [view,     setView]     = useState('feed');
  const [dark,     setDark]     = useState(false); // light is the primary target
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [search,   setSearch]   = useState('');
  const [circle,   setCircle]   = useState(DEFAULT_CIRCLE);
  const [activeFilter, setActiveFilter] = useState(null);
  const w = useWindowSize();
  const isMobile = w < 768;

  // One toggle, one attribute — every view follows because they all read the
  // same CSS custom properties.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const t = T.light; // both entries resolve through CSS vars; kept for the view API
  const unreadAlerts = ALERTS.filter(a => !a.read).length;

  const viewLabel = {
    feed:'Feed', discover:'Discover', intelligence:'Intelligence',
    studio:'Content Studio', alerts:'Alerts', sources:'Sources', settings:'Settings',
    recommended:'Recommended', categories:'Categories',
  };

  return (
    <>
      <TopBar
        category={category}
        onCategory={id => { setCategory(id); setView('feed'); }}
        dark={dark}
        onDark={() => setDark(d => !d)}
        search={search}
        onSearch={setSearch}
        onRefresh={() => window.__aetherRefreshFeed?.()}
        onNav={setView}
      />

      {view !== 'feed' && <SectionNav view={view} onNav={setView} alertCount={unreadAlerts}/>}

      <main className="page">
        {view !== 'feed' && (
          <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:18 }}>
            <h1 style={{ fontSize:'var(--fs-title)', fontWeight:500,
                         color:'var(--text)', margin:0, letterSpacing:'-0.01em' }}>
              {viewLabel[view]}
            </h1>
            <button onClick={() => setView('feed')}
              style={{ background:'none', border:'none', cursor:'pointer',
                       padding:'8px 6px', margin:'-8px -6px', minHeight:34,
                       fontSize:12, fontWeight:600, color:'var(--accent)' }}>
              ← Back to feed
            </button>
          </div>
        )}

        {view === 'feed'         && <FeedView         t={t} category={category} search={search} isMobile={isMobile}/>}
        {view === 'discover'     && <DiscoverView/>}
        {view === 'recommended'  && <RecommendedView/>}
        {view === 'intelligence' && <IntelligenceView t={t}/>}
        {view === 'studio'       && <StudioView       t={t} isMobile={isMobile}/>}
        {view === 'alerts'       && <AlertsView       t={t}/>}
        {view === 'sources'      && <SourcesView      t={t} circle={circle} setCircle={setCircle}/>}
        {view === 'categories'   && <CategoryManager/>}
        {view === 'settings'     && <SettingsView     t={t} dark={dark} onDark={() => setDark(d => !d)} isMobile={isMobile}/>}
      </main>

      {view === 'feed' && (
        <div style={{ borderTop:'1px solid var(--border)', background:'var(--surface)', marginTop:8 }}>
          <div style={{ maxWidth:1400, margin:'0 auto', padding:'14px var(--s4)' }}>
            <SectionNav view={view} onNav={setView} alertCount={unreadAlerts}/>
          </div>
        </div>
      )}
    </>
  );
}
