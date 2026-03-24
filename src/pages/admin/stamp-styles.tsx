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
  celebrate: { label: "庆典",     hero: "bg-gradient-to-b from-sky-400 to-blue-600",   layout: "celebrate",    shimmer: "text-gray-900 font-black",    badge: "bg-white text-blue-700 border-0",                       btn: "bg-indigo-600 text-white",     cardBg: "bg-white",   cardBorder: "border-blue-100",   cardText: "text-gray-900", special: "🎊" },
  neon:      { label: "霓虹",     hero: "bg-slate-950",                                layout: "neon",         shimmer: "text-white font-black",       badge: "bg-emerald-400 text-slate-900 border-0",                btn: "bg-emerald-400 text-slate-900",cardBg: "bg-slate-900",cardBorder: "border-slate-700",  cardText: "text-white",    special: "⚡" },
  gradient:  { label: "渐变流光", hero: "bg-gradient-to-br from-sky-200 via-rose-200 to-amber-200", layout: "gradient", shimmer: "text-gray-900 font-black", badge: "bg-black/10 text-gray-800 border border-black/15",   btn: "bg-gray-900 text-white",       cardBg: "bg-transparent",cardBorder:"border-0",           cardText: "text-gray-900", special: "✨" },
  split:     { label: "分栏",     hero: "bg-gradient-to-b from-violet-600 to-violet-800", layout: "split",     shimmer: "text-gray-900 font-black",    badge: "bg-violet-500 text-white border-0",                     btn: "bg-violet-600 text-white",     cardBg: "bg-white",   cardBorder: "border-gray-100",   cardText: "text-gray-900", special: "⊟" },
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

  /* ── celebrate ── */
  if (t.layout === "celebrate") return (
    <div className="rounded-2xl overflow-hidden border border-border/40 shadow-md bg-white">
      <div className={cn("relative px-4 py-5 text-center overflow-hidden", t.hero)}>
        {[{t:"10%",l:"8%",w:6,h:2,col:"bg-yellow-300"},{t:"20%",l:"75%",w:5,h:5,col:"bg-pink-400 rounded-full"},{t:"8%",l:"40%",w:8,h:2,col:"bg-white/60"},{t:"25%",l:"55%",w:4,h:4,col:"bg-lime-300 rounded-full"},{t:"35%",l:"12%",w:5,h:2,col:"bg-orange-300"},{t:"5%",l:"82%",w:4,h:4,col:"bg-red-300 rounded-full"}].map((p,i)=>(
          <div key={i} className={cn("absolute pointer-events-none",p.col)} style={{top:p.t,left:p.l,width:p.w,height:p.h}} />
        ))}
        <div className="relative w-10 h-10 rounded-full bg-indigo-600 border-2 border-white shadow-lg flex items-center justify-center mx-auto">
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="px-3 py-3 bg-white text-center">
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold bg-sky-100 text-sky-700 mb-1">
          <RiShieldCheckLine className="w-2 h-2" />{DEMO.tagLabel}
        </div>
        <p className="text-[13px] font-black text-gray-900">{DEMO.tagName}</p>
        <p className="text-[9px] text-gray-400 font-mono mb-2">{DEMO.domain}</p>
        <CtaBtn extra="rounded-lg text-[9px] py-1.5" />
      </div>
    </div>
  );

  /* ── neon ── */
  if (t.layout === "neon") return (
    <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-md bg-slate-950">
      <div className="px-3 pt-4 pb-3 flex gap-2.5 items-start">
        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold bg-emerald-400 text-slate-900 mb-1">
            <RiShieldCheckLine className="w-2 h-2" />{DEMO.tagLabel}
          </div>
          <p className="text-[13px] font-black text-white leading-tight">{DEMO.tagName}</p>
          <p className="text-[8px] text-emerald-400/70 font-mono">{DEMO.domain}</p>
        </div>
      </div>
      <div className="mx-3 border-t border-slate-800 pt-2 pb-3">
        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{DEMO.desc}</p>
      </div>
      <div className="px-3 pb-3">
        <CtaBtn extra="rounded-xl shadow-sm shadow-emerald-400/20 text-[9px] py-1.5" />
      </div>
    </div>
  );

  /* ── gradient ── */
  if (t.layout === "gradient") return (
    <div className={cn("rounded-2xl overflow-hidden border border-black/10 shadow-md", t.hero)}>
      <div className="px-4 pt-5 pb-4 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-bold border bg-black/10 text-gray-800 border-black/15 mb-3">
          <RiShieldCheckLine className="w-2 h-2" />{DEMO.tagLabel}
        </div>
        <div className="w-10 h-10 rounded-2xl bg-black/10 border border-black/10 flex items-center justify-center mb-2">
          <Icon className="w-5 h-5 text-gray-800" />
        </div>
        <p className="text-[14px] font-black text-gray-900 leading-tight">{DEMO.tagName}</p>
        <p className="text-[8px] text-gray-500 font-mono mb-3">{DEMO.domain}</p>
        <CtaBtn extra="bg-gray-900 text-white rounded-xl text-[9px] py-1.5" />
      </div>
    </div>
  );

  /* ── split ── */
  if (t.layout === "split") return (
    <div className="rounded-2xl overflow-hidden border border-border/40 shadow-md flex">
      <div className={cn("relative flex flex-col items-center justify-center px-3 py-4 w-[42%] shrink-0", t.hero)}>
        <div className="w-10 h-10 rounded-[14px] bg-white/20 border border-white/30 flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-[8px] text-white/70 font-mono mt-1.5 tracking-wider">{DEMO.domain}</p>
      </div>
      <div className="flex-1 bg-white px-3 py-3 flex flex-col justify-between">
        <div>
          <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-bold bg-violet-100 text-violet-700 mb-1">
            <RiShieldCheckLine className="w-1.5 h-1.5" />{DEMO.tagLabel}
          </div>
          <p className="text-[12px] font-black text-gray-900">{DEMO.tagName}</p>
          <p className="text-[9px] text-gray-500 leading-tight mt-0.5 line-clamp-2">{DEMO.desc}</p>
        </div>
        <CtaBtn extra="mt-2 rounded-lg text-[8px] py-1" />
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
    <AdminLayout title="弹窗样式预览">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">弹窗样式预览</h1>
          <p className="text-sm text-muted-foreground mt-1">
            以下是所有已认领弹窗（Stamp Detail Dialog）的可选样式，管理员可在品牌管理中为认领记录设置样式。
          </p>
        </div>

        {/* Standard colour themes */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-4 h-0.5 bg-muted-foreground/30 rounded-full" />
            标准配色（11 种）— 经典排版
            <span className="w-4 h-0.5 bg-muted-foreground/30 rounded-full" />
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {standardThemes.map(([key, t]) => (
              <div key={key} className="space-y-2">
                <StampPreviewCard themeKey={key} />
                <div className="flex items-center gap-2 px-1">
                  <span className={cn("w-4 h-4 rounded-md bg-gradient-to-br shrink-0 border border-white/10", CARD_THEMES[key].hero.replace("bg-gradient-to-br","").replace("bg-gradient-to-b",""))} />
                  <p className="text-xs font-semibold">{t.label}</p>
                  <code className="text-[9px] text-muted-foreground/60 font-mono ml-auto">{key}</code>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Special layout themes */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-4 h-0.5 bg-muted-foreground/30 rounded-full" />
            特殊排版（4 种）— 全新布局
            <span className="w-4 h-0.5 bg-muted-foreground/30 rounded-full" />
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {specialThemes.map(([key, t]) => (
              <div key={key} className="space-y-2">
                <StampPreviewCard themeKey={key} />
                <div className="flex items-center gap-2 px-1">
                  <span className="text-base">{t.special}</span>
                  <p className="text-sm font-semibold">{t.label}</p>
                  <code className="text-[9px] text-muted-foreground/60 font-mono ml-auto">{key}</code>
                  <span className="text-[9px] text-muted-foreground/50 border border-border/40 px-1.5 py-0.5 rounded font-mono">特殊布局</span>
                </div>
                <p className="text-[11px] text-muted-foreground/60 px-1 leading-relaxed">
                  {{
                    celebrate: "庆典样式：天空蓝渐变英雄区 + 彩纸粒子 + 圆形图标 + 白色卡片正文",
                    neon:      "霓虹样式：全黑暗背景 + 绿色高亮 + 头像方块 + 极简分割线",
                    gradient:  "流光样式：全屏苹果式渐变背景贯穿全卡，无分割区块",
                    split:     "分栏样式：左侧彩色图标区 / 右侧文字与按钮区，横向双栏",
                  }[key] ?? ""}
                </p>
              </div>
            ))}
          </div>
        </section>

        <p className="text-[11px] text-muted-foreground/40 text-center pb-4">
          样式值可在「品牌管理 → 编辑认领」的「弹窗样式」选择器中设置。
        </p>
      </div>
    </AdminLayout>
  );
}
