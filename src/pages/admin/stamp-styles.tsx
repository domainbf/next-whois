import React from "react";
import { AdminLayout } from "@/components/admin-layout";
import { cn } from "@/lib/utils";
import {
  RiShieldCheckLine, RiArrowRightSLine,
  RiIdCardLine, RiBuildingLine, RiAwardLine, RiVipCrownLine,
  RiShakeHandsLine, RiCodeSLine, RiAlertLine,
} from "@remixicon/react";

/* ── Mirror of CARD_THEMES from [..query].tsx ─────────────────────── */
type CardThemeDef = {
  hero: string; shimmer: string;
  badge: string; btn: string;
  cardBg: string; cardBorder: string; cardText: string;
  layout?: "default" | "celebrate" | "neon" | "gradient" | "split";
  accent?: string; accentText?: string;
};

const CARD_THEMES: Record<string, CardThemeDef & { label: string; special?: string }> = {
  app:       { label: "经典",     hero: "bg-gradient-to-br from-zinc-700 to-zinc-900",                          shimmer: "text-white font-black",       badge: "bg-white/15 text-white border border-white/25",         btn: "bg-zinc-800 text-white",       cardBg: "bg-white",   cardBorder: "border-gray-100",   cardText: "text-gray-900" },
  glow:      { label: "光晕",     hero: "bg-gradient-to-br from-teal-400 to-teal-600",                          shimmer: "text-white font-black",       badge: "bg-teal-500 text-white border-0",                       btn: "bg-teal-500 text-white",       cardBg: "bg-white",   cardBorder: "border-teal-100",   cardText: "text-gray-900" },
  midnight:  { label: "深夜",     hero: "bg-gradient-to-br from-slate-700 via-blue-900 to-slate-900",           shimmer: "text-white font-black",       badge: "bg-blue-500 text-white border-0",                       btn: "bg-blue-600 text-white",       cardBg: "bg-slate-900",cardBorder: "border-slate-700",  cardText: "text-white"    },
  aurora:    { label: "极光",     hero: "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-400",        shimmer: "text-white font-black",       badge: "bg-fuchsia-500 text-white border-0",                    btn: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white", cardBg: "bg-white", cardBorder: "border-violet-100", cardText: "text-gray-900" },
  solar:     { label: "阳光",     hero: "bg-gradient-to-br from-amber-400 to-orange-600",                       shimmer: "text-white font-black",       badge: "bg-orange-500 text-white border-0",                     btn: "bg-orange-500 text-white",     cardBg: "bg-white",   cardBorder: "border-amber-100",  cardText: "text-gray-900" },
  ink:       { label: "墨水",     hero: "bg-gradient-to-br from-zinc-800 via-zinc-900 to-black",                shimmer: "text-white font-black",       badge: "bg-zinc-600 text-white border-0",                       btn: "bg-zinc-700 text-white",       cardBg: "bg-zinc-950",cardBorder: "border-zinc-800",   cardText: "text-white"    },
  rose:      { label: "玫瑰",     hero: "bg-gradient-to-br from-pink-400 via-rose-500 to-red-400",              shimmer: "text-white font-black",       badge: "bg-white/20 text-white border border-white/30",         btn: "bg-rose-500 text-white",       cardBg: "bg-white",   cardBorder: "border-rose-100",   cardText: "text-gray-900" },
  forest:    { label: "森林",     hero: "bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600",         shimmer: "text-white font-black",       badge: "bg-white/20 text-white border border-white/30",         btn: "bg-emerald-600 text-white",    cardBg: "bg-white",   cardBorder: "border-emerald-100",cardText: "text-gray-900" },
  ocean:     { label: "深海",     hero: "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700",           shimmer: "text-white font-black",       badge: "bg-cyan-400 text-slate-900 border-0",                   btn: "bg-cyan-500 text-white",       cardBg: "bg-slate-950",cardBorder: "border-slate-700",  cardText: "text-white"    },
  gold:      { label: "金色",     hero: "bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-400",        shimmer: "text-gray-900 font-black",    badge: "bg-amber-900/70 text-amber-100 border-0",               btn: "bg-amber-500 text-white",      cardBg: "bg-white",   cardBorder: "border-amber-200",  cardText: "text-gray-900" },
  crimson:   { label: "烈焰",     hero: "bg-gradient-to-br from-red-500 via-rose-600 to-red-800",               shimmer: "text-white font-black",       badge: "bg-white/20 text-white border border-white/30",         btn: "bg-red-600 text-white",        cardBg: "bg-white",   cardBorder: "border-red-100",    cardText: "text-gray-900" },
  celebrate: { label: "庆典",     hero: "bg-sky-400",                                  layout: "celebrate",    shimmer: "text-gray-900 font-black",    badge: "bg-white text-blue-700 border-0",                       btn: "bg-indigo-600 text-white",     cardBg: "bg-white",   cardBorder: "border-blue-100",   cardText: "text-gray-900", special: "🎊" },
  neon:      { label: "霓虹",     hero: "bg-[#1a1a1a]",                                layout: "neon",         shimmer: "text-white font-black",       badge: "bg-emerald-400 text-slate-900 border-0",                btn: "bg-emerald-400 text-slate-900",cardBg: "bg-[#1a1a1a]",cardBorder: "border-slate-700", cardText: "text-white",    special: "⚡" },
  gradient:  { label: "渐变流光", hero: "bg-gradient-to-br from-sky-200 via-rose-200 to-amber-200", layout: "gradient", shimmer: "text-gray-900 font-black", badge: "bg-black/10 text-gray-800 border border-black/15",   btn: "bg-gray-900 text-white",       cardBg: "bg-transparent",cardBorder:"border-0",           cardText: "text-gray-900", special: "✨" },
  split:     { label: "分栏",     hero: "bg-gradient-to-b from-slate-700 to-slate-900", layout: "split",      shimmer: "text-gray-900 font-black",    badge: "bg-white/20 text-white border-0",                       btn: "bg-gray-900 text-white",       cardBg: "bg-white",   cardBorder: "border-gray-100",   cardText: "text-gray-900", special: "⊟" },
  flash:     { label: "特卖",     hero: "bg-yellow-300",                               layout: "flash" as any, shimmer: "text-gray-900 font-black",    badge: "bg-violet-600 text-white border-0",                     btn: "bg-violet-600 text-white",     cardBg: "bg-white",   cardBorder: "border-0",          cardText: "text-gray-900", special: "💥" },
};

/* Demo stamp data for preview */
const DEMO = {
  tagName: "品牌示例",
  domain:  "example.com",
  desc:    "这是一条品牌简介示例，展示认领弹窗样式。",
  link:    "https://example.com",
  tagLabel: "品牌认领",
  icon:    RiAwardLine,
};

/* ── Mini popup card preview ─────────────────────────────────────── */
function StampPreviewCard({ themeKey }: { themeKey: string }) {
  const t = CARD_THEMES[themeKey];
  if (!t) return null;
  const Icon = DEMO.icon;

  const CtaBtn = ({ extra }: { extra?: string }) => (
    <div className={cn("flex items-center justify-between w-full px-3 py-2 rounded-xl text-[10px] font-bold", t.btn, extra)}>
      <span>访问主页</span>
      <RiArrowRightSLine className="w-3 h-3 opacity-70" />
    </div>
  );

  /* ── celebrate — sky gradient + wave + glowing indigo badge ── */
  if (t.layout === "celebrate") return (
    <div className="rounded-2xl overflow-hidden shadow-md bg-white">
      <div className="relative px-4 pt-4 pb-12 overflow-hidden"
        style={{background:"linear-gradient(160deg,#7DD3FC 0%,#0EA5E9 100%)"}}>
        {[
          {x:"7%", y:"10%",w:10,h:4,bg:"#f43f5e",r:"-45deg"},{x:"22%",y:"5%", w:6, h:6, bg:"#facc15",r:"0"},
          {x:"38%",y:"20%",w:14,h:3,bg:"#a78bfa",r:"20deg"}, {x:"55%",y:"4%", w:7, h:7, bg:"#34d399",r:"0"},
          {x:"68%",y:"14%",w:12,h:3,bg:"#60a5fa",r:"30deg"}, {x:"82%",y:"8%", w:5, h:5, bg:"#f472b6",r:"0"},
          {x:"12%",y:"38%",w:9, h:3, bg:"#4ade80",r:"15deg"},{x:"50%",y:"32%",w:5, h:5, bg:"#f87171",r:"0"},
          {x:"75%",y:"35%",w:11,h:3,bg:"#38bdf8",r:"-20deg"},{x:"90%",y:"40%",w:8, h:3, bg:"#fbbf24",r:"10deg"},
        ].map((p,i)=>(
          <span key={i} className="absolute pointer-events-none rounded-sm"
            style={{left:p.x,top:p.y,width:p.w,height:p.h,backgroundColor:p.bg,transform:`rotate(${p.r})`}} />
        ))}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 400 32" preserveAspectRatio="none" className="w-full h-8 block">
            <path d="M0 32 C120 4, 280 22, 400 2 L400 32 Z" fill="white"/>
          </svg>
        </div>
      </div>
      <div className="flex justify-center -mt-9 relative z-10 mb-2">
        <div className="relative">
          <div className="absolute inset-0 rounded-full scale-[1.3]" style={{background:"rgba(99,102,241,0.12)"}}/>
          <div className="relative w-[60px] h-[60px] rounded-full border-[4px] border-white shadow-xl flex items-center justify-center ring-[2px] ring-indigo-200/60"
            style={{background:"linear-gradient(135deg,#6366F1,#4338CA)"}}>
            <Icon className="w-6 h-6 text-white"/>
          </div>
        </div>
      </div>
      <div className="px-4 pb-2 text-center">
        <p className="text-[15px] font-black text-gray-900 leading-tight">{DEMO.tagName}</p>
        <p className="text-[9px] text-gray-400 mt-0.5 mb-3">{DEMO.desc}</p>
        <div className="w-full py-2.5 rounded-full text-white text-[10px] font-bold text-center mb-2"
          style={{background:"linear-gradient(135deg,#6366F1,#4338CA)", boxShadow:"0 4px 12px rgba(99,102,241,0.3)"}}>访问主页</div>
        <p className="text-[9px] text-gray-400 pb-2">关闭</p>
      </div>
    </div>
  );

  /* ── neon — #0d1117 + emerald pin + ambient glow + skyline ── */
  if (t.layout === "neon") return (
    <div className="rounded-2xl overflow-hidden shadow-md" style={{background:"#0d1117"}}>
      <div className="relative flex flex-col items-center pt-6 pb-3 overflow-hidden" style={{background:"#0d1117"}}>
        <div className="absolute pointer-events-none" style={{width:140,height:120,top:0,left:"50%",transform:"translateX(-50%)",background:"radial-gradient(ellipse, rgba(34,197,94,0.16) 0%, transparent 68%)"}}/>
        <div className="absolute rounded-full pointer-events-none" style={{width:88,height:88,top:14,left:"50%",transform:"translateX(-50%)",border:"1px solid rgba(34,197,94,0.18)"}}/>
        <div className="flex flex-col items-center z-10">
          <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center" style={{background:"#22c55e",boxShadow:"0 0 20px rgba(34,197,94,0.28)"}}>
            <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center" style={{background:"#0d1117"}}>
              <Icon className="w-5 h-5 text-white"/>
            </div>
          </div>
          <div style={{width:0,height:0,borderLeft:"14px solid transparent",borderRight:"14px solid transparent",borderTop:"18px solid #22c55e",marginTop:"-1px"}}/>
        </div>
        <div className="mt-3 z-10" style={{opacity:0.2}}>
          <svg viewBox="0 0 140 20" className="w-28 h-4" fill="#22c55e">
            <path d="M0 20L0 13 7 13 7 7 10 7 10 4 13 4 13 7 16 7 16 13 23 13 23 9 26 9 26 13 33 13 33 7 36 7 36 2 39 2 39 7 42 7 42 13 53 13 53 10 56 10 56 13 63 13 63 8 66 8 66 3 69 3 69 8 72 8 72 13 83 13 83 9 86 9 86 12 89 12 89 13 97 13 97 7 100 7 100 13 110 13 110 10 113 10 113 5 116 5 116 10 119 10 119 13 127 13 127 11 130 11 130 13 140 13 140 20Z"/>
          </svg>
        </div>
      </div>
      <div className="px-4 pb-2 text-center">
        <p className="text-white text-[14px] font-black leading-tight mb-1">{DEMO.tagName}</p>
        <p className="text-[9px] leading-relaxed" style={{color:"#6b7280"}}>{DEMO.desc}</p>
      </div>
      <div className="px-4 pb-4 pt-2 space-y-1.5">
        <div className="w-full py-2 rounded-xl text-[9px] font-bold text-center" style={{background:"#22c55e",color:"#0d1117"}}>访问主页</div>
        <div className="w-full py-2 rounded-xl text-[9px] font-bold text-white/70 text-center" style={{border:"1.5px solid rgba(255,255,255,0.13)"}}>关闭</div>
      </div>
    </div>
  );

  /* ── gradient — multi-radial Apple Card soft gradient ── */
  if (t.layout === "gradient") return (
    <div className="rounded-2xl overflow-hidden shadow-md flex flex-col"
      style={{background:"radial-gradient(ellipse at 22% 28%, rgba(147,197,253,0.92) 0%, transparent 55%), radial-gradient(ellipse at 78% 22%, rgba(249,168,212,0.85) 0%, transparent 55%), radial-gradient(ellipse at 72% 82%, rgba(253,230,138,0.88) 0%, transparent 55%), radial-gradient(ellipse at 22% 82%, rgba(167,243,208,0.6) 0%, transparent 55%), #fafcff"}}>
      <div className="px-4 pt-5 pb-4 flex flex-col items-center text-center flex-1">
        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-bold mb-3 tracking-tight"
          style={{border:"2px solid rgba(20,20,20,0.6)", color:"rgba(20,20,20,0.75)"}}>
          {DEMO.tagLabel}
        </span>
        <p className="font-black text-gray-900 leading-tight tracking-tight mb-2" style={{fontSize:22}}>{DEMO.tagName}</p>
        <p className="text-[9.5px] text-gray-600 leading-relaxed">{DEMO.desc}</p>
      </div>
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-white text-[9px] font-bold"
          style={{background:"rgba(15,20,35,0.85)"}}>
          <span>访问主页</span><span style={{opacity:0.6}}>→</span>
        </div>
        <p className="text-[8px] text-center font-mono mt-1.5" style={{color:"rgba(100,100,100,0.6)"}}>{DEMO.domain}</p>
      </div>
    </div>
  );

  /* ── split — navy left with ghost initial + white right ── */
  if (t.layout === "split") return (
    <div className="rounded-2xl overflow-hidden shadow-md flex" style={{minHeight:140}}>
      <div className="relative flex flex-col items-center justify-center w-[38%] shrink-0 overflow-hidden"
        style={{background:"linear-gradient(145deg,#1e3a5f 0%,#0f172a 100%)"}}>
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden select-none pointer-events-none">
          <span className="font-black leading-none select-none" style={{fontSize:100,color:"rgba(255,255,255,0.04)",lineHeight:1}}>
            {(DEMO.tagName||"A")[0].toUpperCase()}
          </span>
        </div>
        <div className="absolute top-0 right-0 w-[2px] h-full" style={{background:"linear-gradient(to bottom,#3b82f6,#1d4ed8)"}}/>
        <div className="relative z-10 w-9 h-9 rounded-xl flex items-center justify-center" style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)"}}>
          <Icon className="w-4 h-4 text-white/80"/>
        </div>
        <p className="text-center px-2 font-mono tracking-widest uppercase mt-1" style={{fontSize:7,color:"rgba(255,255,255,0.22)"}}>{DEMO.domain}</p>
      </div>
      <div className="flex-1 bg-white flex flex-col justify-between px-3 py-3 relative">
        <div className="absolute top-2 right-2" style={{color:"#ef4444",fontSize:10,fontWeight:700,lineHeight:1}}>✕</div>
        <div className="mt-0.5">
          <p className="text-[7px] font-semibold uppercase tracking-[0.2em] mb-0.5" style={{color:"#9ca3af"}}>域名认领</p>
          <p className="font-black text-gray-900 leading-none tracking-tight" style={{fontSize:18}}>{DEMO.tagName}</p>
          <p className="text-[8px] mt-0.5" style={{color:"#9ca3af"}}>{DEMO.domain}</p>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <div className="flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-[8px] font-mono truncate" style={{color:"#d1d5db"}}>{DEMO.domain}</div>
          <div className="shrink-0 px-2 py-1.5 text-white text-[8px] font-bold rounded-md" style={{background:"#111827"}}>访问</div>
        </div>
      </div>
    </div>
  );

  /* ── flash — purple header + gold yellow left + white right + ✦ ── */
  if ((t as any).layout === "flash") return (
    <div className="rounded-2xl overflow-hidden shadow-md">
      <div className="px-3 py-2 flex items-center justify-between" style={{background:"#7c3aed"}}>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{background:"rgba(255,255,255,0.2)"}}>
            <Icon className="w-2.5 h-2.5 text-white"/>
          </div>
          <p className="text-[8px] font-semibold tracking-wide" style={{color:"rgba(255,255,255,0.8)"}}>{DEMO.domain}</p>
        </div>
        <span style={{color:"rgba(255,255,255,0.5)",fontSize:9,fontWeight:700}}>✕</span>
      </div>
      <div className="flex" style={{minHeight:110}}>
        <div className="w-[44%] shrink-0 flex flex-col justify-end px-3 pb-3 pt-2" style={{background:"#FFD700"}}>
          <div style={{lineHeight:"0.88"}}>
            <p className="font-black text-[7px] uppercase tracking-wide mb-1" style={{color:"#6d28d9",lineHeight:1}}>{DEMO.tagLabel}</p>
            <p className="font-black" style={{fontSize:16,color:"#111",lineHeight:"0.88"}}>{DEMO.tagName}</p>
            <p className="font-black" style={{fontSize:16,color:"#FFD700",WebkitTextStroke:"1.5px #111",lineHeight:"0.88"}}>{DEMO.tagName}</p>
            <p className="font-black" style={{fontSize:16,color:"#FFD700",WebkitTextStroke:"1.5px #111",lineHeight:"0.88"}}>{DEMO.tagName}</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-between px-3 py-3 bg-white relative">
          {[{b:40,r:20,s:8},{b:38,r:8,s:6}].map((sp,i)=>(
            <svg key={i} width={sp.s} height={sp.s} viewBox="0 0 10 10" className="absolute pointer-events-none"
              style={{right:`${sp.r}px`,bottom:`${sp.b}px`,fill:"#FBBF24"}}>
              <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z"/>
            </svg>
          ))}
          <div>
            <p className="font-black text-gray-900 leading-none" style={{fontSize:17}}>{DEMO.tagName}</p>
            <p className="text-[7px] font-bold uppercase tracking-widest mt-0.5" style={{color:"#7c3aed"}}>域名认领</p>
          </div>
          <div className="w-full py-1.5 rounded-lg text-[9px] font-bold text-white text-center"
            style={{background:"linear-gradient(135deg,#8B5CF6,#7C3AED)"}}>访问主页</div>
        </div>
      </div>
    </div>
  );

  /* ── default ── */
  return (
    <div className="rounded-2xl overflow-hidden border border-border/40 shadow-md">
      <div className={cn("relative px-4 pt-5 pb-7 text-center overflow-hidden", t.hero)}>
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="relative w-10 h-10 rounded-[12px] bg-white/20 border border-white/30 flex items-center justify-center mx-auto shadow-lg">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-[8px] text-white/70 font-mono mt-1.5 tracking-widest uppercase">{DEMO.domain}</p>
      </div>
      <div className={cn("relative -mt-4 mx-2.5 rounded-[14px] border shadow-lg px-3 pt-2.5 pb-2.5", t.cardBg, t.cardBorder)}>
        <div className="flex items-start justify-between gap-1.5">
          <span className={cn("text-[13px] font-black leading-tight", t.shimmer)}>{DEMO.tagName}</span>
          <span className={cn("inline-flex items-center gap-0.5 text-[7px] font-bold px-1.5 py-0.5 rounded-full shrink-0", t.badge)}>
            <RiShieldCheckLine className="w-2 h-2" />{DEMO.tagLabel}
          </span>
        </div>
      </div>
      <div className={cn("px-2.5 pt-2 pb-3", t.cardBg)}>
        <CtaBtn extra="text-[9px] py-1.5 rounded-xl" />
      </div>
    </div>
  );
}

