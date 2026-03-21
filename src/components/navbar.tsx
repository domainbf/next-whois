"use client";

import * as React from "react";
import {
  RiSunFill,
  RiMoonFill,
  RiSmartphoneFill,
  RiApps2Line,
  RiCodeSSlashLine,
  RiCloseLine,
  RiGlobalLine,
  RiServerLine,
  RiHistoryLine,
  RiDeleteBinLine,
  RiToolsLine,
} from "@remixicon/react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { cn, toSearchURI } from "@/lib/utils";
import { VERSION } from "@/lib/env";
import Link from "next/link";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { LanguageSwitcher } from "./language-switcher";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerClose,
  DrawerTitle,
} from "@/components/ui/drawer";
import { listHistory, removeHistory } from "@/lib/history";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

function HistoryTypeIcon({ type }: { type: string }) {
  const config: Record<string, { label: string; color: string }> = {
    domain: { label: "🌐", color: "text-blue-500" },
    ipv4: { label: "4", color: "text-emerald-600" },
    ipv6: { label: "6", color: "text-purple-500" },
    asn: { label: "AS", color: "text-orange-500" },
    cidr: { label: "/", color: "text-pink-500" },
  };
  const c = config[type] || { label: "?", color: "text-gray-500" };
  if (type === "domain") {
    return <RiGlobalLine className={cn("w-3.5 h-3.5", c.color)} />;
  }
  return <span className={cn("text-[9px] font-bold", c.color)}>{c.label}</span>;
}

