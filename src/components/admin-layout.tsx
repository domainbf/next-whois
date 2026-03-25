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
  RiKeyLine, RiKeyFill, RiGiftLine,
  RiLinksLine, RiTimeLine, RiHistoryLine, RiImageLine, RiFlagLine,
  RiMenuLine, RiCloseLine,
  RiBankCardLine, RiBankCardFill, RiPriceTag3Line,
  RiMailSendLine, RiLayoutGridLine,
  RiRobot2Line,
} from "@remixicon/react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  activeIcon: React.ElementType;
  exact?: boolean;
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "核心",
    items: [
      { href: "/admin",       label: "概览", icon: RiDashboardLine,   activeIcon: RiDashboardFill,   exact: true },
      { href: "/admin/users", label: "用户", icon: RiUserLine,        activeIcon: RiUserFill },
      { href: "/admin/stamps",       label: "品牌", icon: RiShieldCheckLine,  activeIcon: RiShieldCheckFill },
      { href: "/admin/stamp-styles", label: "样式", icon: RiLayoutGridLine,    activeIcon: RiLayoutGridLine },
    ],
  },
  {
    title: "内容",
    items: [
      { href: "/admin/reminders",      label: "提醒", icon: RiBellLine,      activeIcon: RiBellFill },
      { href: "/admin/notify",         label: "通知", icon: RiMailSendLine,  activeIcon: RiMailSendLine },
      { href: "/admin/search-records", label: "查询", icon: RiSearchLine,    activeIcon: RiSearchFill },
      { href: "/admin/feedback",       label: "反馈", icon: RiFeedbackLine,  activeIcon: RiFeedbackFill },
      { href: "/admin/changelog",      label: "日志", icon: RiHistoryLine,   activeIcon: RiHistoryLine },
      { href: "/admin/sponsors",       label: "赞助", icon: RiHeart3Line,    activeIcon: RiHeart3Fill },
    ],
  },
  {
    title: "支付",
    items: [
      { href: "/admin/payment/plans",  label: "套餐",   icon: RiPriceTag3Line, activeIcon: RiPriceTag3Line },
      { href: "/admin/payment/orders", label: "订单",   icon: RiBankCardLine,  activeIcon: RiBankCardFill },
    ],
  },
  {
    title: "配置",
    items: [
      { href: "/admin/tld-fallback",  label: "兜底",   icon: RiRadarLine,    activeIcon: RiRadarLine },
      { href: "/admin/invite-codes",    label: "邀请码", icon: RiKeyLine,    activeIcon: RiKeyFill },
      { href: "/admin/activation-codes", label: "激活码", icon: RiGiftLine,  activeIcon: RiGiftLine },
      { href: "/admin/access-keys",   label: "密钥",   icon: RiShieldUserLine, activeIcon: RiShieldUserLine },
      { href: "/admin/links",         label: "链接",   icon: RiLinksLine,    activeIcon: RiLinksLine },
      { href: "/admin/tld-lifecycle", label: "TLD规则",icon: RiTimeLine,     activeIcon: RiTimeLine },
      { href: "/admin/tld-rules",     label: "AI抓取", icon: RiRobot2Line,   activeIcon: RiRobot2Line },
      { href: "/admin/tld-lifecycle-feedback", label: "TLD纠错", icon: RiFlagLine, activeIcon: RiFlagLine },
      { href: "/admin/og-styles",     label: "OG卡片", icon: RiImageLine,    activeIcon: RiImageLine },
    ],
  },
  {
    title: "系统",
    items: [
      { href: "/admin/system",   label: "系统", icon: RiServerLine,  activeIcon: RiServerFill },
      { href: "/admin/api",      label: "API",  icon: RiPlugLine,    activeIcon: RiPlugFill },
      { href: "/admin/settings", label: "设置", icon: RiSettings4Line, activeIcon: RiSettings4Fill },
    ],
  },
];

const NAV_FLAT: NavItem[] = NAV_GROUPS.flatMap(g => g.items);

const BOTTOM_PINNED: NavItem[] = [
  { href: "/admin",        label: "概览", icon: RiDashboardLine,   activeIcon: RiDashboardFill, exact: true },
  { href: "/admin/users",  label: "用户", icon: RiUserLine,        activeIcon: RiUserFill },
  { href: "/admin/stamps", label: "品牌", icon: RiShieldCheckLine, activeIcon: RiShieldCheckFill },
  { href: "/admin/settings",label: "设置",icon: RiSettings4Line,  activeIcon: RiSettings4Fill },
];

