import React from "react";
import Head from "next/head";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RiLoader4Line,
  RiSearchLine,
  RiDeleteBinLine,
  RiRefreshLine,
  RiRobot2Line,
  RiExternalLinkLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TldRule = {
  tld: string;
  grace_period_days: number;
  redemption_period_days: number;
  pending_delete_days: number;
  total_release_days: number;
  source_url: string | null;
  confidence: "high" | "ai" | "est";
  scraped_at: string | null;
  updated_at: string;
};

// Suggested registry URLs for common TLDs
const SUGGESTED_URLS: Record<string, string> = {
  mk: "https://marnet.mk/en/domain-registration/",
  rw: "https://ricta.org.rw/policies/",
  xxx: "https://www.icmregistry.com/policies/",
  bi: "https://www.nic.bi/index.php/domaines",
  cm: "https://www.netcom.cm/en/domain-names/",
  td: "https://www.nic.td/",
  cf: "https://www.nic.cf/",
  sn: "https://www.nic.sn/",
  ml: "https://www.nic.ml/",
  bf: "https://www.nic.bf/",
  tg: "https://www.nic.tg/",
  bj: "https://www.nic.bj/",
  mg: "https://www.nic.mg/",
  tn: "https://www.registre.tn/",
};

export default function AdminTldRulesPage() {
  const [rules, setRules] = React.useState<TldRule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [scraping, setScraping] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ tld: "", source_url: "" });
  const [lastResult, setLastResult] = React.useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tld-rules");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setRules(data.rules ?? []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  // Auto-fill suggested URL when TLD changes
  React.useEffect(() => {
    const tld = form.tld.toLowerCase().replace(/^\./, "");
    if (tld && SUGGESTED_URLS[tld] && !form.source_url) {
      setForm(f => ({ ...f, source_url: SUGGESTED_URLS[tld] }));
    }
  }, [form.tld]);

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    const tld = form.tld.toLowerCase().replace(/^\./, "").trim();
    const source_url = form.source_url.trim();
    if (!tld || !source_url) {
      toast.error("请填写 TLD 和注册局页面 URL");
      return;
    }
    setScraping(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/admin/tld-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tld, source_url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "抓取失败");
      setLastResult(data);
      toast.success(`.${tld} 规则提取成功！`);
      setForm({ tld: "", source_url: "" });
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "抓取失败";
      toast.error(msg);
      setLastResult({ error: msg });
    } finally {
      setScraping(false);
    }
  }

  async function handleDelete(tld: string) {
    if (!confirm(`确定删除 .${tld} 的规则吗？`)) return;
    setDeleting(tld);
    try {
      const res = await fetch("/api/admin/tld-rules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tld }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      toast.success(`已删除 .${tld}`);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeleting(null);
    }
  }

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rules;
    return rules.filter(r => r.tld.includes(q));
  }, [rules, search]);

  function confidenceBadge(c: string) {
    if (c === "high") return <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">官方</span>;
    if (c === "ai") return <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">AI</span>;
    return <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">估算</span>;
  }

  return (
    <AdminLayout>
      <Head><title>TLD 生命周期规则 - AI 抓取</title></Head>

      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-xl font-semibold">TLD 生命周期规则 — AI 自动抓取</h1>
          <p className="text-sm text-muted-foreground mt-1">
            从注册局官网爬取域名宽限期规则，通过 GLM-4-Flash 精准提取天数，用于域名释放时间计算。
          </p>
        </div>

        {/* Scrape form */}
        <div className="border rounded-xl p-5 space-y-4 bg-card">
          <h2 className="font-medium flex items-center gap-2">
            <RiRobot2Line className="w-4 h-4 text-blue-500" />
            抓取新 TLD 规则
          </h2>
          <form onSubmit={handleScrape} className="grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">TLD（不含点）</Label>
              <Input
                placeholder="如 mk"
                value={form.tld}
                onChange={e => setForm(f => ({ ...f, tld: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">注册局政策页面 URL</Label>
              <Input
                placeholder="https://nic.mk/en/domain-registration/"
                value={form.source_url}
                onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))}
                className="h-9"
              />
            </div>
            <Button type="submit" disabled={scraping} className="h-9 gap-1.5 shrink-0">
              {scraping ? (
                <><RiLoader4Line className="w-4 h-4 animate-spin" />抓取中…</>
              ) : (
                <><RiRobot2Line className="w-4 h-4" />抓取 &amp; 提取</>
              )}
            </Button>
          </form>

          {scraping && (
            <p className="text-xs text-muted-foreground animate-pulse">
              正在爬取页面，调用 GLM-4-Flash 提取规则，请稍等 5-15 秒…
            </p>
          )}

          {/* Result preview */}
          {lastResult && (
            <div className={cn(
              "rounded-lg p-4 text-sm border",
              lastResult.error
                ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
            )}>
              {lastResult.error ? (
                <div className="flex items-start gap-2 text-red-700 dark:text-red-400">
                  <RiErrorWarningLine className="w-4 h-4 mt-0.5 shrink-0" />
                  {lastResult.error}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
                    <RiCheckboxCircleLine className="w-4 h-4" />
                    .{lastResult.tld} 提取成功
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white dark:bg-black/20 rounded px-3 py-2">
                      <div className="text-muted-foreground">宽限期</div>
                      <div className="font-bold text-lg">{lastResult.grace_period_days}天</div>
                    </div>
                    <div className="bg-white dark:bg-black/20 rounded px-3 py-2">
                      <div className="text-muted-foreground">赎回期</div>
                      <div className="font-bold text-lg">{lastResult.redemption_period_days}天</div>
                    </div>
                    <div className="bg-white dark:bg-black/20 rounded px-3 py-2">
                      <div className="text-muted-foreground">待删除期</div>
                      <div className="font-bold text-lg">{lastResult.pending_delete_days}天</div>
                    </div>
                    <div className="bg-white dark:bg-black/20 rounded px-3 py-2">
                      <div className="text-muted-foreground">总释放天数</div>
                      <div className="font-bold text-lg">{lastResult.total_release_days}天</div>
                    </div>
                  </div>
                  {lastResult.reasoning && (
                    <p className="text-xs text-muted-foreground italic">{lastResult.reasoning}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rules table */}
        <div className="border rounded-xl overflow-hidden bg-card">
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <RiSearchLine className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索 TLD…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 border-0 shadow-none focus-visible:ring-0 p-0 text-sm"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} 条</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load}>
              <RiRefreshLine className="w-3.5 h-3.5" />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RiLoader4Line className="w-5 h-5 animate-spin mr-2" />加载中…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {rules.length === 0 ? "暂无规则，请在上方抓取第一个 TLD" : "无匹配结果"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">TLD</th>
                    <th className="text-right px-3 py-2.5 font-medium">宽限期</th>
                    <th className="text-right px-3 py-2.5 font-medium">赎回期</th>
                    <th className="text-right px-3 py-2.5 font-medium">待删期</th>
                    <th className="text-right px-3 py-2.5 font-medium">总天数</th>
                    <th className="text-left px-3 py-2.5 font-medium">来源</th>
                    <th className="text-left px-3 py-2.5 font-medium">置信度</th>
                    <th className="text-left px-3 py-2.5 font-medium">更新时间</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(r => (
                    <tr key={r.tld} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-medium">.{r.tld}</td>
                      <td className="px-3 py-2.5 text-right">{r.grace_period_days}d</td>
                      <td className="px-3 py-2.5 text-right">{r.redemption_period_days}d</td>
                      <td className="px-3 py-2.5 text-right">{r.pending_delete_days}d</td>
                      <td className="px-3 py-2.5 text-right font-medium">{r.total_release_days}d</td>
                      <td className="px-3 py-2.5">
                        {r.source_url ? (
                          <a
                            href={r.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline max-w-[160px] truncate"
                          >
                            <RiExternalLinkLine className="w-3 h-3 shrink-0" />
                            <span className="truncate">{new URL(r.source_url).hostname}</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">{confidenceBadge(r.confidence)}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {r.updated_at ? new Date(r.updated_at).toLocaleDateString("zh-CN") : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          disabled={deleting === r.tld}
                          onClick={() => handleDelete(r.tld)}
                        >
                          {deleting === r.tld
                            ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                            : <RiDeleteBinLine className="w-3.5 h-3.5" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="rounded-xl border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 p-4 text-sm text-blue-800 dark:text-blue-300 space-y-1.5">
          <p className="font-medium">使用说明</p>
          <ul className="list-disc list-inside space-y-1 text-xs leading-relaxed">
            <li>输入 TLD（如 <code>mk</code>）和注册局的域名政策页面 URL，点击"抓取 &amp; 提取"</li>
            <li>系统会爬取页面正文，调用 GLM-4-Flash 自动提取宽限期等4个数字</li>
            <li>提取结果自动保存到数据库，优先级高于代码内置静态值</li>
            <li>数据被 <strong>lifecycle-overrides</strong> 模块读取，直接用于域名释放时间计算和订阅提醒</li>
            <li>同一 TLD 每小时限制抓取一次，防止被注册局封禁</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
