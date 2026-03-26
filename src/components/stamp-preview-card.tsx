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
  layout?: "default" | "celebrate" | "neon" | "gradient" | "split" | "flash" | "classic" | "hero" | "minimal";
  accent?: string; accentText?: string;
};

export const STAMP_CARD_THEMES: Record<string, CardThemeDef & { label: string; special?: string }> = {
  app:       { label: "经典",     hero: "bg-gradient-to-br from-zinc-700 to-zinc-900",                           shimmer: "text-white font-black",    badge: "bg-white/15 text-white border border-white/25",         btn: "bg-zinc-800 text-white",       cardBg: "bg-white",    cardBorder: "border-gray-100",    cardText: "text-gray-900" },
  glow:      { label: "光晕",     hero: "bg-gradient-to-br from-teal-400 to-teal-600",                           shimmer: "text-white font-black",    badge: "bg-teal-500 text-white border-0",                       btn: "bg-teal-500 text-white",       cardBg: "bg-white",    cardBorder: "border-teal-100",    cardText: "text-gray-900" },
  midnight:  { label: "深夜",     hero: "bg-gradient-to-br from-slate-700 via-blue-900 to-slate-900",            shimmer: "text-white font-black",    badge: "bg-blue-500 text-white border-0",                       btn: "bg-blue-600 text-white",       cardBg: "bg-slate-900",cardBorder: "border-slate-700",   cardText: "text-white"    },
  aurora:    { label: "极光",     hero: "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-400",         shimmer: "text-white font-black",    badge: "bg-fuchsia-500 text-white border-0",                    btn: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white", cardBg: "bg-white", cardBorder: "border-violet-100",  cardText: "text-gray-900" },
  solar:     { label: "阳光",     hero: "bg-gradient-to-br from-amber-400 to-orange-600",                        shimmer: "text-white font-black",    badge: "bg-orange-500 text-white border-0",                     btn: "bg-orange-500 text-white",     cardBg: "bg-white",    cardBorder: "border-amber-100",   cardText: "text-gray-900" },
  ink:       { label: "墨水",     hero: "bg-gradient-to-br from-zinc-800 via-zinc-900 to-black",                 shimmer: "text-white font-black",    badge: "bg-zinc-600 text-white border-0",                       btn: "bg-zinc-700 text-white",       cardBg: "bg-zinc-950", cardBorder: "border-zinc-800",    cardText: "text-white"    },
  rose:      { label: "玫瑰",     hero: "bg-gradient-to-br from-pink-400 via-rose-500 to-red-400",               shimmer: "text-white font-black",    badge: "bg-white/20 text-white border border-white/30",         btn: "bg-rose-500 text-white",       cardBg: "bg-white",    cardBorder: "border-rose-100",    cardText: "text-gray-900" },
  forest:    { label: "森林",     hero: "bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600",          shimmer: "text-white font-black",    badge: "bg-white/20 text-white border border-white/30",         btn: "bg-emerald-600 text-white",    cardBg: "bg-white",    cardBorder: "border-emerald-100", cardText: "text-gray-900" },
  ocean:     { label: "深海",     hero: "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700",            shimmer: "text-white font-black",    badge: "bg-cyan-400 text-slate-900 border-0",                   btn: "bg-cyan-500 text-white",       cardBg: "bg-slate-950",cardBorder: "border-slate-700",   cardText: "text-white"    },
  gold:      { label: "金色",     hero: "bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-400",         shimmer: "text-gray-900 font-black", badge: "bg-amber-900/70 text-amber-100 border-0",               btn: "bg-amber-500 text-white",      cardBg: "bg-white",    cardBorder: "border-amber-200",   cardText: "text-gray-900" },
  crimson:   { label: "烈焰",     hero: "bg-gradient-to-br from-red-500 via-rose-600 to-red-800",                shimmer: "text-white font-black",    badge: "bg-white/20 text-white border border-white/30",         btn: "bg-red-600 text-white",        cardBg: "bg-white",    cardBorder: "border-red-100",     cardText: "text-gray-900" },
  celebrate: { label: "庆典",     hero: "bg-gradient-to-br from-red-700 to-red-900",            layout: "celebrate", shimmer: "text-white font-black",    badge: "bg-amber-400 text-amber-900 border-0",                  btn: "bg-amber-500 text-white",      cardBg: "bg-white",    cardBorder: "border-amber-100",   cardText: "text-gray-900", special: "🎊" },
  neon:      { label: "霓虹",     hero: "bg-[#050d18]",                                         layout: "neon",      shimmer: "text-white font-black",    badge: "bg-cyan-400 text-slate-900 border-0",                   btn: "bg-cyan-400 text-slate-900",   cardBg: "bg-[#050d18]",cardBorder: "border-slate-800",   cardText: "text-white",    special: "⚡" },
  gradient:  { label: "渐变流光", hero: "bg-gradient-to-br from-rose-300 via-sky-300 to-emerald-300",layout: "gradient",shimmer: "text-gray-900 font-black", badge: "bg-black/10 text-gray-800 border border-black/20",      btn: "bg-gray-900 text-white",       cardBg: "bg-transparent",cardBorder: "border-0",           cardText: "text-gray-900", special: "✨" },
  split:     { label: "分栏",     hero: "bg-black",                                              layout: "split",     shimmer: "text-white font-black",    badge: "bg-blue-500 text-white border-0",                       btn: "bg-gray-900 text-white",       cardBg: "bg-white",    cardBorder: "border-gray-100",    cardText: "text-gray-900", special: "◼" },
  flash:          { label: "特卖",     hero: "bg-[#FF3800]",                                          layout: "flash",     shimmer: "text-white font-black",    badge: "bg-[#FF3800] text-white border-0",                      btn: "bg-orange-500 text-white",     cardBg: "bg-white",    cardBorder: "border-0",           cardText: "text-gray-900", special: "💥" },
  /* ── Classic: Style A — gradient hero + floating card ── */
  "blue-classic":   { label: "蓝·卡片",   hero: "bg-gradient-to-br from-blue-500 to-blue-700",           layout: "classic",   shimmer: "text-white font-black",    badge: "bg-blue-50 text-blue-700 border border-blue-200",       btn: "bg-blue-600 text-white",       cardBg: "bg-white",    cardBorder: "border-gray-100",    cardText: "text-gray-900" },
  "purple-classic": { label: "紫·卡片",   hero: "bg-gradient-to-br from-violet-500 to-purple-700",       layout: "classic",   shimmer: "text-white font-black",    badge: "bg-violet-50 text-violet-700 border border-violet-200", btn: "bg-violet-600 text-white",     cardBg: "bg-white",    cardBorder: "border-gray-100",    cardText: "text-gray-900" },
  "green-classic":  { label: "绿·卡片",   hero: "bg-gradient-to-br from-emerald-400 to-green-600",       layout: "classic",   shimmer: "text-white font-black",    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", btn: "bg-emerald-600 text-white",  cardBg: "bg-white",    cardBorder: "border-gray-100",    cardText: "text-gray-900" },
  /* ── Hero: Style B — full-screen immersive gradient ── */
  "blue-hero":      { label: "蓝·渐变",   hero: "bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-800", layout: "hero",  shimmer: "text-white font-black",    badge: "bg-white/20 text-white border border-white/30",         btn: "bg-white/20 text-white border border-white/25", cardBg: "bg-transparent", cardBorder: "border-0", cardText: "text-white" },
  "purple-hero":    { label: "紫·渐变",   hero: "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700", layout: "hero", shimmer: "text-white font-black", badge: "bg-white/20 text-white border border-white/30",        btn: "bg-white/20 text-white border border-white/25", cardBg: "bg-transparent", cardBorder: "border-0", cardText: "text-white" },
  "green-hero":     { label: "绿·渐变",   hero: "bg-gradient-to-br from-emerald-500 via-teal-600 to-green-700", layout: "hero",  shimmer: "text-white font-black", badge: "bg-white/20 text-white border border-white/30",         btn: "bg-white/20 text-white border border-white/25", cardBg: "bg-transparent", cardBorder: "border-0", cardText: "text-white" },
  /* ── Minimal: Style C — compact centered card ── */
  "blue-minimal":   { label: "蓝·简约",   hero: "bg-blue-500",                                           layout: "minimal",   shimmer: "text-white font-black",    badge: "bg-blue-50 text-blue-600 border border-blue-200",       btn: "bg-blue-600 text-white",       cardBg: "bg-white",    cardBorder: "border-gray-100",    cardText: "text-gray-900" },
  "purple-minimal": { label: "紫·简约",   hero: "bg-violet-500",                                         layout: "minimal",   shimmer: "text-white font-black",    badge: "bg-violet-50 text-violet-600 border border-violet-200", btn: "bg-violet-600 text-white",     cardBg: "bg-white",    cardBorder: "border-gray-100",    cardText: "text-gray-900" },
  "green-minimal":  { label: "绿·简约",   hero: "bg-emerald-500",                                        layout: "minimal",   shimmer: "text-white font-black",    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", btn: "bg-emerald-600 text-white",  cardBg: "bg-white",    cardBorder: "border-gray-100",    cardText: "text-gray-900" },
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
  const t = STAMP_CARD_THEMES[themeKey];
  if (!t) return null;

  const tagName    = data?.tagName    || DEMO.tagName;
  const domain     = data?.domain     || DEMO.domain;
  const desc       = data?.description || DEMO.description;
  const link       = data?.link       || DEMO.link;
  const tagLabel   = data?.tagLabel   || DEMO.tagLabel;
  const Icon       = data?.icon       || DEMO.icon;

  const linkHost = (() => { try { return new URL(link).hostname; } catch { return link; } })();

  const CtaBtn = ({ extra }: { extra?: string }) => (
    <span className={cn(
      "inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-[9px] font-bold tracking-wide cursor-pointer",
      t.btn, extra
    )}>
      <span>访问主页</span>
      <RiArrowRightSLine className="w-2.5 h-2.5 opacity-75" />
    </span>
  );

  /* ── celebrate — 中国红·节庆 ── */
  if (t.layout === "celebrate") return (
    <div className="rounded-2xl overflow-hidden shadow-md bg-white">
      <div className="relative px-4 pt-5 pb-12 overflow-hidden"
        style={{background:"linear-gradient(160deg,#C8102E 0%,#7B0D1E 100%)"}}>
        {[
          {x:"8%",y:"12%",s:8,r:"45deg"},{x:"18%",y:"5%",s:5,r:"0"},
          {x:"34%",y:"20%",s:10,r:"30deg"},{x:"52%",y:"5%",s:6,r:"0"},
          {x:"68%",y:"15%",s:8,r:"-30deg"},{x:"84%",y:"8%",s:5,r:"0"},
          {x:"12%",y:"42%",s:6,r:"20deg"},{x:"57%",y:"38%",s:4,r:"0"},
          {x:"80%",y:"40%",s:7,r:"-20deg"},
        ].map((p,i)=>(
          <span key={i} className="absolute pointer-events-none"
            style={{left:p.x,top:p.y,width:p.s,height:p.s,background:"rgba(212,175,55,0.7)",transform:`rotate(${p.r})`,borderRadius:1}} />
        ))}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 400 32" preserveAspectRatio="none" className="w-full h-8 block">
            <path d="M0 32 C100 8, 300 22, 400 4 L400 32 Z" fill="white"/>
          </svg>
        </div>
      </div>
      <div className="flex justify-center -mt-9 relative z-10 mb-2">
        <div className="w-[58px] h-[58px] rounded-full border-[4px] border-white shadow-xl flex items-center justify-center"
          style={{background:"linear-gradient(135deg,#D4AF37 0%,#F7C948 50%,#B8860B 100%)",boxShadow:"0 4px 14px rgba(180,140,30,0.4)"}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M4 13l6 7L20 6" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      <div className="px-4 pb-3 text-center">
        <p className="text-[14px] font-black text-gray-900 leading-tight">{tagName}</p>
        <p className="text-[8px] text-gray-400 mt-0.5 mb-3 leading-relaxed">{desc}</p>
        <div className="flex justify-center mb-2">
          <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-white text-[9px] font-bold"
            style={{background:"linear-gradient(135deg,#D4AF37,#B8860B)",boxShadow:"0 3px 10px rgba(180,140,30,0.3)"}}>
            访问主页 <RiArrowRightSLine style={{width:10,height:10,opacity:0.8}} />
          </span>
        </div>
        <p className="text-[8px] text-gray-400 pb-1">关闭</p>
      </div>
    </div>
  );

  /* ── neon — 赛博·极光 ── */
  if (t.layout === "neon") return (
    <div className="rounded-2xl overflow-hidden shadow-md" style={{background:"#050d18"}}>
      <div className="relative flex flex-col items-center pt-5 pb-2 overflow-hidden" style={{background:"#050d18"}}>
        <div className="absolute pointer-events-none" style={{width:150,height:100,top:0,left:"50%",transform:"translateX(-50%)",background:"radial-gradient(ellipse,rgba(123,47,190,0.28) 0%,transparent 70%)"}}/>
        <div className="flex justify-center gap-2 mb-3 relative z-10 w-full px-5">
          <div style={{height:3,flex:3,background:"#FF2D78",borderRadius:2,boxShadow:"0 0 8px #FF2D78"}}/>
          <div style={{height:3,flex:2,background:"#00D2FF",borderRadius:2,boxShadow:"0 0 8px #00D2FF"}}/>
          <div style={{height:3,flex:1,background:"#FFE500",borderRadius:2,boxShadow:"0 0 8px #FFE500"}}/>
        </div>
        <div className="relative z-10 w-[68px] h-[68px] rounded-full flex items-center justify-center"
          style={{background:"rgba(0,210,255,0.08)",border:"2px solid rgba(0,210,255,0.45)",boxShadow:"0 0 22px rgba(0,210,255,0.18)"}}>
          <Icon className="w-6 h-6 text-cyan-400"/>
        </div>
      </div>
      <div className="px-4 pt-2 pb-1 text-center">
        <p className="text-white text-[13px] font-black leading-tight mb-1">{tagName}</p>
        <p className="text-[8px] leading-relaxed" style={{color:"#4a5568"}}>{desc}</p>
      </div>
      <div className="px-4 pb-4 pt-1 flex flex-col items-center gap-1.5">
        <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-[9px] font-bold text-white"
          style={{background:"linear-gradient(135deg,#00D2FF,#7B2FBE)",boxShadow:"0 0 14px rgba(0,210,255,0.3)"}}>
          访问主页 <RiArrowRightSLine style={{width:10,height:10,opacity:0.8}} />
        </span>
        <span className="text-[8px] font-medium" style={{color:"rgba(255,255,255,0.25)"}}>关闭</span>
      </div>
    </div>
  );

  /* ── gradient — 全息·流光 ── */
  if (t.layout === "gradient") return (
    <div className="rounded-2xl overflow-hidden shadow-md flex flex-col"
      style={{background:"linear-gradient(135deg,#FF6B6B 0%,#FFD93D 18%,#6BCB77 36%,#4D96FF 55%,#C77DFF 75%,#FF6B6B 100%)"}}>
      <div className="px-4 pt-5 pb-4 flex flex-col items-center text-center flex-1">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[8px] font-bold mb-2.5 tracking-tight"
          style={{border:"1.5px solid rgba(0,0,0,0.52)",color:"rgba(0,0,0,0.72)",background:"rgba(255,255,255,0.35)",backdropFilter:"blur(6px)"}}>
          {tagLabel}
        </span>
        <p className="font-black text-gray-900 leading-tight tracking-tight mb-1.5" style={{fontSize:20,textShadow:"0 1px 4px rgba(255,255,255,0.6)"}}>{tagName}</p>
        <p className="text-[8.5px] leading-relaxed" style={{color:"rgba(30,30,30,0.7)",textShadow:"0 1px 2px rgba(255,255,255,0.4)"}}>{desc}</p>
      </div>
      <div className="px-3 pb-4">
        <div className="rounded-2xl px-3 py-2.5 flex flex-col items-center gap-1.5" style={{background:"rgba(255,255,255,0.85)",backdropFilter:"blur(16px)"}}>
          <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-white text-[9px] font-bold"
            style={{background:"rgba(8,8,20,0.88)"}}>
            访问主页 <RiArrowRightSLine style={{width:10,height:10,opacity:0.6}} />
          </span>
          <p className="text-[7px] font-mono" style={{color:"rgba(80,80,80,0.5)"}}>{linkHost}</p>
        </div>
      </div>
    </div>
  );

  /* ── split — 高反差·黑白 ── */
  if (t.layout === "split") return (
    <div className="rounded-2xl overflow-hidden shadow-md flex" style={{minHeight:140}}>
      <div className="relative flex flex-col items-center justify-center w-[40%] shrink-0 overflow-hidden"
        style={{background:"#000"}}>
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden select-none pointer-events-none">
          <span className="font-black leading-none select-none"
            style={{fontSize:108,color:"rgba(255,255,255,0.045)",lineHeight:1}}>
            {(tagName||"A")[0].toUpperCase()}
          </span>
        </div>
        <div className="absolute top-0 right-0 w-[2.5px] h-full"
          style={{background:"linear-gradient(to bottom,#3B82F6,#6366F1)"}}/>
        <div className="relative z-10 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.09)"}}>
          <Icon className="w-5 h-5 text-white/70"/>
        </div>
        <p className="font-mono tracking-widest uppercase mt-1.5 text-center px-2"
          style={{fontSize:6,color:"rgba(255,255,255,0.18)"}}>{domain}</p>
      </div>
      <div className="flex-1 flex flex-col justify-between px-3 py-3 relative" style={{background:"#FAFAFA"}}>
        <div className="absolute top-2 right-2" style={{color:"#ef4444",fontSize:10,fontWeight:700,lineHeight:1}}>✕</div>
        <div>
          <p className="text-[6.5px] font-bold uppercase tracking-[0.22em] mb-0.5" style={{color:"#6366F1"}}>已认领</p>
          <p className="font-black text-gray-900 leading-none tracking-tight" style={{fontSize:18}}>{tagName}</p>
          <p className="text-[7.5px] mt-0.5 font-mono" style={{color:"#b0b7c3"}}>{domain}</p>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <div className="flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-[7.5px] font-mono truncate" style={{color:"#d1d5db"}}>{domain}</div>
          <div className="shrink-0 px-2 py-1.5 text-white text-[8px] font-bold rounded-md" style={{background:"#111"}}>访问</div>
        </div>
      </div>
    </div>
  );

  /* ── flash — 闪购·电光 ── */
  if (t.layout === "flash") return (
    <div className="rounded-2xl overflow-hidden shadow-md">
      <div className="px-3 py-2 flex items-center justify-between" style={{background:"#FF3800"}}>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{background:"rgba(255,255,255,0.2)"}}>
            <Icon className="w-2.5 h-2.5 text-white"/>
          </div>
          <p className="text-[8px] font-semibold tracking-wide" style={{color:"rgba(255,255,255,0.85)"}}>{domain}</p>
        </div>
        <span style={{color:"rgba(255,255,255,0.5)",fontSize:9,fontWeight:700}}>✕</span>
      </div>
      <div className="flex" style={{minHeight:112}}>
        <div className="w-[44%] shrink-0 flex flex-col justify-end px-3 pb-3 pt-3 relative overflow-hidden"
          style={{background:"#FFE500"}}>
          <svg className="absolute top-2 right-2 pointer-events-none" width={12} height={19} viewBox="0 0 10 18" fill="rgba(255,80,0,0.4)">
            <path d="M7 0L1 10h5L3 18l8-11H6L7 0Z"/>
          </svg>
          <div style={{lineHeight:"0.88"}}>
            <p className="font-black text-[6.5px] uppercase tracking-wide mb-1" style={{color:"#FF3800",lineHeight:1}}>{tagLabel}</p>
            <p className="font-black" style={{fontSize:15,color:"#111",lineHeight:"0.88"}}>{tagName}</p>
            <p className="font-black" style={{fontSize:15,color:"#FFE500",WebkitTextStroke:"1.5px #111",lineHeight:"0.88"}}>{tagName}</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-between px-3 py-3 bg-white relative">
          {[{b:38,r:18,s:9},{b:34,r:7,s:6},{b:8,r:20,s:7}].map((sp,i)=>(
            <svg key={i} width={sp.s} height={sp.s} viewBox="0 0 10 10" className="absolute pointer-events-none"
              style={{right:`${sp.r}px`,bottom:`${sp.b}px`,fill:"#FFB800"}}>
              <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z"/>
            </svg>
          ))}
          <div>
            <p className="font-black text-gray-900 leading-none" style={{fontSize:16}}>{tagName}</p>
            <p className="text-[6.5px] font-bold uppercase tracking-widest mt-0.5" style={{color:"#FF3800"}}>域名认领</p>
          </div>
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-0.5 px-3 py-1 rounded-full text-[8px] font-bold text-white"
              style={{background:"linear-gradient(135deg,#FF3800,#FF6B00)"}}>
              访问主页 <RiArrowRightSLine style={{width:9,height:9,opacity:0.8}} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── classic — Style A: gradient hero strip + floating card ── */
  if (t.layout === "classic") return (
    <div className="rounded-2xl overflow-hidden shadow-md">
      {/* Hero strip */}
      <div className={cn("relative px-3 pt-4 pb-8 flex flex-col items-center overflow-hidden", t.hero)}>
        <div className="absolute inset-0 opacity-[0.06]"
          style={{backgroundImage:"radial-gradient(circle,white 1px,transparent 1px)",backgroundSize:"12px 12px"}} />
        {/* Decorative close X */}
        <span className="absolute top-2.5 right-2.5 text-white/40 text-[8px] font-bold leading-none select-none">✕</span>
        <div className="relative z-10 w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg">
          <Icon className="w-4.5 h-4.5 text-white" style={{width:18,height:18}} />
        </div>
      </div>
      {/* Floating card */}
      <div className="relative -mt-4 mx-2 rounded-[14px] bg-white border border-gray-100 shadow-xl px-3 pt-3 pb-2.5">
        <div className="flex justify-center mb-1.5">
          <span className={cn("inline-flex items-center gap-1 text-[7px] font-semibold px-2 py-0.5 rounded-full", t.badge)}>
            {tagLabel}
          </span>
        </div>
        <p className="text-[11px] font-black text-center text-gray-900 leading-tight mb-1">{tagName}</p>
        <p className="text-[7.5px] text-gray-500 text-center leading-relaxed">{desc}</p>
      </div>
      {/* CTA */}
      <div className="px-2 pt-2 pb-3 bg-white flex justify-center">
        <CtaBtn extra="rounded-lg" />
      </div>
    </div>
  );

  /* ── hero — Style B: full-screen immersive gradient ── */
  if (t.layout === "hero") return (
    <div className={cn("rounded-2xl overflow-hidden shadow-md flex flex-col relative", t.hero)} style={{minHeight:168}}>
      <span className="absolute top-2.5 right-2.5 z-10 text-white/40 text-[8px] font-bold leading-none select-none">✕</span>
      <div className="absolute inset-0 opacity-[0.05]"
        style={{backgroundImage:"radial-gradient(circle,white 1px,transparent 1px)",backgroundSize:"14px 14px"}} />
      {/* Center content */}
      <div className="relative flex-1 flex flex-col items-center justify-center text-center px-4 pt-5 pb-3">
        <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg mb-2.5">
          <Icon className="text-white" style={{width:18,height:18}} />
        </div>
        <p className="text-[12px] font-black text-white leading-tight mb-1.5">{tagName}</p>
        <span className={cn("inline-flex items-center gap-1 text-[7px] font-semibold px-2 py-0.5 rounded-full mb-2", t.badge)}>
          {tagLabel}
        </span>
        <p className="text-[7.5px] text-white/70 leading-relaxed max-w-[120px]">{desc}</p>
      </div>
      {/* Bottom CTA */}
      <div className="relative px-3 pb-3 space-y-1.5">
        <CtaBtn extra="w-full justify-center rounded-xl px-0 py-1.5" />
        <p className="text-center text-[6.5px] text-white/40 font-medium">关闭</p>
      </div>
    </div>
  );

  /* ── minimal — Style C: compact centered card ── */
  if (t.layout === "minimal") return (
    <div className="rounded-2xl overflow-hidden shadow-md bg-white relative flex flex-col items-center px-3 pt-5 pb-3">
      {/* Decorative close */}
      <span className="absolute top-2.5 right-2.5 text-gray-300 text-[8px] font-bold leading-none select-none">✕</span>
      {/* Colored icon */}
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shadow-md mb-2.5", t.hero)}>
        <Icon className="text-white" style={{width:18,height:18}} />
      </div>
      <p className="text-[12px] font-black text-center text-gray-900 leading-tight mb-1.5">{tagName}</p>
      <p className="text-[7.5px] text-gray-500 text-center leading-relaxed mb-2.5 max-w-[110px]">{desc}</p>
      <span className={cn("inline-flex items-center gap-1 text-[7px] font-semibold px-2 py-0.5 rounded mb-3", t.badge)}>
        {tagLabel}
      </span>
      <CtaBtn extra="w-full justify-center rounded-xl px-0 py-1.5" />
      <p className="text-[6.5px] font-mono text-gray-400 mt-2">{domain}</p>
    </div>
  );

  /* ── default standard themes ── */
  return (
    <div className="rounded-2xl overflow-hidden border border-border/40 shadow-md">
      <div className={cn("relative px-4 pt-5 pb-7 text-center overflow-hidden", t.hero)}>
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="relative w-10 h-10 rounded-[12px] bg-white/20 border border-white/30 flex items-center justify-center mx-auto shadow-lg">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-[8px] text-white/70 font-mono mt-1.5 tracking-widest uppercase">{domain}</p>
      </div>
      <div className={cn("relative -mt-4 mx-2.5 rounded-[14px] border shadow-lg px-3 pt-2.5 pb-2.5", t.cardBg, t.cardBorder)}>
        <div className="flex items-start justify-between gap-1.5">
          <span className={cn("text-[13px] font-black leading-tight", t.shimmer)}>{tagName}</span>
          <span className={cn("inline-flex items-center gap-0.5 text-[7px] font-bold px-1.5 py-0.5 rounded-full shrink-0", t.badge)}>
            <RiShieldCheckLine className="w-2 h-2" />{tagLabel}
          </span>
        </div>
        {desc && (
          <p className={cn("text-[8px] mt-1 leading-relaxed", t.cardText === "text-white" ? "text-white/60" : "text-gray-500")}>{desc}</p>
        )}
      </div>
      <div className={cn("px-2.5 pt-2 pb-3 flex justify-center", t.cardBg)}>
        <CtaBtn />
      </div>
    </div>
  );
}
