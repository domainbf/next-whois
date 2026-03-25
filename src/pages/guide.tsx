import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";
import {
  RiSearchLine, RiBellLine, RiGlobalLine, RiCalendarLine,
  RiCheckLine, RiArrowRightLine, RiMailLine, RiShieldCheckLine,
  RiArrowLeftLine, RiTimeLine, RiInformationLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    id: 1,
    icon: RiSearchLine,
    color: "sky",
    title: "搜索域名",
    subtitle: "在首页查询任意域名",
    desc: "进入首页，在搜索框输入您想监控的域名，例如 google.com，然后点击查询按钮。",
    detail: "支持 WHOIS 与 RDAP 双源查询，自动选择最佳数据源。",
    tip: "支持国际域名（IDN）和 .cn、.io 等各种顶级域",
    visual: (
      <div className="w-full rounded-2xl bg-background border border-border overflow-hidden shadow-sm">
        <div className="h-8 bg-muted/40 flex items-center px-3 gap-2 border-b border-border">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400/70" />
            <div className="w-2 h-2 rounded-full bg-amber-400/70" />
            <div className="w-2 h-2 rounded-full bg-emerald-400/70" />
          </div>
          <div className="flex-1 mx-2 h-4 rounded bg-muted/60 text-[8px] flex items-center px-2 text-muted-foreground/60">
            rdap.co
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 rounded-xl border-2 border-sky-400 dark:border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 px-3 py-2">
            <RiSearchLine className="w-4 h-4 text-sky-500 shrink-0" />
            <span className="text-sm text-foreground/80 font-mono">google.com</span>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <RiGlobalLine className="w-4 h-4 text-sky-500" />
              <span className="text-xs font-bold">GOOGLE.COM</span>
              <div className="ml-auto flex gap-1.5">
                <div className="rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold px-1.5 py-0.5">已注册</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                <div className="text-[8px] text-muted-foreground">注册日期</div>
                <div className="text-[10px] font-mono font-semibold">1997-09-15</div>
              </div>
              <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                <div className="text-[8px] text-muted-foreground">到期日期</div>
                <div className="text-[10px] font-mono font-semibold">2028-09-14</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    icon: RiBellLine,
    color: "violet",
    title: "点击订阅图标",
    subtitle: "一键设置到期提醒",
    desc: "在查询结果页面，点击域名卡片右侧的 🔔 铃铛图标，即可进入订阅提醒页面。",
    detail: "也可以点击右侧的「提醒」快捷按钮，直接跳转到订阅设置。",
    tip: "找不到图标？点击域名卡片右上角区域",
    visual: (
      <div className="w-full rounded-2xl bg-background border border-border overflow-hidden shadow-sm">
        <div className="p-4 space-y-3">
          <div className="rounded-xl border-2 border-violet-400 dark:border-violet-500 bg-violet-50/30 dark:bg-violet-950/10 p-3 space-y-2 relative">
            <div className="flex items-center gap-2">
              <RiGlobalLine className="w-4 h-4 text-sky-500" />
              <span className="text-xs font-bold">GOOGLE.COM</span>
              <div className="ml-auto flex items-center gap-1.5">
                <button className="rounded-lg bg-violet-100 dark:bg-violet-900/40 border-2 border-violet-400 dark:border-violet-500 p-1.5 shadow-sm relative">
                  <RiBellLine className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full flex items-center justify-center">
                    <span className="text-[6px] text-white font-bold">!</span>
                  </span>
                </button>
              </div>
            </div>
            <div className="absolute -bottom-2 right-12 text-violet-500 animate-bounce">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
              <div className="h-full w-3/4 rounded-full bg-emerald-400" />
            </div>
          </div>
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-[10px] text-muted-foreground">点击铃铛图标设置到期提醒</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    icon: RiMailLine,
    color: "emerald",
    title: "填写邮箱 & 提交",
    subtitle: "设置提醒方式与时间",
    desc: "填写接收提醒的邮箱地址，选择提前多少天通知（如 60天、30天、10天等），然后点击「开启到期提醒」。",
    detail: "系统还会在宽限期、赎回期、待删除阶段自动发送提醒邮件。",
    tip: "登录后可在用户中心随时管理或取消订阅",
    visual: (
      <div className="w-full rounded-2xl bg-background border border-border overflow-hidden shadow-sm">
        <div className="p-4 space-y-2.5">
          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <RiMailLine className="w-3 h-3" /> 接收邮箱
            </div>
            <div className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground/70 font-mono">
              your@email.com
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <RiBellLine className="w-3 h-3" /> 提醒时间
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["60天前","30天前","10天前","5天前","1天前"].map((d,i) => (
                <span key={i} className={cn(
                  "text-[9px] rounded-md px-1.5 py-0.5 font-medium",
                  i < 2
                    ? "bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 border border-sky-300 dark:border-sky-700"
                    : "bg-muted/40 text-muted-foreground border border-border"
                )}>{d}</span>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-foreground text-background text-center py-2 text-[11px] font-semibold flex items-center justify-center gap-1.5">
            <RiCheckLine className="w-3.5 h-3.5" /> 开启到期提醒
          </div>
        </div>
      </div>
    ),
  },
];

const features = [
  { icon: RiCalendarLine, text: "到期前 60/30/10/5/1 天邮件提醒" },
  { icon: RiShieldCheckLine, text: "宽限期 · 赎回期 · 待删除全程监控" },
  { icon: RiTimeLine, text: "注册商、DNS、DNSSEC 关键信息速览" },
  { icon: RiInformationLine, text: "支持全球 1000+ 顶级域名（含 .cn .io .cc 等）" },
];

export default function GuidePage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>使用指南 · 域名到期提醒</title>
        <meta name="description" content="了解如何查询域名 WHOIS 信息、订阅到期提醒，轻松守护您的域名资产。" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
            <Link href="/" className="p-2 rounded-xl hover:bg-muted transition-colors -ml-2">
              <RiArrowLeftLine className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <h1 className="text-sm font-bold leading-tight">使用指南</h1>
              <p className="text-[10px] text-muted-foreground">3 步开启域名到期提醒</p>
            </div>
            <div className="ml-auto">
              <Link href="/">
                <Button size="sm" className="h-7 px-3 text-xs rounded-lg gap-1">
                  去查询 <RiArrowRightLine className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pb-16">

          {/* Hero */}
          <div className="pt-8 pb-6 text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 text-xs font-medium mb-2">
              <RiBellLine className="w-3.5 h-3.5" />
              域名到期提醒服务
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              守护您的域名<br />
              <span className="text-sky-500">不再错过续期</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              在手机上查询域名 WHOIS 信息，并订阅到期提醒邮件。仅需 3 步完成设置。
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-6">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const colors = {
                sky: {
                  badge: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800",
                  icon: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800",
                  connector: "bg-sky-200 dark:bg-sky-800",
                },
                violet: {
                  badge: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800",
                  icon: "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800",
                  connector: "bg-violet-200 dark:bg-violet-800",
                },
                emerald: {
                  badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                  icon: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                  connector: "bg-emerald-200 dark:bg-emerald-800",
                },
              }[step.color] as any;

              return (
                <div key={step.id} className="relative">
                  {/* Connector */}
                  {idx < steps.length - 1 && (
                    <div className={cn("absolute left-5 top-[52px] w-0.5 h-full -mb-4 rounded-full opacity-30", colors.connector)} />
                  )}

                  <div className="flex gap-4">
                    {/* Step number + icon */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0", colors.icon)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", colors.badge)}>
                        {step.id}/{steps.length}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-3 pb-2">
                      <div>
                        <h3 className="text-base font-bold">{step.title}</h3>
                        <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                      </div>

                      {/* Visual mockup */}
                      <div className="w-full">
                        {step.visual}
                      </div>

                      <p className="text-sm text-foreground/80 leading-relaxed">{step.desc}</p>

                      <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-muted/30 border border-border">
                        <RiCheckLine className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{step.tip}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Features summary */}
          <div className="mt-8 rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <RiShieldCheckLine className="w-4 h-4 text-emerald-500" />
              服务包含
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {features.map((f, i) => {
                const FIcon = f.icon;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                      <FIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-foreground/80">{f.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 space-y-3">
            <Link href="/" className="block">
              <Button className="w-full h-12 rounded-2xl text-sm font-semibold gap-2">
                <RiSearchLine className="w-4 h-4" />
                前往首页查询域名
              </Button>
            </Link>
            <p className="text-center text-[10px] text-muted-foreground">
              查询完成后，点击域名卡片右侧的 🔔 图标即可订阅提醒
            </p>
          </div>

          {/* Back to remind if has domain */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              返回上一页
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
