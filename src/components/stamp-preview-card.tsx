/**
 * StampPreviewCard — shared real popup preview component.
 * Used by: admin/stamp-styles.tsx, admin/stamps.tsx, stamp.tsx
 *
 * Renders the EXACT same layout as the stamp popup in [...query].tsx,
 * including all special layouts (celebrate / neon / gradient / split / flash).
 */
import React from "react";
import { cn } from "@/lib/utils";
import {
  RiShieldCheckLine, RiArrowRightSLine,
  RiAwardLine,
} from "@remixicon/react";

/* ── Theme definitions (mirror of [...query].tsx CARD_THEMES) ── */
export type CardThemeDef = {
  hero: string; shimmer: string;
  badge: string; btn: string;
  cardBg: string; cardBorder: string; cardText: string;
  layout?: "default" | "celebrate" | "neon" | "gradient" | "split" | "flash";
  accent?: string; accentText?: string;
};

export const STAMP_CARD_THEMES: Record<string, CardThemeDef & { label: string; special?: string }> = {
  /* ── 8 standard themes — one per tag style, all default layout ── */
  app:      { label: "极简", hero: "bg-gradient-to-br from-zinc-600 to-zinc-900",                 shimmer: "text-shimmer",              badge: "bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",                              btn: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",    cardBg: "bg-background", cardBorder: "border-border/50", cardText: "text-foreground" },
  official: { label: "官方", hero: "bg-gradient-to-br from-blue-600 to-indigo-800",               shimmer: "text-foreground font-black", badge: "bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60",                  btn: "bg-blue-700 text-white",                                         cardBg: "bg-background", cardBorder: "border-border/50", cardText: "text-foreground" },
  aurora:   { label: "极光", hero: "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-purple-700", shimmer: "text-foreground font-black", badge: "bg-violet-50 text-violet-700 border border-violet-200/80 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/60", btn: "bg-violet-600 text-white",                                       cardBg: "bg-background", cardBorder: "border-border/50", cardText: "text-foreground" },
  emerald:  { label: "翡翠", hero: "bg-gradient-to-br from-emerald-400 to-teal-700",               shimmer: "text-foreground font-black", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60", btn: "bg-emerald-600 text-white",                                    cardBg: "bg-background", cardBorder: "border-border/50", cardText: "text-foreground" },
  solar:    { label: "暖阳", hero: "bg-gradient-to-br from-amber-400 to-orange-600",               shimmer: "text-foreground font-black", badge: "bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60",              btn: "bg-orange-500 text-white",                                       cardBg: "bg-background", cardBorder: "border-border/50", cardText: "text-foreground" },
  dev:      { label: "开发", hero: "bg-gradient-to-br from-slate-600 to-[#0d1117]",                shimmer: "text-[#58a6ff] font-black font-mono", badge: "bg-[#161b22] text-[#58a6ff] border border-[#30363d]",                                                                        btn: "bg-[#238636] text-white",                                        cardBg: "bg-zinc-950",   cardBorder: "border-zinc-800",  cardText: "text-zinc-200" },
  warning:  { label: "警示", hero: "bg-gradient-to-br from-yellow-400 to-amber-600",               shimmer: "text-foreground font-black", badge: "bg-yellow-50 text-yellow-800 border border-yellow-300/80 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800/60",       btn: "bg-amber-500 text-white",                                        cardBg: "bg-background", cardBorder: "border-border/50", cardText: "text-foreground" },
  premium:  { label: "尊享", hero: "bg-gradient-to-br from-purple-600 via-fuchsia-500 to-rose-500", shimmer: "text-foreground font-black", badge: "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200/80 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-800/60", btn: "bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white",   cardBg: "bg-background", cardBorder: "border-border/50", cardText: "text-foreground" },
  /* ── 5 special themes ── */
  celebrate: { label: "庆典",     layout: "celebrate", hero: "bg-gradient-to-br from-red-700 to-red-900",                    shimmer: "text-white font-black",    badge: "bg-amber-400 text-amber-900 border-0",    btn: "bg-amber-500 text-white",                                      cardBg: "bg-white",       cardBorder: "border-amber-100",  cardText: "text-gray-900", special: "🎊" },
  neon:      { label: "霓虹",     layout: "neon",      hero: "bg-[#050d18]",                                                  shimmer: "text-white font-black",    badge: "bg-cyan-400 text-slate-900 border-0",     btn: "bg-gradient-to-r from-cyan-400 to-violet-600 text-white",     cardBg: "bg-[#050d18]",   cardBorder: "border-slate-800",  cardText: "text-white",    special: "⚡" },
  gradient:  { label: "渐变流光", layout: "gradient",  hero: "bg-gradient-to-br from-rose-300 via-sky-300 to-emerald-300",   shimmer: "text-gray-900 font-black", badge: "bg-black/10 text-gray-800 border border-black/20", btn: "bg-gray-900 text-white",                              cardBg: "bg-transparent", cardBorder: "border-0",          cardText: "text-gray-900", special: "✨" },
  split:     { label: "分栏",     layout: "split",     hero: "bg-black",                                                      shimmer: "text-white font-black",    badge: "bg-blue-500 text-white border-0",         btn: "bg-gray-900 text-white",                                       cardBg: "bg-white",       cardBorder: "border-gray-100",   cardText: "text-gray-900", special: "◼" },
  flash:     { label: "特卖",     layout: "flash",     hero: "bg-[#FF3800]",                                                  shimmer: "text-white font-black",    badge: "bg-[#FF3800] text-white border-0",        btn: "bg-orange-500 text-white",                                     cardBg: "bg-white",       cardBorder: "border-0",          cardText: "text-gray-900", special: "💥" },
};

export interface StampPreviewData {
  tagName?: string;
  domain?: string;
  description?: string;
  link?: string;
  tagLabel?: string;
  icon?: React.ElementType;
}

const DEMO: Required<StampPreviewData> & { icon: React.ElementType } = {
  tagName:  "Hello.SN",
  domain:   "hello.sn",
  description: ".SN 域名注册服务平台，塞内加尔国家顶级域名认证机构。",
  link:     "https://hello.sn",
  tagLabel: "官方认证",
  icon:     RiAwardLine,
};

export function StampPreviewCard({
  themeKey,
  data,
}: {
  themeKey: string;
  data?: StampPreviewData;
}) {
  const t = STAMP_CARD_THEMES[themeKey] ?? STAMP_CARD_THEMES.app;
  if (!t) return null;

  const tagName    = data?.tagName    || DEMO.tagName;
  const domain     = data?.domain     || DEMO.domain;
  const desc       = data?.description || DEMO.description;
  const link       = data?.link       || DEMO.link;
  const tagLabel   = data?.tagLabel   || DEMO.tagLabel;
  const Icon       = data?.icon       || DEMO.icon;

  const linkHost = (() => { try { return new URL(link).hostname; } catch { return link; } })();

  const CtaBtn = ({ cls }: { cls?: string }) => (
    <span className={cn(
      "inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-[9px] font-bold tracking-wide cursor-pointer shrink-0",
      cls ?? t.btn
    )}>
      <span>访问主页</span>
      <RiArrowRightSLine className="w-2.5 h-2.5 opacity-80" />
    </span>
  );

  /* ════════════════════════════════════════
     Layout: celebrate — 中国红·节庆
  ════════════════════════════════════════ */
  if (t.layout === "celebrate") return (
    <>
      <style>{`
        @keyframes spc-confetti-float {
          0%,100% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
          50% { transform: translateY(-4px) rotate(180deg); opacity: 1; }
        }
        @keyframes spc-gold-shimmer {
          0%,100% { box-shadow: 0 0 14px rgba(212,175,55,0.5), 0 4px 16px rgba(180,140,30,0.4); }
          50% { box-shadow: 0 0 26px rgba(247,201,72,0.8), 0 4px 20px rgba(212,175,55,0.6); }
        }
      `}</style>
      <div className="rounded-2xl overflow-hidden shadow-lg" style={{background:"#fff"}}>
        {/* Hero */}
        <div className="relative pt-5 pb-10 overflow-hidden text-center"
          style={{background:"linear-gradient(160deg,#C8102E 0%,#8B0000 100%)"}}>
          {/* animated confetti diamonds */}
          {[
            {x:"7%",y:"10%",s:7,d:"0s"},{x:"22%",y:"5%",s:5,d:"0.4s"},
            {x:"38%",y:"18%",s:9,d:"0.8s"},{x:"56%",y:"4%",s:6,d:"0.2s"},
            {x:"72%",y:"14%",s:8,d:"1.1s"},{x:"87%",y:"7%",s:5,d:"0.6s"},
            {x:"14%",y:"38%",s:6,d:"1.3s"},{x:"60%",y:"35%",s:5,d:"0.9s"},
            {x:"82%",y:"36%",s:7,d:"0.3s"},
          ].map((p,i) => (
            <span key={i} className="absolute pointer-events-none rounded-[2px]"
              style={{left:p.x,top:p.y,width:p.s,height:p.s,
                background:"rgba(212,175,55,0.75)",transform:"rotate(45deg)",
                animation:`spc-confetti-float 2.4s ease-in-out ${p.d} infinite`}} />
          ))}
          {/* wave bottom */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <svg viewBox="0 0 400 28" preserveAspectRatio="none" className="w-full h-7 block">
              <path d="M0 28 C80 6,160 22,240 10,320 -2,380 20,400 8 L400 28 Z" fill="white"/>
            </svg>
          </div>
          {/* badge pill */}
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[7.5px] font-bold"
              style={{background:"rgba(212,175,55,0.25)",border:"1px solid rgba(212,175,55,0.5)",color:"rgba(255,220,100,0.95)"}}>
              <RiShieldCheckLine style={{width:8,height:8}} />{tagLabel}
            </span>
          </div>
        </div>

        {/* Gold icon circle floating over wave */}
        <div className="flex justify-center -mt-8 relative z-10">
          <div className="w-[56px] h-[56px] rounded-full border-[3px] border-white flex items-center justify-center"
            style={{background:"linear-gradient(135deg,#F7C948 0%,#D4AF37 50%,#B8860B 100%)",
              animation:"spc-gold-shimmer 2s ease-in-out infinite"}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 13l6 7L20 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Info block */}
        <div className="px-4 pt-2 pb-4 text-center">
          <p className="text-[14.5px] font-black text-gray-900 leading-tight tracking-tight mt-1">{tagName}</p>
          <p className="text-[8px] font-mono text-gray-400 mt-0.5 tracking-wider">{domain}</p>
          {desc && <p className="text-[8px] text-gray-500 mt-2 mb-3.5 leading-relaxed line-clamp-2">{desc}</p>}
          <div className="flex justify-center">
            <a href={link} className="inline-flex items-center gap-1 px-5 py-2 rounded-full text-white text-[9px] font-bold"
              style={{background:"linear-gradient(135deg,#D4AF37,#B8860B)",
                boxShadow:"0 3px 12px rgba(180,140,30,0.35)"}}>
              访问主页 <RiArrowRightSLine style={{width:10,height:10,opacity:0.9}} />
            </a>
          </div>
        </div>
      </div>
    </>
  );

  /* ════════════════════════════════════════
     Layout: neon — 赛博·霓虹
  ════════════════════════════════════════ */
  if (t.layout === "neon") return (
    <>
      <style>{`
        @keyframes spc-neon-pulse {
          0%,100% { box-shadow: 0 0 18px rgba(0,210,255,0.25), 0 0 40px rgba(0,210,255,0.08); border-color: rgba(0,210,255,0.45); }
          50% { box-shadow: 0 0 30px rgba(0,210,255,0.55), 0 0 60px rgba(0,210,255,0.18); border-color: rgba(0,210,255,0.75); }
        }
        @keyframes spc-neon-badge {
          0%,100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        @keyframes spc-neon-bg {
          0%,100% { opacity: 0.35; }
          50% { opacity: 0.55; }
        }
      `}</style>
      <div className="rounded-2xl overflow-hidden shadow-lg" style={{background:"#050d18"}}>
        {/* Hero */}
        <div className="relative flex flex-col items-center pt-6 pb-5 overflow-hidden" style={{background:"#050d18"}}>
          {/* radial glow bg */}
          <div className="absolute pointer-events-none inset-0"
            style={{background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(0,210,255,0.12) 0%,transparent 70%)",
              animation:"spc-neon-bg 3s ease-in-out infinite"}} />
          {/* badge */}
          <div className="relative z-10 mb-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[7.5px] font-bold font-mono"
              style={{background:"rgba(0,210,255,0.1)",border:"1px solid rgba(0,210,255,0.4)",color:"#00D2FF",
                boxShadow:"0 0 10px rgba(0,210,255,0.2)",animation:"spc-neon-badge 2s ease-in-out infinite"}}>
              <RiShieldCheckLine style={{width:8,height:8}} />{tagLabel}
            </span>
          </div>
          {/* icon circle */}
          <div className="relative z-10 w-[66px] h-[66px] rounded-full flex items-center justify-center"
            style={{background:"rgba(0,210,255,0.06)",border:"2px solid rgba(0,210,255,0.45)",
              animation:"spc-neon-pulse 2.5s ease-in-out infinite"}}>
            <Icon className="w-7 h-7 text-cyan-400"/>
          </div>
          {/* domain */}
          <p className="relative z-10 text-[6.5px] font-mono tracking-[0.2em] uppercase mt-2"
            style={{color:"rgba(0,210,255,0.3)"}}>
            {domain}
          </p>
        </div>

        {/* Info */}
        <div className="px-4 pt-2 pb-4 text-center">
          <p className="text-white text-[14px] font-black leading-tight tracking-tight"
            style={{textShadow:"0 0 20px rgba(0,210,255,0.3)"}}>{tagName}</p>
          {desc && <p className="text-[8px] leading-relaxed mt-1.5 mb-4 line-clamp-2"
            style={{color:"rgba(100,130,160,0.85)"}}>{desc}</p>}
          <a href={link} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-[9px] font-bold text-white"
            style={{background:"linear-gradient(135deg,#00D2FF,#7B2FBE)",
              boxShadow:"0 0 18px rgba(0,210,255,0.35)"}}>
            访问主页 <RiArrowRightSLine style={{width:10,height:10,opacity:0.9}} />
          </a>
        </div>
      </div>
    </>
  );

  /* ════════════════════════════════════════
     Layout: gradient — 全息·流光
  ════════════════════════════════════════ */
  if (t.layout === "gradient") return (
    <>
      <style>{`
        @keyframes spc-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <div className="rounded-2xl overflow-hidden shadow-lg"
        style={{
          background:"linear-gradient(135deg,#FF6B6B,#FFD93D,#6BCB77,#4D96FF,#C77DFF,#FF6B6B)",
          backgroundSize:"300% 300%",
          animation:"spc-gradient-shift 5s ease infinite",
        }}>
        {/* Badge row */}
        <div className="flex justify-center pt-5 pb-1">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[7.5px] font-bold"
            style={{background:"rgba(255,255,255,0.45)",backdropFilter:"blur(8px)",
              border:"1px solid rgba(255,255,255,0.6)",color:"rgba(20,20,20,0.8)"}}>
            <RiShieldCheckLine style={{width:8,height:8}} />{tagLabel}
          </span>
        </div>

        {/* Icon */}
        <div className="flex justify-center my-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{background:"rgba(255,255,255,0.35)",backdropFilter:"blur(10px)",
              border:"1.5px solid rgba(255,255,255,0.6)",boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}>
            <Icon className="w-5 h-5" style={{color:"rgba(20,20,20,0.75)"}} />
          </div>
        </div>

        {/* Title + desc */}
        <div className="px-4 text-center pb-3">
          <p className="font-black text-gray-900 leading-tight tracking-tight"
            style={{fontSize:18,textShadow:"0 1px 6px rgba(255,255,255,0.7)"}}>{tagName}</p>
          <p className="text-[7px] font-mono text-gray-700/60 tracking-wider mt-0.5">{domain}</p>
          {desc && <p className="text-[8px] leading-relaxed mt-1.5 line-clamp-2"
            style={{color:"rgba(20,20,20,0.6)",textShadow:"0 1px 3px rgba(255,255,255,0.5)"}}>{desc}</p>}
        </div>

        {/* CTA panel */}
        <div className="px-3 pb-3.5">
          <div className="rounded-[14px] px-3 py-2.5 flex items-center justify-between gap-2"
            style={{background:"rgba(255,255,255,0.82)",backdropFilter:"blur(16px)",
              boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
            <p className="text-[7px] font-mono truncate flex-1" style={{color:"rgba(80,80,80,0.55)"}}>{linkHost}</p>
            <a href={link} className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[8.5px] font-bold text-white shrink-0"
              style={{background:"rgba(10,10,20,0.85)"}}>
              访问主页 <RiArrowRightSLine style={{width:9,height:9,opacity:0.8}} />
            </a>
          </div>
        </div>
      </div>
    </>
  );

  /* ════════════════════════════════════════
     Layout: split — 高反差·黑白
  ════════════════════════════════════════ */
  if (t.layout === "split") return (
    <>
      <style>{`
        @keyframes spc-split-bar {
          0%,100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
      <div className="rounded-2xl overflow-hidden shadow-lg flex" style={{minHeight:148}}>
        {/* Left black panel */}
        <div className="relative flex flex-col items-center justify-center w-[38%] shrink-0 overflow-hidden"
          style={{background:"#000"}}>
          {/* giant initial ghost letter */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden select-none pointer-events-none">
            <span className="font-black select-none"
              style={{fontSize:100,color:"rgba(255,255,255,0.04)",lineHeight:1,userSelect:"none"}}>
              {(tagName||"A")[0].toUpperCase()}
            </span>
          </div>
          {/* animated gradient divider bar */}
          <div className="absolute top-0 right-0 w-[2.5px] h-full"
            style={{background:"linear-gradient(to bottom,#60a5fa,#818cf8,#c084fc)",
              animation:"spc-split-bar 2s ease-in-out infinite"}} />
          {/* icon */}
          <div className="relative z-10 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)"}}>
            <Icon className="w-5 h-5 text-white/60"/>
          </div>
          <p className="relative z-10 font-mono tracking-widest uppercase text-center px-2 mt-1.5"
            style={{fontSize:5.5,color:"rgba(255,255,255,0.15)"}}>{domain}</p>
        </div>

        {/* Right white panel */}
        <div className="flex-1 flex flex-col justify-between px-3 py-3.5" style={{background:"#FAFAFA"}}>
          {/* tag label */}
          <div>
            <span className="inline-flex items-center gap-0.5 text-[6.5px] font-bold px-2 py-0.5 rounded-md mb-1.5"
              style={{background:"rgba(99,102,241,0.08)",color:"#6366F1",border:"1px solid rgba(99,102,241,0.15)"}}>
              <RiShieldCheckLine style={{width:7,height:7}} />{tagLabel}
            </span>
            <p className="font-black text-gray-900 leading-none tracking-tight" style={{fontSize:17}}>{tagName}</p>
            <p className="text-[7px] mt-0.5 font-mono" style={{color:"#b0b7c3"}}>{domain}</p>
            {desc && <p className="text-[7.5px] leading-relaxed mt-1.5" style={{color:"#9ca3af"}}>{desc}</p>}
          </div>
          {/* CTA */}
          <a href={link} className="flex items-center justify-between mt-2 px-2.5 py-1.5 rounded-[10px] text-white text-[8px] font-bold"
            style={{background:"#111"}}>
            <span>访问主页</span>
            <RiArrowRightSLine style={{width:11,height:11,opacity:0.8}} />
          </a>
        </div>
      </div>
    </>
  );

  /* ════════════════════════════════════════
     Layout: flash — 闪购·电光
  ════════════════════════════════════════ */
  if (t.layout === "flash") return (
    <>
      <style>{`
        @keyframes spc-flash-bolt {
          0%,100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        @keyframes spc-flash-pulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
      `}</style>
      <div className="rounded-2xl overflow-hidden shadow-lg">
        {/* Top bar */}
        <div className="px-3 py-2 flex items-center gap-1.5" style={{background:"#FF3800"}}>
          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
            style={{background:"rgba(255,255,255,0.2)"}}>
            <Icon className="w-2.5 h-2.5 text-white"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[7.5px] font-mono truncate" style={{color:"rgba(255,255,255,0.8)"}}>{domain}</p>
          </div>
          <span className="text-[7px] font-bold px-1.5 py-0.5 rounded"
            style={{background:"rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.7)"}}>
            {tagLabel}
          </span>
        </div>

        {/* Body */}
        <div className="flex" style={{minHeight:110}}>
          {/* Left yellow panel */}
          <div className="w-[42%] shrink-0 relative overflow-hidden flex flex-col justify-center px-3 py-4"
            style={{background:"#FFE500"}}>
            {/* lightning decoration */}
            <svg className="absolute top-2 right-2 pointer-events-none"
              style={{animation:"spc-flash-bolt 1.5s ease-in-out infinite"}}
              width={14} height={22} viewBox="0 0 10 18" fill="rgba(255,80,0,0.45)">
              <path d="M7 0L1 10h5L3 18l8-11H6L7 0Z"/>
            </svg>
            <svg className="absolute bottom-3 left-2 pointer-events-none"
              style={{animation:"spc-flash-bolt 1.5s ease-in-out 0.75s infinite"}}
              width={8} height={13} viewBox="0 0 10 18" fill="rgba(255,80,0,0.3)">
              <path d="M7 0L1 10h5L3 18l8-11H6L7 0Z"/>
            </svg>
            {/* title */}
            <p className="font-black leading-tight tracking-tight relative z-10"
              style={{fontSize:16,color:"#111",animation:"spc-flash-pulse 2s ease-in-out infinite",
                textShadow:"2px 2px 0 rgba(255,80,0,0.12)"}}>
              {tagName}
            </p>
          </div>

          {/* Right white panel */}
          <div className="flex-1 flex flex-col justify-between px-3 py-3 bg-white">
            <div>
              <p className="font-black text-gray-900 leading-none tracking-tight" style={{fontSize:15}}>{tagName}</p>
              <p className="text-[6.5px] font-mono text-gray-400 mt-0.5 tracking-wider">{domain}</p>
              {desc && <p className="text-[7.5px] text-gray-500 leading-relaxed mt-1.5 line-clamp-2">{desc}</p>}
            </div>
            <a href={link} className="inline-flex items-center gap-0.5 mt-2 px-3.5 py-1.5 rounded-full text-[8.5px] font-bold text-white"
              style={{background:"linear-gradient(135deg,#FF3800,#FF6800)",
                boxShadow:"0 2px 10px rgba(255,56,0,0.3)"}}>
              访问主页 <RiArrowRightSLine style={{width:10,height:10,opacity:0.85}} />
            </a>
          </div>
        </div>
      </div>
    </>
  );

  /* ════════════════════════════════════════
     Layout: default — 8 standard themes
  ════════════════════════════════════════ */
  const isDarkCard = t.cardBg === "bg-zinc-950" || t.cardBg === "bg-slate-900";
  return (
    <div className="rounded-2xl overflow-hidden shadow-lg">
      {/* ── Hero ── */}
      <div className={cn("relative px-4 pt-9 pb-12 text-center overflow-hidden", t.hero)}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        <div className="relative flex flex-col items-center gap-1.5">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-white/15 blur-md scale-125 pointer-events-none" />
            <div className="relative w-12 h-12 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shadow-xl backdrop-blur-sm ring-4 ring-white/[0.07]">
              <Icon className="w-[22px] h-[22px] text-white drop-shadow-md" />
            </div>
          </div>
          <p className="text-[6px] text-white/40 font-mono tracking-[0.28em] uppercase">{domain}</p>
        </div>
      </div>

      {/* ── Floating card ── */}
      <div className={cn("relative -mt-5 mx-2 rounded-[18px] border shadow-xl overflow-hidden", t.cardBg, t.cardBorder)}>
        {/* theme accent stripe */}
        <div className={cn("h-[3px] w-full", t.hero)} />
        <div className="px-3 pt-2.5 pb-3">
          {/* name + badge row */}
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="flex-1 min-w-0">
              <p className={cn("text-[13px] font-black leading-snug tracking-tight truncate", t.shimmer)}>{tagName}</p>
              <p className={cn("text-[6px] font-mono tracking-wider mt-0.5 truncate", isDarkCard ? "text-zinc-700" : "text-foreground/25")}>{domain}</p>
            </div>
            <span className={cn("inline-flex items-center gap-0.5 text-[6px] font-bold px-1.5 py-[3px] rounded-full shrink-0 whitespace-nowrap mt-1 leading-none", t.badge)}>
              <RiShieldCheckLine className="w-[7px] h-[7px]" />{tagLabel}
            </span>
          </div>
          {/* description */}
          {desc && (
            <p className={cn("text-[7.5px] leading-[1.6] mt-2 mb-2.5 line-clamp-2", isDarkCard ? "text-zinc-500" : "text-foreground/50")}>{desc}</p>
          )}
          {/* CTA row */}
          <div className={cn("flex items-center justify-between gap-2 pt-2 border-t", isDarkCard ? "border-zinc-800" : "border-border/30")}>
            <p className={cn("text-[6px] font-mono truncate flex-1", isDarkCard ? "text-zinc-700" : "text-foreground/20")}>{linkHost}</p>
            <CtaBtn />
          </div>
        </div>
      </div>

      {/* ── bottom fill ── */}
      <div className={cn("h-3.5", t.cardBg)} />
    </div>
  );
}