export function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const email = (session?.user as any)?.email;
  const isAdmin = email?.toLowerCase().trim() === ADMIN_EMAIL;
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    if (drawerOpen) setDrawerOpen(false);
  }, [router.pathname]);

  React.useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

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

  const currentLabel = title || NAV_FLAT.find(n => isActive(n.href, n.exact))?.label || "管理后台";

  return (
    <>
      <Head>
        <title key="site-title">{title ? `${title} · 管理后台` : "管理后台 · X.RW"}</title>
      </Head>

      {/* ── Desktop layout ──────────────────────────────── */}
      <div className="hidden md:flex min-h-screen">
        <aside className="w-52 shrink-0 border-r border-border bg-background/80 backdrop-blur-sm flex flex-col py-6 px-3 gap-1 sticky top-0 h-screen overflow-y-auto">
          <div className="flex items-center gap-2.5 px-3 pb-5 mb-1 border-b border-border/60">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              <RiShieldUserLine className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold leading-none">管理后台</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{email}</p>
            </div>
          </div>

          {NAV_GROUPS.map(group => (
            <div key={group.title} className="mb-2">
              <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-3 py-1.5">
                {group.title}
              </p>
              {group.items.map(({ href, label, icon: Icon, activeIcon: ActiveIcon, exact }) => {
                const active = isActive(href, exact);
                return (
                  <button
                    key={href}
                    onClick={() => navigate(href)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left",
                      active
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {active ? <ActiveIcon className="w-4 h-4 shrink-0" /> : <Icon className="w-4 h-4 shrink-0" />}
                    {label}
                  </button>
                );
              })}
            </div>
          ))}

          <div className="mt-auto pt-4 border-t border-border/60">
            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <RiArrowLeftLine className="w-3.5 h-3.5" />返回前台
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile layout ───────────────────────────────── */}
      <div className="md:hidden min-h-screen flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 h-14 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <RiShieldUserLine className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="flex-1 text-sm font-bold truncate">{currentLabel}</p>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted"
          >
            <RiArrowLeftLine className="w-3.5 h-3.5" />
            <span>前台</span>
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"
            aria-label="打开菜单"
          >
            <RiMenuLine className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto pb-20">
          <div className="px-4 py-5">
            {children}
          </div>
        </main>

        {/* Bottom bar — pinned items + more button */}
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border">
          <div className="flex items-stretch h-16">
            {BOTTOM_PINNED.map(({ href, label, icon: Icon, activeIcon: ActiveIcon, exact }) => {
              const active = isActive(href, exact);
              return (
                <button
                  key={href}
                  onClick={() => navigate(href)}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {active ? <ActiveIcon className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  <span className={cn("text-[10px] font-semibold leading-none", active ? "text-primary" : "text-muted-foreground/70")}>
                    {label}
                  </span>
                </button>
              );
            })}
            {/* More button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
                drawerOpen ? "text-primary" : "text-muted-foreground"
              )}
            >
              <RiMenuLine className="w-5 h-5" />
              <span className="text-[10px] font-semibold leading-none text-muted-foreground/70">更多</span>
            </button>
          </div>
          {/* safe area inset */}
          <div className="h-safe-bottom" />
        </nav>

        {/* Drawer overlay */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Drawer panel */}
        <div className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-72 bg-background border-l border-border flex flex-col shadow-2xl transition-transform duration-300 ease-out",
          drawerOpen ? "translate-x-0" : "translate-x-full"
        )}>
          {/* Drawer header */}
          <div className="flex items-center gap-3 px-5 h-14 border-b border-border shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              <RiShieldUserLine className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-none">管理后台</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{email}</p>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <RiCloseLine className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer nav — scrollable */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
            {NAV_GROUPS.map(group => (
              <div key={group.title}>
                <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-3 mb-1.5">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(({ href, label, icon: Icon, activeIcon: ActiveIcon, exact }) => {
                    const active = isActive(href, exact);
                    return (
                      <button
                        key={href}
                        onClick={() => navigate(href)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                          active
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        {active ? <ActiveIcon className="w-4 h-4 shrink-0" /> : <Icon className="w-4 h-4 shrink-0" />}
                        {label}
                        {active && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Drawer footer */}
          <div className="shrink-0 px-3 py-4 border-t border-border/60">
            <button
              onClick={() => { setDrawerOpen(false); navigate("/"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <RiArrowLeftLine className="w-4 h-4 shrink-0" />
              返回前台
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
