import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  RiLoader4Line,
  RiSaveLine,
  RiCheckLine,
  RiCloseLine,
  RiFlashlightLine,
  RiExternalLinkLine,
  RiEyeLine,
  RiEyeOffLine,
  RiKey2Line,
  RiPlugLine,
  RiInformationLine,
} from "@remixicon/react";

interface ApiState {
  nazhumi_enabled: boolean;
  miqingju_enabled: boolean;
  tianhu_enabled: boolean;
  yisi_enabled: boolean;
  yisi_key_configured: boolean;
  yisi_key_from_env: boolean;
  yisi_key_masked: string;
}

interface TestResult {
  ok: boolean;
  details?: string;
  error?: string;
}

const DEFAULT_STATE: ApiState = {
  nazhumi_enabled: true,
  miqingju_enabled: true,
  tianhu_enabled: true,
  yisi_enabled: true,
  yisi_key_configured: false,
  yisi_key_from_env: false,
  yisi_key_masked: "",
};

export default function AdminApiPage() {
  const [state, setState] = useState<ApiState>(DEFAULT_STATE);
  const [yisiKeyInput, setYisiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  useEffect(() => {
    fetch("/api/admin/api-keys")
      .then((r) => r.json())
      .then((d) => {
        setState(d);
        setLoading(false);
      })
      .catch(() => {
        toast.error("加载配置失败");
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        nazhumi_enabled: state.nazhumi_enabled,
        miqingju_enabled: state.miqingju_enabled,
        tianhu_enabled: state.tianhu_enabled,
        yisi_enabled: state.yisi_enabled,
      };
      if (yisiKeyInput) {
        body.yisi_key = yisiKeyInput;
      }

      const r = await fetch("/api/admin/api-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "保存失败");

      if (yisiKeyInput) {
        setState((s) => ({ ...s, yisi_key_configured: true, yisi_key_from_env: false }));
        setYisiKeyInput("");
      }
      toast.success("配置已保存");
    } catch (e: any) {
      toast.error(e.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(service: string) {
    setTesting(service);
    try {
      const r = await fetch(`/api/admin/api-keys?service=${service}`, {
        method: "POST",
      });
      const d: TestResult = await r.json();
      setTestResults((prev) => ({ ...prev, [service]: d }));
      if (d.ok) {
        toast.success(`${service} 连接正常`);
      } else {
        toast.error(`${service} 测试失败：${d.error}`);
      }
    } catch (e: any) {
      setTestResults((prev) => ({ ...prev, [service]: { ok: false, error: e.message } }));
      toast.error("测试请求失败");
    } finally {
      setTesting(null);
    }
  }

  function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
    return (
      <Badge
        variant="outline"
        className={
          ok
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
            : "border-zinc-300 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
        }
      >
        {ok ? (
          <RiCheckLine className="mr-1 h-3 w-3" />
        ) : (
          <RiCloseLine className="mr-1 h-3 w-3" />
        )}
        {label}
      </Badge>
    );
  }

  if (loading) {
    return (
      <AdminLayout title="API 接入">
        <div className="flex h-64 items-center justify-center">
          <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const testResult = (s: string) => testResults[s];

  return (
    <AdminLayout title="API 接入">
      <div className="space-y-6 pb-32 sm:pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">API 接入</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              管理第三方数据源的开关与认证信息
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <RiLoader4Line className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RiSaveLine className="mr-1.5 h-4 w-4" />
            )}
            保存
          </Button>
        </div>

        {/* 哪煮米 */}
        <ServiceCard
          color="bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
          dot="bg-blue-500"
          name="哪煮米"
          name_en="nazhumi.com"
          desc="域名注册价格比价（人工维护，数据精准）"
          link="https://www.nazhumi.com"
          apiDocsLink="https://www.nazhumi.com/api"
          noKey
          enabled={state.nazhumi_enabled}
          onToggle={(v) => setState((s) => ({ ...s, nazhumi_enabled: v }))}
          onTest={() => handleTest("nazhumi")}
          testing={testing === "nazhumi"}
          testResult={testResult("nazhumi")}
        />

        {/* 米情局 */}
        <ServiceCard
          color="bg-teal-100 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400"
          dot="bg-teal-500"
          name="米情局"
          name_en="miqingju.com"
          desc="域名注册价格比价（脚本自动更新，覆盖面广）"
          link="https://miqingju.com"
          apiDocsLink="https://api.miqingju.com"
          noKey
          enabled={state.miqingju_enabled}
          onToggle={(v) => setState((s) => ({ ...s, miqingju_enabled: v }))}
          onTest={() => handleTest("miqingju")}
          testing={testing === "miqingju"}
          testResult={testResult("miqingju")}
        />

        {/* 田虎 tian.hu */}
        <ServiceCard
          color="bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400"
          dot="bg-orange-500"
          name="田虎"
          name_en="tian.hu"
          desc="WHOIS 兜底查询 + 注册商价格比价（免费，无需 Key，25次/分钟）"
          link="https://tian.hu"
          apiDocsLink="https://api.tian.hu/docs"
          noKey
          enabled={state.tianhu_enabled}
          onToggle={(v) => setState((s) => ({ ...s, tianhu_enabled: v }))}
          onTest={() => handleTest("tianhu")}
          testing={testing === "tianhu"}
          testResult={testResult("tianhu")}
        />

        {/* 易思云 yisi.yun */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          {/* Card header */}
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                <RiPlugLine className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-semibold text-sm">
                  易思云
                  <span className="text-xs font-normal text-muted-foreground">yisi.yun</span>
                  <a
                    href="https://yisi.yun"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RiExternalLinkLine className="h-3.5 w-3.5" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  WHOIS 兜底查询（当主要查询失败时作为备用数据源）
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge
                ok={state.yisi_key_configured && state.yisi_enabled}
                label={
                  !state.yisi_key_configured
                    ? "未配置"
                    : state.yisi_enabled
                      ? "已启用"
                      : "已禁用"
                }
              />
              <Switch
                checked={state.yisi_enabled}
                onCheckedChange={(v) => setState((s) => ({ ...s, yisi_enabled: v }))}
              />
            </div>
          </div>

          {/* Key config */}
          <div className="px-5 py-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm">
                  <RiKey2Line className="h-4 w-4 text-muted-foreground" />
                  API Key
                </Label>
                {state.yisi_key_from_env && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <RiInformationLine className="h-3.5 w-3.5" />
                    来自环境变量 YISI_API_KEY
                  </span>
                )}
              </div>

              {state.yisi_key_configured && !yisiKeyInput && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-mono text-muted-foreground">
                  <span className="flex-1">{state.yisi_key_masked}</span>
                  <button
                    className="text-xs text-primary hover:underline shrink-0"
                    onClick={() => setYisiKeyInput(" ")}
                  >
                    更换
                  </button>
                </div>
              )}

              {(!state.yisi_key_configured || yisiKeyInput) && (
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder="输入 yisi.yun API Key"
                    value={yisiKeyInput.trim()}
                    onChange={(e) => setYisiKeyInput(e.target.value)}
                    className="pr-10 font-mono text-sm"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowKey((v) => !v)}
                  >
                    {showKey ? (
                      <RiEyeOffLine className="h-4 w-4" />
                    ) : (
                      <RiEyeLine className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                在{" "}
                <a
                  href="https://yisi.yun/api-docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  yisi.yun/api-docs
                </a>{" "}
                注册账号后获取，免费额度每天 300 次
              </p>
            </div>

            {/* Test result */}
            {testResult("yisi") && (
              <TestResultBanner result={testResult("yisi")!} />
            )}

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTest("yisi")}
                disabled={testing === "yisi" || !state.yisi_key_configured}
              >
                {testing === "yisi" ? (
                  <RiLoader4Line className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RiFlashlightLine className="mr-1.5 h-4 w-4" />
                )}
                测试连接
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function ServiceCard({
  color,
  name,
  name_en,
  desc,
  link,
  apiDocsLink,
  noKey,
  enabled,
  onToggle,
  onTest,
  testing,
  testResult,
}: {
  color: string;
  dot: string;
  name: string;
  name_en: string;
  desc: string;
  link: string;
  apiDocsLink?: string;
  noKey?: boolean;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  onTest: () => void;
  testing: boolean;
  testResult?: TestResult;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
            <RiPlugLine className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-semibold text-sm">
              {name}
              <span className="text-xs font-normal text-muted-foreground">{name_en}</span>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <RiExternalLinkLine className="h-3.5 w-3.5" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={
              enabled
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "border-zinc-300 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
            }
          >
            {enabled ? (
              <RiCheckLine className="mr-1 h-3 w-3" />
            ) : (
              <RiCloseLine className="mr-1 h-3 w-3" />
            )}
            {enabled ? "已启用" : "已禁用"}
          </Badge>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {noKey && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <RiInformationLine className="h-3.5 w-3.5 shrink-0" />
            免费公开 API，无需 Key
            {apiDocsLink && (
              <>
                {" · "}
                <a
                  href={apiDocsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  接口文档
                </a>
              </>
            )}
          </p>
        )}

        {testResult && <TestResultBanner result={testResult} />}

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onTest}
            disabled={testing || !enabled}
          >
            {testing ? (
              <RiLoader4Line className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RiFlashlightLine className="mr-1.5 h-4 w-4" />
            )}
            测试连接
          </Button>
        </div>
      </div>
    </div>
  );
}

function TestResultBanner({ result }: { result: TestResult }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
        result.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
      }`}
    >
      {result.ok ? (
        <RiCheckLine className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <RiCloseLine className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{result.ok ? (result.details ?? "连接成功") : (result.error ?? "连接失败")}</span>
    </div>
  );
}
