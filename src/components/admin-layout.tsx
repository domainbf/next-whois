import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { ADMIN_EMAIL } from "@/lib/admin-shared";
import {
  RiDashboardLine, RiSettings4Line, RiUserLine,
  RiShieldCheckLine, RiBellLine, RiArrowLeftLine,
  RiLoader4Line, RiShieldUserLine, RiFeedbackLine,
  RiMenuLine,
} from "@remixicon/react";

const NAV = [
  { href: "/admin", label: "概览", icon: RiDashboardLine, exact: true },
  { href: "/admin/settings", label: "网站设置", icon: RiSettings4Line },
  { href: "/admin/users", label: "用户管理", icon: RiUserLine },
  { href: "/admin/stamps", label: "品牌认领", icon: RiShieldCheckLine },
  { href: "/admin/reminders", label: "订阅提醒", icon: RiBellLine },
  { href: "/admin/feedback", label: "用户反馈", icon: RiFeedbackLine },
];

export function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const email = (session?.user as any)?.email;
  const isAdmin = email?.toLowerCase().trim() === ADMIN_EMAIL;
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

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
            <Link href="/"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-semibold">
              <RiArrowLeftLine className="w-4 h-4" />返回首页
            </Link>
          </div>
        </div>
      </>
    );
  }

  const NavLinks = () => (
    <>
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? router.pathname === href : router.pathname.startsWith(href);
        return (
          <Link key={href} href={href}
            onClick={() => setMobileNavOpen(false)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all",
              active
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      <Head><title>{title ? `${title} · 管理后台` : "管理后台 · Next Whois"}</title></Head>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <RiShieldUserLine className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-none">管理后台</h1>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{email}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <RiArrowLeftLine className="w-3.5 h-3.5" />返回前台
            </Link>
            <button
              className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileNavOpen(v => !v)}
            >
              <RiMenuLine className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileNavOpen && (
          <div className="md:hidden glass-panel border border-border rounded-2xl p-3 mb-4 space-y-0.5">
            <NavLinks />
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar (desktop) */}
          <nav className="hidden md:block w-44 shrink-0 space-y-0.5">
            <NavLinks />
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
