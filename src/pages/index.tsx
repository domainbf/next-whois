import { cn, toSearchURI } from "@/lib/utils";
import Link from "next/link";
import { RiDeleteBinLine, RiHistoryLine, RiGlobalLine, RiCloseLine } from "@remixicon/react";
import React, { useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { detectQueryType, listHistory, removeHistory } from "@/lib/history";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchBox } from "@/components/search_box";
import {
  KeyboardShortcut,
  SearchHotkeysText,
} from "@/components/search_shortcuts";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { useTranslation, TranslationKey } from "@/lib/i18n";
import { motion } from "framer-motion";
import { useSearchHotkeys } from "@/hooks/useSearchHotkeys";
import { format } from "date-fns";

function XRWDisplay() {
  return (
    <div className="relative flex items-center justify-center h-14 flex-1 min-w-0">
      <svg
        viewBox="0 0 240 56"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect
          x="1.5" y="1.5" width="237" height="53"
          rx="13" ry="13"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.18"
          strokeWidth="1.5"
          strokeDasharray="8 5"
          className="text-muted-foreground animate-dash-march"
        />
        <rect
          x="5" y="5" width="230" height="46"
          rx="10" ry="10"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth="1"
          strokeDasharray="4 8"
          className="text-muted-foreground animate-[dash-march_5s_linear_infinite_reverse]"
        />
      </svg>
      <div className="flex flex-col items-center gap-0.5 z-10 select-none">
        <span className="text-shimmer text-2xl font-bold tracking-[0.25em]">
          X.RW
        </span>
        <span className="text-[8px] text-muted-foreground/40 uppercase tracking-[0.4em]">
          next whois
        </span>
      </div>
    </div>
  );
}

function QueryTypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const config = {
    domain: {
      label: "",
      icon: RiGlobalLine,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    ipv4: {
      label: "4",
      icon: null,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    ipv6: {
      label: "6",
      icon: null,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    asn: {
      label: "AS",
      icon: null,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    cidr: {
      label: "/",
      icon: null,
      color: "text-pink-500",
      bg: "bg-pink-500/10",
    },
  }[type] || {
    label: "?",
    icon: null,
    color: "text-gray-500",
    bg: "bg-gray-500/10",
  };

  if (config.icon) {
    const Icon = config.icon;
    return <Icon className={cn("w-3.5 h-3.5", config.color, className)} />;
  }
  return (
    <span className={cn("text-[9px] font-bold", config.color, className)}>
      {config.label}
    </span>
  );
}

function getDateGroupLabel(
  timestamp: number,
  t: (key: TranslationKey) => string,
): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const itemDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  if (itemDate.getTime() === today.getTime()) return t("today");
  if (itemDate.getTime() === yesterday.getTime()) return t("yesterday");
  if (date.getFullYear() === now.getFullYear()) return format(date, "MMM dd");
  return format(date, "MMM dd, yyyy");
}

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);
    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);
    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);

  useSearchHotkeys({});

  const handleSearch = useCallback((query: string) => {
    router.push(toSearchURI(query));
  }, [router]);

  const allHistory = useMemo(() => {
    if (!mounted) return [];
    return listHistory().sort((a, b) => b.timestamp - a.timestamp);
  }, [mounted, refreshTrigger]);

  const groupedHistory = useMemo(() => {
    const groups: { label: string; items: typeof allHistory }[] = [];
    if (allHistory.length === 0) return groups;
    let currentLabel = "";
    let currentGroup: typeof allHistory = [];
    for (const item of allHistory) {
      const label = getDateGroupLabel(item.timestamp, t);
      if (label !== currentLabel) {
        if (currentGroup.length > 0)
          groups.push({ label: currentLabel, items: currentGroup });
        currentLabel = label;
        currentGroup = [item];
      } else {
        currentGroup.push(item);
      }
    }
    if (currentGroup.length > 0)
      groups.push({ label: currentLabel, items: currentGroup });
    return groups;
  }, [allHistory]);

  const handleRemoveHistory = useCallback(
    (query: string) => {
      if (!mounted) return;
      removeHistory(query);
      setRefreshTrigger((prev) => prev + 1);
    },
    [mounted],
  );

  return (
    <ScrollArea className="w-full h-[calc(100vh-4rem)]">
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 min-h-[calc(100vh-4rem)]">
        <div className="mb-6">
          <div className="relative group">
            <SearchBox onSearch={handleSearch} loading={loading} autoFocus />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
              <KeyboardShortcut k="/" />
            </div>
          </div>
          <SearchHotkeysText className="hidden sm:flex mt-2 px-1 justify-end" />

          {/* Mobile only: animated X.RW brand + history drawer */}
          <div className="sm:hidden mt-3 flex items-center gap-2">
            <XRWDisplay />
            <Drawer>
              <DrawerTrigger asChild>
                <button
                  className="flex-shrink-0 w-11 h-11 rounded-xl border border-border bg-muted/20 active:bg-muted/60 transition-colors flex items-center justify-center"
                  aria-label="搜索记录"
                >
                  <RiHistoryLine className="w-5 h-5 text-muted-foreground" />
                </button>
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
                      {groupedHistory.map((group) => (
                        <div key={group.label}>
                          <div className="flex items-center gap-3 py-2 px-1">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                              {group.label}
                            </span>
                            <div className="h-px flex-1 bg-border" />
                          </div>
                          {group.items.map((item) => (
                            <DrawerClose asChild key={`m-${item.query}-${item.timestamp}`}>
                              <Link
                                href={toSearchURI(item.query)}
                                onClick={() => handleSearch(item.query)}
                                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                              >
                                <div className="w-7 h-7 rounded-md grid place-items-center border border-border bg-muted/20 shrink-0">
                                  <QueryTypeIcon type={item.queryType} />
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
                              </Link>
                            </DrawerClose>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <RiHistoryLine className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">{t("no_history_title")}</p>
                    </div>
                  )}
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 mt-2"
          >
            <div className="text-center py-4">
              <span className="text-shimmer text-base font-semibold tracking-wide select-none">
                我知道你很急，但请你先别急
              </span>
            </div>
            <div className="glass-panel border border-border rounded-xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="h-4 w-14 rounded-md bg-muted animate-pulse" />
                  <div className="h-8 w-40 rounded-md bg-muted animate-pulse" />
                  <div className="h-3 w-52 rounded-md bg-muted/70 animate-pulse" />
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2">
                  <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
                  <div className="h-3 w-24 rounded-md bg-muted/60 animate-pulse" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-border/50">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 w-16 rounded bg-muted/60 animate-pulse" />
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-12 rounded bg-muted/50 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-panel border border-border rounded-xl p-6">
              <div className="h-4 w-20 rounded bg-muted/70 animate-pulse mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={loading ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="hidden sm:block"
        >
          {allHistory.length > 0 ? (
            <div className="space-y-1">
              {groupedHistory.map((group) => (
                <div key={group.label}>
                  <div className="flex items-center gap-3 py-2 px-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                      {group.label}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  {group.items.map((item) => (
                    <Link
                      key={`${item.query}-${item.timestamp}`}
                      href={toSearchURI(item.query)}
                      onClick={() => handleSearch(item.query)}
                      className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-md grid place-items-center border border-border bg-muted/20 group-hover:border-primary/30 shrink-0">
                        <QueryTypeIcon type={item.queryType} />
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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveHistory(item.query);
                        }}
                      >
                        <RiDeleteBinLine className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <RiHistoryLine className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {t("no_history_title")}
              </h3>
              <p className="text-xs text-muted-foreground/70">
                {t("no_history_description")}
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </ScrollArea>
  );
}
