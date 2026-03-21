import React, { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RiArrowLeftSLine,
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiCheckLine,
  RiCloseLine,
  RiServerLine,
  RiGlobalLine,
  RiRefreshLine,
} from "@remixicon/react";
import { CustomServerEntry } from "@/lib/whois/custom-servers";
import { toast } from "sonner";

type Protocol = "tcp" | "http";

interface ServerRow {
  tld: string;
  entry: CustomServerEntry;
  source: "builtin" | "cctld" | "user";
}

function getProtocol(entry: CustomServerEntry): Protocol {
  if (typeof entry === "object" && entry.type === "http") return "http";
  if (typeof entry === "object" && entry.type === "scraper") return "http";
  return "tcp";
}

function getDisplayHost(entry: CustomServerEntry): string {
  if (typeof entry === "string") return entry;
  if (entry.type === "tcp") return entry.host + (entry.port && entry.port !== 43 ? `:${entry.port}` : "");
  if (entry.type === "scraper") return entry.registryUrl;
  return entry.url;
}

function ProtocolBadge({ protocol }: { protocol: Protocol }) {
  if (protocol === "http") {
    return (
      <Badge className="text-[9px] bg-blue-500/10 text-blue-500 dark:text-blue-400 hover:bg-blue-500/20 border-0 shrink-0">
        HTTP
      </Badge>
    );
  }
  return (
    <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-0 shrink-0">
      TCP 43
    </Badge>
  );
}

