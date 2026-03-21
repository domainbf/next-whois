import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  RiGhostSmileLine,
  RiArrowLeftLine,
  RiSearchLine,
  RiSignalWifiErrorLine,
  RiGlobalLine,
} from "@remixicon/react";
import { toSearchURI } from "@/lib/utils";

const TERMINAL_LINES = [
  { text: "; <<>> DiG 9.18 <<>> this-page.does.not.exist", delay: 0 },
  { text: ";; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 404", delay: 400, highlight: true },
  { text: ";; flags: qr rd ra; QUERY: 1, ANSWER: 0", delay: 800 },
  { text: ";; QUESTION SECTION:", delay: 1100 },
  { text: ";this-page.does.not.exist.   IN  A", delay: 1300 },
  { text: ";; ANSWER SECTION:", delay: 1600 },
  { text: ";; (empty — nothing here)", delay: 1800, dim: true },
  { text: ";; Query time: 404 msec", delay: 2100 },
  { text: ";; SERVER: 8.8.8.8#53", delay: 2300 },
];

const FAKE_WHOIS_FIELDS = [
  { label: "Status", value: "NXDOMAIN", error: true },
  { label: "TTL", value: "0 sec", dim: true },
  { label: "Registrar", value: "— Nobody —", dim: true },
  { label: "Created", value: "Never", dim: true },
  { label: "Expires", value: "Always", dim: true },
  { label: "Query Time", value: "404 ms", dim: true },
];

function RadarAnimation() {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-muted-foreground/20"
          style={{ width: i * 40, height: i * 40 }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.1, 0.5] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut",
          }}
        />
      ))}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          className="absolute top-1/2 left-1/2 w-[50%] h-px origin-left"
          style={{
            background:
              "linear-gradient(to right, transparent, hsl(var(--primary)/0.6))",
            transform: "translateY(-50%)",
          }}
        />
      </motion.div>
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <RiGhostSmileLine className="w-10 h-10 text-muted-foreground/60" />
      </motion.div>
    </div>
  );
}

function TerminalLine({
  text,
  highlight,
  dim,
  index,
}: {
  text: string;
  highlight?: boolean;
  dim?: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
      className={[
        "font-mono text-[11px] sm:text-xs leading-relaxed",
        highlight
          ? "text-red-400 font-semibold"
          : dim
            ? "text-muted-foreground/40"
            : "text-muted-foreground/70",
      ].join(" ")}
    >
      {text}
    </motion.div>
  );
}

export default function NotFoundPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showTerminal, setShowTerminal] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const [isZh, setIsZh] = useState(false);

  useEffect(() => {
    const locale =
      typeof window !== "undefined"
        ? (document.cookie
            .split("; ")
            .find((r) => r.startsWith("NEXT_LOCALE="))
            ?.split("=")[1] ?? router.locale ?? "en")
        : "en";
    setIsZh(locale.startsWith("zh"));
  }, [router.locale]);

  useEffect(() => {
    const t1 = setTimeout(() => setShowTerminal(true), 600);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (!showTerminal) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    TERMINAL_LINES.forEach((line, i) => {
      timers.push(
        setTimeout(() => setVisibleLines((v) => Math.max(v, i + 1)), line.delay),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [showTerminal]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(toSearchURI(query.trim()));
  };

  const copy = {
    badge: "NXDOMAIN",
    title: isZh ? "页面不存在" : "Page Not Found",
    subtitle: isZh
      ? "DNS 查询已完成，但此页面从未被注册过。"
      : "DNS lookup complete. This page was never registered.",
    terminal: isZh ? "查询日志" : "Query Log",
    whois: isZh ? "WHOIS 摘要" : "WHOIS Summary",
    searchPlaceholder: isZh ? "搜索一个真实的域名…" : "Search a real domain…",
    home: isZh ? "返回首页" : "Back to Home",
    tip: isZh
      ? "404 是个很正常的 HTTP 状态码，不像 NXDOMAIN 那么罕见"
      : "404 is a perfectly normal HTTP status. Unlike NXDOMAIN, it happens all the time.",
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          className="glass-panel border border-border rounded-xl overflow-hidden"
        >
          <div className="border-b border-border/60 bg-muted/30 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiGlobalLine className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">
                this-page.does.not.exist
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {copy.badge}
            </span>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <RadarAnimation />

              <div className="flex-1 text-center sm:text-left">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <div className="text-7xl sm:text-8xl font-black tracking-tighter text-muted-foreground/20 leading-none select-none mb-3">
                    404
                  </div>
                  <h1 className="text-xl font-semibold text-foreground mb-1">
                    {copy.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {copy.subtitle}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-5 grid grid-cols-3 gap-3"
                >
                  {FAKE_WHOIS_FIELDS.slice(0, 3).map((f, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                        {f.label}
                      </p>
                      <p
                        className={[
                          "text-xs font-semibold",
                          f.error
                            ? "text-red-500"
                            : f.dim
                              ? "text-muted-foreground/50"
                              : "text-foreground",
                        ].join(" ")}
                      >
                        {f.value}
                      </p>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>

            <form onSubmit={handleSearch} className="mt-6">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={copy.searchPlaceholder}
                    className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!query.trim()}
                  className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isZh ? "查询" : "Search"}
                </button>
              </div>
            </form>

            <div className="mt-4 flex items-center justify-center sm:justify-start">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RiArrowLeftLine className="w-3.5 h-3.5" />
                {copy.home}
              </Link>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showTerminal && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="glass-panel border border-border rounded-xl overflow-hidden"
            >
              <div className="border-b border-border/60 bg-muted/30 px-4 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                </div>
                <span className="text-[11px] font-mono text-muted-foreground/60 ml-1">
                  {copy.terminal}
                </span>
                <RiSignalWifiErrorLine className="w-3.5 h-3.5 text-red-400/60 ml-auto" />
              </div>
              <div className="p-4 space-y-0.5 bg-muted/10">
                {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
                  <TerminalLine
                    key={i}
                    index={i}
                    text={line.text}
                    highlight={line.highlight}
                    dim={line.dim}
                  />
                ))}
                {visibleLines < TERMINAL_LINES.length && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="inline-block w-1.5 h-3 bg-muted-foreground/40 rounded-sm ml-0.5 align-middle"
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="text-center text-[11px] text-muted-foreground/40 px-4"
        >
          {copy.tip}
        </motion.p>
      </div>
    </div>
  );
}
