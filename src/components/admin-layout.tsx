import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { ADMIN_EMAIL } from "@/lib/admin-shared";
import {
  RiDashboardLine, RiDashboardFill,
  RiSettings4Line, RiSettings4Fill,
  RiUserLine, RiUserFill,
  RiShieldCheckLine, RiShieldCheckFill,
  RiBellLine, RiBellFill,
  RiArrowLeftLine, RiLoader4Line,
  RiShieldUserLine, RiFeedbackLine, RiFeedbackFill,
  RiServerLine, RiServerFill,
  RiPlugLine, RiPlugFill,
  RiSearchLine, RiSearchFill,
  RiRadarLine, RiHeart3Line, RiHeart3Fill,
} from "@remixicon/react";

const NAV = [
  { href: "/admin",                 label: "概览", icon: RiDashboardLine,   activeIcon: RiDashboardFill,   exact: true },
  { href: "/admin/users",           label: "用户", icon: RiUserLine,        activeIcon: RiUserFill },
  { href: "/admin/stamps",          label: "品牌", icon: RiShieldCheckLine, activeIcon: RiShieldCheckFill },
  { href: "/admin/reminders",       label: "提醒", icon: RiBellLine,        activeIcon: RiBellFill },
  { href: "/admin/search-records",  label: "查询", icon: RiSearchLine,      activeIcon: RiSearchFill },
  { href: "/admin/feedback",        label: "反馈", icon: RiFeedbackLine,    activeIcon: RiFeedbackFill },
  { href: "/admin/tld-fallback",    label: "兜底", icon: RiRadarLine,       activeIcon: RiRadarLine },
  { href: "/admin/sponsors",        label: "赞助", icon: RiHeart3Line,      activeIcon: RiHeart3Fill },
  { href: "/admin/system",          label: "系统", icon: RiServerLine,      activeIcon: RiServerFill },
  { href: "/admin/api",             label: "API",  icon: RiPlugLine,        activeIcon: RiPlugFill },
  { href: "/admin/settings",        label: "设置", icon: RiSettings4Line,   activeIcon: RiSettings4Fill },
];

export function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const email = (session?.user as any)?.email;
  const isAdmin = email?.toLowerCase().trim() === ADMIN_EMAIL;

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RiLoader4Line className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "unauthenticated" || !isAdmin) {
    return (
      <>
        <Head><title>无权限 · Admin</title></Head>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center mx-auto">
              <RiShieldUserLine className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-xl font-bold">无访问权限</h1>
            <p className="text-sm text-muted-foreground">此页面仅限管理员访问。</p>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-semibold"
            >
              <RiArrowLeftLine className="w-4 h-4" />返回首页
            </button>
          </div>
        </div>
      </>
    );
  }

  function isActive(href: string, exact?: boolean): boolean {
    const p = router.pathname;
    if (exact) return p === href || p === `/${router.locale}${href}` || p.endsWith(href);
    return p === href || p.startsWith(href) || p.endsWith(href);
  }

  function navigate(href: string) {
    router.push(href, undefined, { locale: false });
  }

  return (
    <>
      <Head>
        <title key="site-title">{title ? `${title} · 管理后台` : "管理后台 · Next Whois"}</title>
      </Head>

      {/* ── Desktop layout ──────────────────────────────── */}
      <div className="hidden md:flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r border-border bg-background/80 backdrop-blur-sm flex flex-col py-6 px-3 gap-1 sticky top-0 h-screen overflow-y-auto">
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-3 pb-5 mb-1 border-b border-border/60">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              <RiShieldUserLine className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold leading-none">管理后台</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{email}</p>
            </div>
          </div>

          {/* Nav links */}
          {NAV.map(({ href, label, icon: Icon, activeIcon: ActiveIcon, exact }) => {
            const active = isActive(href, exact);
            return (
              <button
                key={href}
                onClick={() => navigate(href)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {active
                  ? <ActiveIcon className="w-4 h-4 shrink-0" />
                  : <Icon className="w-4 h-4 shrink-0" />
                }
                {label}
              </button>
            );
          })}

          <div className="mt-auto pt-4 border-t border-border/60">
            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <RiArrowLeftLine className="w-3.5 h-3.5" />返回前台
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile layout ───────────────────────────────── */}
      <div className="md:hidden min-h-screen flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <RiShieldUserLine className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-none">
              {title || NAV.find(n => isActive(n.href, n.exact))?.label || "管理后台"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{email}</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted"
          >
            <RiArrowLeftLine className="w-3.5 h-3.5" />
            <span>前台</span>
          </button>
        </header>

        {/* Scrollable content — padding-bottom for bottom nav */}
        <main className="flex-1 overflow-y-auto pb-20">
          <div className="px-4 py-5">
            {children}
          </div>
        </main>

        {/* Fixed bottom tab bar — scrollable when items overflow */}
        <nav className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-bottom">
          <div className="flex items-stretch overflow-x-auto scrollbar-none">
            {NAV.map(({ href, label, icon: Icon, activeIcon: ActiveIcon, exact }) => {
              const active = isActive(href, exact);
              return (
                <button
                  key={href}
                  onClick={() => navigate(href)}
                  className={cn(
                    "flex-none flex flex-col items-center justify-center gap-0.5 py-2.5 px-3 transition-colors min-h-[56px] min-w-[52px]",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {active
                    ? <ActiveIcon className="w-5 h-5" />
                    : <Icon className="w-5 h-5" />
                  }
                  <span className={cn("text-[9px] font-semibold leading-none whitespace-nowrap", active ? "text-primary" : "text-muted-foreground/70")}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