function SourceBadge({ source }: { source: ServerRow["source"] }) {
  if (source === "user") {
    return (
      <Badge variant="outline" className="text-[9px] shrink-0">
        Custom
      </Badge>
    );
  }
  if (source === "cctld") {
    return (
      <Badge variant="outline" className="text-[9px] text-muted-foreground shrink-0">
        ccTLD
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[9px] text-muted-foreground shrink-0">
      Built-in
    </Badge>
  );
}

interface AddEditFormProps {
  initial?: { tld: string; entry: CustomServerEntry };
  onSave: (tld: string, entry: CustomServerEntry) => Promise<void>;
  onCancel: () => void;
}

function AddEditForm({ initial, onSave, onCancel }: AddEditFormProps) {
  const [tld, setTld] = useState(initial?.tld ?? "");
  const [protocol, setProtocol] = useState<Protocol>(() =>
    initial ? getProtocol(initial.entry) : "tcp",
  );
  const [host, setHost] = useState(() => {
    if (!initial) return "";
    const e = initial.entry;
    if (typeof e === "string") return e;
    if (e.type === "tcp") return e.host;
    return "";
  });
  const [port, setPort] = useState(() => {
    if (!initial) return "";
    const e = initial.entry;
    if (typeof e === "object" && e.type === "tcp" && e.port) return String(e.port);
    return "";
  });
  const [url, setUrl] = useState(() => {
    if (!initial) return "";
    const e = initial.entry;
    if (typeof e === "object" && e.type === "http") return e.url;
    return "";
  });
  const [httpMethod, setHttpMethod] = useState<"GET" | "POST">(() => {
    if (!initial) return "GET";
    const e = initial.entry;
    if (typeof e === "object" && e.type === "http") return e.method ?? "GET";
    return "GET";
  });
  const [saving, setSaving] = useState(false);

  const buildEntry = (): CustomServerEntry | null => {
    if (protocol === "tcp") {
      if (!host.trim()) return null;
      const p = parseInt(port);
      if (port && (isNaN(p) || p < 1 || p > 65535)) return null;
      if (!port || p === 43) return host.trim();
      return { type: "tcp", host: host.trim(), port: p };
    } else {
      if (!url.trim()) return null;
      return { type: "http", url: url.trim(), method: httpMethod };
    }
  };

  const handleSave = async () => {
    const normalizedTld = tld.trim().toLowerCase().replace(/^\./, "");
    if (!normalizedTld) return;
    const entry = buildEntry();
    if (!entry) return;
    setSaving(true);
    try {
      await onSave(normalizedTld, entry);
    } finally {
      setSaving(false);
    }
  };

  const isValid = (() => {
    const normalizedTld = tld.trim().toLowerCase().replace(/^\./, "");
    if (!normalizedTld) return false;
    if (protocol === "tcp") return !!host.trim();
    return !!url.trim();
  })();

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border/60 bg-muted/20">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">TLD / 域名后缀</label>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">.</span>
          <Input
            placeholder="bn, com.br, co.uk ..."
            value={tld}
            onChange={(e) => setTld(e.target.value)}
            disabled={!!initial}
            className="h-8 text-sm font-mono"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">协议类型</label>
        <div className="flex gap-2">
          <button
            onClick={() => setProtocol("tcp")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
              protocol === "tcp"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <RiServerLine className="w-3.5 h-3.5" />
            TCP 43
          </button>
          <button
            onClick={() => setProtocol("http")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
              protocol === "http"
                ? "border-blue-500/50 bg-blue-500/10 text-blue-500 dark:text-blue-400"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <RiGlobalLine className="w-3.5 h-3.5" />
            HTTP
          </button>
        </div>
      </div>

      {protocol === "tcp" && (
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">WHOIS 服务器主机名</label>
            <Input
              placeholder="whois.example.com"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="h-8 text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">端口（默认 43）</label>
            <Input
              placeholder="43"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="h-8 text-sm font-mono"
              type="number"
              min={1}
              max={65535}
            />
          </div>
        </div>
      )}

      {protocol === "http" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              URL 模板（使用 <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{"{{domain}}"}</code> 代表域名）
            </label>
            <Input
              placeholder="https://whois.example.com/query?domain={{domain}}"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-8 text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">HTTP 方法</label>
            <div className="flex gap-2">
              {(["GET", "POST"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setHttpMethod(m)}
                  className={`px-3 py-1 rounded-md border text-xs font-mono transition-colors ${
                    httpMethod === m
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!isValid || saving}
          className="h-7 text-xs"
        >
          <RiCheckLine className="w-3.5 h-3.5 mr-1" />
          {saving ? "保存中..." : "保存"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-7 text-xs"
        >
          <RiCloseLine className="w-3.5 h-3.5 mr-1" />
          取消
        </Button>
      </div>
    </div>
  );
}

export default function WhoisServersPage() {
  const [allServers, setAllServers] = useState<ServerRow[]>([]);
  const [userTlds, setUserTlds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingTld, setEditingTld] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const BUILTIN_TLDS = new Set(["bn"]);

  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whois-servers");
      const data = await res.json();
      if (!data.success) return;

      const userKeys = new Set<string>(Object.keys(data.userServers ?? {}));
      setUserTlds(userKeys);

      const rows: ServerRow[] = Object.entries(
        data.servers as Record<string, CustomServerEntry>,
      ).map(([tld, entry]) => ({
        tld,
        entry,
        source: userKeys.has(tld)
          ? "user"
          : BUILTIN_TLDS.has(tld)
            ? "builtin"
            : "cctld",
      }));

      rows.sort((a, b) => {
        const order = { user: 0, builtin: 1, cctld: 2 };
        if (order[a.source] !== order[b.source])
          return order[a.source] - order[b.source];
        return a.tld.localeCompare(b.tld);
      });

      setAllServers(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleSave = async (tld: string, entry: CustomServerEntry) => {
    const res = await fetch("/api/whois-servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tld, entry }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(data.message || "已保存");
      setShowAdd(false);
      setEditingTld(null);
      await fetchServers();
    } else {
      toast.error(data.message || "保存失败");
    }
  };

  const handleDelete = async (tld: string) => {
    setDeleting(tld);
    try {
      const res = await fetch(`/api/whois-servers?tld=${encodeURIComponent(tld)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "已删除");
        await fetchServers();
      } else {
        toast.error(data.message || "删除失败");
      }
    } finally {
      setDeleting(null);
    }
  };

  const filtered = allServers.filter(
    (r) =>
      r.tld.includes(search.toLowerCase()) ||
      getDisplayHost(r.entry).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <Head>
        <title>WHOIS 服务器管理 - Next Whois</title>
      </Head>
      <div className="w-full h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden">
        <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 min-h-[calc(100vh-4rem)]">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/">
              <Button variant="ghost" size="icon-sm" className="shrink-0">
                <RiArrowLeftSLine className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">WHOIS 服务器管理</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                自定义各 TLD 的 WHOIS 查询服务器，支持 TCP 和 HTTP 协议
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={fetchServers}
              className="shrink-0 h-8 w-8 p-0"
              title="刷新"
            >
              <RiRefreshLine className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="搜索 TLD 或服务器..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                className="h-8 shrink-0"
                onClick={() => {
                  setShowAdd(true);
                  setEditingTld(null);
                }}
              >
                <RiAddLine className="w-3.5 h-3.5 mr-1" />
                添加
              </Button>
            </div>

            {showAdd && (
              <AddEditForm
                onSave={handleSave}
                onCancel={() => setShowAdd(false)}
              />
            )}

            <Card>
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  <span>服务器列表</span>
                  <span className="font-mono text-xs">
                    {loading ? "加载中..." : `${filtered.length} 条`}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <ScrollArea className="h-[calc(100vh-20rem)]">
                  {loading ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                      加载中...
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                      未找到服务器
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {filtered.map((row) => (
                        <div key={row.tld}>
                          {editingTld === row.tld && row.source === "user" ? (
                            <div className="px-4 py-3">
                              <AddEditForm
                                initial={{ tld: row.tld, entry: row.entry }}
                                onSave={handleSave}
                                onCancel={() => setEditingTld(null)}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                              <code className="text-xs font-mono text-foreground w-20 shrink-0">
                                .{row.tld}
                              </code>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <ProtocolBadge protocol={getProtocol(row.entry)} />
                                <SourceBadge source={row.source} />
                              </div>
                              <span className="text-xs text-muted-foreground font-mono truncate flex-1 min-w-0">
                                {getDisplayHost(row.entry)}
                              </span>
                              {row.source === "user" && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => setEditingTld(row.tld)}
                                    title="编辑"
                                  >
                                    <RiEditLine className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(row.tld)}
                                    disabled={deleting === row.tld}
                                    title="删除"
                                  >
                                    <RiDeleteBinLine className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
              <p className="text-xs font-medium">使用说明</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>
                  <strong>TCP 43</strong>：连接到指定主机的标准 WHOIS 端口，发送域名查询
                </li>
                <li>
                  <strong>HTTP GET/POST</strong>：通过 HTTP 请求查询 WHOIS 数据，URL 中用{" "}
                  <code className="bg-muted px-1 rounded text-[10px]">{"{{domain}}"}</code> 替代域名
                </li>
                <li>用户自定义服务器优先级高于内置列表</li>
                <li>
                  ccTLD 和内置服务器只读，不可删除；点击「添加」可以为同一 TLD 添加自定义覆盖
                </li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
