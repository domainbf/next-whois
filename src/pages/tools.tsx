import React from "react";
import Head from "next/head";
import Link from "next/link";
import { RiArrowLeftSLine, RiExternalLinkLine, RiToolsLine, RiFireLine } from "@remixicon/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TOOL_CATEGORIES, Tool } from "@/lib/tools-data";
import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n";
import { useSession } from "next-auth/react";

const CLICKS_KEY = "tool_clicks";

function loadLocalClicks(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CLICKS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLocalClick(url: string, prev: Record<string, number>): Record<string, number> {
  const next = { ...prev, [url]: (prev[url] || 0) + 1 };
  try {
    localStorage.setItem(CLICKS_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

function mergeClicks(
  local: Record<string, number>,
  remote: Record<string, number>
): Record<string, number> {
  const merged: Record<string, number> = { ...remote };
  for (const [url, count] of Object.entries(local)) {
    merged[url] = Math.max(merged[url] ?? 0, count);
  }
  return merged;
}

export default function ToolsPage() {
  const { t, locale } = useTranslation();
  const { data: session } = useSession();
  const [clicks, setClicks] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    const local = loadLocalClicks();
    setClicks(local);

    fetch("/api/tools/clicks")
      .then((r) => r.json())
      .then((json) => {
        if (json.clicks) {
          setClicks((prev) => mergeClicks(prev, json.clicks));
        }
      })
      .catch(() => {});
  }, [session]);

  const isChinese = locale === "zh" || locale === "zh-tw";
  const getDesc = (tool: Tool) => (isChinese ? tool.desc : tool.descEn);

  const handleClick = (url: string) => {
    setClicks((prev) => {
      const updated = saveLocalClick(url, prev);
      fetch("/api/tools/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }).catch(() => {});
      return updated;
    });
  };

  const sortedCategories = TOOL_CATEGORIES.map((cat) => {
    const sorted = [...cat.tools].sort(
      (a, b) => (clicks[b.url] || 0) - (clicks[a.url] || 0)
    );
    return { ...cat, tools: sorted };
  });

  return (
    <>
      <Head>
        <title key="site-title">{t("tools.page_title")} — NEXT WHOIS</title>
      </Head>
      <ScrollArea className="w-full h-[calc(100vh-4rem)]">
        <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/"
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              <RiArrowLeftSLine className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <RiToolsLine className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none">
                  {t("tools.page_title")}
                </h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("tools.page_subtitle")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {sortedCategories.map((cat) => (
              <section key={cat.id}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-base font-bold tracking-tight">
                    {t(cat.titleKey as Parameters<typeof t>[0])}
                  </h2>
                  {clicks && Object.keys(clicks).length > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] text-orange-500/70 font-medium">
                      <RiFireLine className="w-3 h-3" />
                      {isChinese ? "按点击排序" : "sorted by clicks"}
                    </span>
                  )}
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {cat.tools.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {cat.tools.map((tool, ti) => {
                    const clickCount = clicks[tool.url] || 0;
                    return (
                      <motion.a
                        key={`${tool.url}-${ti}`}
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleClick(tool.url)}
                        className="group flex flex-col gap-1 p-3 rounded-xl border border-border bg-muted/10 hover:bg-muted/40 hover:border-primary/30 transition-all duration-150 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-sm font-semibold leading-tight truncate">
                            {tool.name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {clickCount > 0 && (
                              <span className="text-[9px] text-orange-500/60 tabular-nums">
                                {clickCount}
                              </span>
                            )}
                            <RiExternalLinkLine className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary/60 transition-colors mt-0.5" />
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                          {getDesc(tool)}
                        </span>
                      </motion.a>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-border/40 text-center">
            <p className="text-[11px] text-muted-foreground/50">
              {t("tools.footer")}
            </p>
          </div>
        </main>
      </ScrollArea>
    </>
  );
}