export default function StampStylesPage() {
  const standardThemes = Object.entries(CARD_THEMES).filter(([, t]) => !t.special);
  const specialThemes  = Object.entries(CARD_THEMES).filter(([, t]) => !!t.special);

  return (
    <AdminLayout title="弹窗样式">
      <div className="space-y-10 max-w-3xl">

        <div>
          <h1 className="text-xl font-bold">弹窗样式一览</h1>
          <p className="text-sm text-muted-foreground mt-1">
            在「品牌管理」编辑认领时可选择以下样式，下方为实际弹窗的缩略预览。
          </p>
        </div>

        {/* ── Standard themes ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            标准配色 · {standardThemes.length} 种
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {standardThemes.map(([key, t]) => (
              <div key={key} className="space-y-1.5">
                <StampPreviewCard themeKey={key} />
                <div className="flex items-center gap-1.5 px-0.5">
                  <p className="text-xs font-semibold">{t.label}</p>
                  <code className="text-[10px] text-muted-foreground/50 font-mono ml-auto">{key}</code>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Special layout themes ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            特殊排版 · {specialThemes.length} 种
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {specialThemes.map(([key, t]) => (
              <div key={key} className="space-y-1.5">
                <StampPreviewCard themeKey={key} />
                <div className="flex items-center gap-1.5 px-0.5">
                  <span className="text-sm leading-none">{t.special}</span>
                  <p className="text-xs font-semibold">{t.label}</p>
                  <code className="text-[10px] text-muted-foreground/50 font-mono ml-auto">{key}</code>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </AdminLayout>
  );
}
