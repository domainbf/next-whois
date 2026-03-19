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
} from "@remixicon/react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { VERSION } from "@/lib/env";
import Link from "next/link";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { LanguageSwitcher } from "./language-switcher";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";

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
          <NavDrawer />
        </div>
      </nav>
    </div>
  );
}