function HistoryDrawer() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [refreshTick, setRefreshTick] = React.useState(0);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const allHistory = React.useMemo(() => {
    if (!mounted) return [];
    return listHistory().sort((a, b) => b.timestamp - a.timestamp);
  }, [mounted, refreshTick, open]);

  const grouped = React.useMemo(() => {
    const groups: { label: string; items: typeof allHistory }[] = [];
    if (!allHistory.length) return groups;
    let curLabel = "";
    let curItems: typeof allHistory = [];
    for (const item of allHistory) {
      const date = new Date(item.timestamp);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 86400000);
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      let label =
        d.getTime() === today.getTime()
          ? "今天"
          : d.getTime() === yesterday.getTime()
            ? "昨天"
            : date.getFullYear() === now.getFullYear()
              ? format(date, "M月d日")
              : format(date, "yyyy年M月d日");
      if (label !== curLabel) {
        if (curItems.length) groups.push({ label: curLabel, items: curItems });
        curLabel = label;
        curItems = [item];
      } else {
        curItems.push(item);
      }
    }
    if (curItems.length) groups.push({ label: curLabel, items: curItems });
    return groups;
  }, [allHistory]);

  const handleDelete = React.useCallback(
    (e: React.MouseEvent, query: string) => {
      e.preventDefault();
      e.stopPropagation();
      removeHistory(query);
      setRefreshTick((t) => t + 1);
    },
    [],
  );

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <motion.button
          className="p-2 pr-0 inline-flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          aria-label="搜索记录"
        >
          <RiHistoryLine className="h-[1rem] w-[1rem]" />
        </motion.button>
      </DrawerTrigger>

      <DrawerContent className="max-h-[82vh]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <DrawerTitle className="text-sm font-semibold">搜索记录</DrawerTitle>
          <DrawerClose asChild>
            <button className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              <RiCloseLine className="w-4 h-4 text-muted-foreground" />
            </button>
          </DrawerClose>
        </div>
        <div className="overflow-y-auto px-2 pb-8">
          {allHistory.length > 0 ? (
            <div className="space-y-1">
              {grouped.map((group) => (
                <div key={group.label}>
                  <div className="flex items-center gap-3 py-2 px-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                      {group.label}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  {group.items.map((item) => (
                    <DrawerClose
                      asChild
                      key={`${item.query}-${item.timestamp}`}
                    >
                      <Link
                        href={toSearchURI(item.query)}
                        className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-md grid place-items-center border border-border bg-muted/20 shrink-0">
                          <HistoryTypeIcon type={item.queryType} />
                        </div>
                        <span className="text-sm font-medium truncate flex-1 min-w-0">
                          {item.query}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[8px] px-1.5 py-0 uppercase tracking-wider shrink-0"
                        >
                          {item.queryType}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                          {format(item.timestamp, "h:mm a")}
                        </span>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 shrink-0"
                          onClick={(e) => handleDelete(e, item.query)}
                        >
                          <RiDeleteBinLine className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </Link>
                    </DrawerClose>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <RiHistoryLine className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">暂无搜索记录</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                搜索域名、IP、ASN 后将显示在这里
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  if (!mounted) {
    return (
      <button>
        <span className="sr-only">Toggle theme</span>
      </button>
    );
  }

  return (
    <motion.button
      className={`p-2 pr-0`}
      onClick={toggleTheme}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ opacity: 0, rotate: -180 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 180 }}
          transition={{ duration: 0.2 }}
        >
          {theme === "light" && <RiSunFill className="h-[1rem] w-[1rem]" />}
          {theme === "dark" && <RiMoonFill className="h-[1rem] w-[1rem]" />}
          {theme === "system" && (
            <RiSmartphoneFill className="h-[1rem] w-[1rem]" />
          )}
        </motion.div>
      </AnimatePresence>
      <span className="sr-only">Toggle theme</span>
    </motion.button>
  );
}

interface NavItem {
  label: string;
  labelEn: string;
  href: string;
  icon: React.ReactNode;
  external?: boolean;
  description: string;
}

const navItems: NavItem[] = [
  {
    label: "API 文档",
    labelEn: "API Docs",
    href: "/docs",
    icon: <RiCodeSSlashLine className="h-6 w-6" />,
    description: "查看接口文档与使用示例",
  },
  {
    label: "WHOIS 服务器",
    labelEn: "WHOIS Servers",
    href: "/whois-servers",
    icon: <RiServerLine className="h-6 w-6" />,
    description: "管理与查看 WHOIS 服务器配置",
  },
  {
    label: "域名查询",
    labelEn: "Domain Lookup",
    href: "/",
    icon: <RiGlobalLine className="h-6 w-6" />,
    description: "查询域名、IP、ASN 等信息",
  },
];

export function NavDrawer() {
  const [open, setOpen] = React.useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <motion.button
          className="p-2 pr-0 inline-flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={open ? "close" : "open"}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.15 }}
            >
              {open ? (
                <RiCloseLine className="h-[1rem] w-[1rem]" />
              ) : (
                <RiApps2Line className="h-[1rem] w-[1rem]" />
              )}
            </motion.div>
          </AnimatePresence>
          <span className="sr-only">Navigation menu</span>
        </motion.button>
      </DrawerTrigger>

      <DrawerContent className="pb-safe">
        <div className="px-4 pt-2 pb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-base font-semibold tracking-tight">
                NEXT WHOIS
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                版本 {VERSION} · 导航菜单
              </p>
            </div>
            <DrawerClose asChild>
              <button className="rounded-full p-1.5 hover:bg-muted transition-colors">
                <RiCloseLine className="h-4 w-4 text-muted-foreground" />
              </button>
            </DrawerClose>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {navItems.map((item) => (
              <DrawerClose key={item.href} asChild>
                <Link href={item.href}>
                  <motion.div
                    className={cn(
                      "flex flex-col items-center gap-2.5 p-4 rounded-2xl",
                      "border border-border/60 bg-muted/30",
                      "hover:bg-muted/60 hover:border-primary/30",
                      "transition-colors duration-150 cursor-pointer",
                      "text-center",
                    )}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs font-medium leading-tight">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight hidden sm:block">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                </Link>
              </DrawerClose>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-border/40">
            <p className="text-[11px] text-muted-foreground text-center">
              域名 · IPv4 · IPv6 · ASN · CIDR 全能查询工具
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function Navbar() {
  const isVisible = useScrollDirection();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center">
      <nav
        className={cn(
          "mt-4 px-2 h-10 rounded-full",
          "bg-background shadow-sm",
          "flex items-center gap-6",
          "transition-all duration-300 ease-in-out",
          "border border-primary/25 border-dashed",
          isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0",
        )}
      >
        <Link
          href="/"
          className="text-xs ml-2 font-medium tracking-wide hover:text-primary/80 transition-colors flex items-center"
        >
          NEXT WHOIS
          <p className="text-xs text-muted-foreground ml-1.5">{VERSION}</p>
        </Link>

        <div className="h-4 w-[1px] bg-primary/10" />

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LanguageSwitcher />
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
            <Link href="/tools" className="p-2 pr-0 inline-flex items-center justify-center" aria-label="域名工具箱">
              <RiToolsLine className="h-[1rem] w-[1rem]" />
            </Link>
          </motion.div>
          <HistoryDrawer />
          <NavDrawer />
        </div>
      </nav>
    </div>
  );
}
