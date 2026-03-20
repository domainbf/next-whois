import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RiArrowLeftLine,
  RiShieldCheckLine,
  RiCheckLine,
  RiFileCopyLine,
  RiExternalLinkLine,
  RiAlertLine,
  RiLoader4Line,
} from "@remixicon/react";
import { toast } from "sonner";

const TAG_STYLES: { id: string; label: string; className: string }[] = [
  { id: "default", label: "默认", className: "border border-border text-foreground bg-background" },
  { id: "official", label: "官方", className: "bg-blue-500 text-white border-0" },
  { id: "brand", label: "品牌", className: "bg-violet-500 text-white border-0" },
  { id: "verified", label: "认证", className: "bg-emerald-500 text-white border-0" },
  { id: "partner", label: "合作", className: "bg-orange-500 text-white border-0" },
  { id: "dev", label: "开发者", className: "bg-sky-500 text-white border-0" },
  { id: "warning", label: "提醒", className: "bg-amber-400 text-white border-0" },
  { id: "premium", label: "高级", className: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0" },
];

function TagBadge({ tagName, tagStyle }: { tagName: string; tagStyle: string }) {
  const style = TAG_STYLES.find((s) => s.id === tagStyle) || TAG_STYLES[0];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold", style.className)}>
      {tagName || style.label}
    </span>
  );
}

type Step = "form" | "verify" | "done";

export default function StampPage() {
  const router = useRouter();
  const domain = String(router.query.domain || "");

  const [step, setStep] = React.useState<Step>("form");
  const [loading, setLoading] = React.useState(false);

  const [form, setForm] = React.useState({
    tagName: "",
    tagStyle: "default",
    link: "",
    description: "",
    nickname: "",
    email: "",
  });

  const [submitResult, setSubmitResult] = React.useState<{
    id: string;
    txtRecord: string;
    txtValue: string;
  } | null>(null);

  const [verifyState, setVerifyState] = React.useState<"idle" | "loading" | "fail" | "dnsError">("idle");

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tagName || !form.nickname || !form.email) {
      toast.error("请填写必填项");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stamp/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitResult({ id: data.id, txtRecord: data.txtRecord, txtValue: data.txtValue });
      setStep("verify");
    } catch (err: any) {
      toast.error(err.message || "提交失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!submitResult) return;
    setVerifyState("loading");
    try {
      const res = await fetch("/api/stamp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: submitResult.id, domain }),
      });
      const data = await res.json();
      if (data.verified) {
        setStep("done");
        setVerifyState("idle");
      } else if (data.dnsError) {
        setVerifyState("dnsError");
      } else {
        setVerifyState("fail");
      }
    } catch {
      setVerifyState("fail");
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("已复制"));
  }

  return (
    <>
      <Head>
        <title>域签申请 · {domain}</title>
      </Head>
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-6 pb-16">
          <div className="flex items-center gap-3 mb-6">
            <Link href={domain ? `/${domain}` : "/"}>
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <RiArrowLeftLine className="w-4 h-4" />
                返回
              </button>
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-sm font-medium text-muted-foreground">{domain}</span>
          </div>

          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="glass-panel border border-border rounded-xl p-5">
                <h1 className="flex items-center gap-2 text-base font-bold mb-4">
                  <RiShieldCheckLine className="w-4 h-4 text-violet-500" />
                  域签申请表单
                </h1>

                <div className="space-y-4">
                  <div className="pb-3 border-b border-border/50">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">基本信息</p>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium mb-1.5 block">
                          域名 <span className="text-red-500">*</span>
                        </Label>
                        <Input value={domain} readOnly className="bg-muted/30 font-mono text-sm" />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          需拥有该域名的 DNS 管理权限以完成所有权验证
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-1.5 block">
                          标签名称 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={form.tagName}
                          onChange={(e) => update("tagName", e.target.value)}
                          placeholder="例如：官方、我的品牌、开发者"
                          maxLength={20}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-1.5 block">跳转链接</Label>
                        <Input
                          value={form.link}
                          onChange={(e) => update("link", e.target.value)}
                          placeholder="https://example.com（可选）"
                          type="url"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pb-3 border-b border-border/50">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">标签样式</p>
                    <div className="grid grid-cols-2 gap-2">
                      {TAG_STYLES.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => update("tagStyle", s.id)}
                          className={cn(
                            "relative py-2.5 px-3 rounded-lg text-sm font-medium transition-all border-2",
                            form.tagStyle === s.id
                              ? "border-violet-400 ring-2 ring-violet-200 dark:ring-violet-800"
                              : "border-transparent",
                          )}
                        >
                          <TagBadge tagName={s.label} tagStyle={s.id} />
                        </button>
                      ))}
                    </div>
                    {form.tagName && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/30 flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground text-xs">预览效果：</span>
                        <TagBadge tagName={form.tagName} tagStyle={form.tagStyle} />
                      </div>
                    )}
                  </div>

                  <div className="pb-3 border-b border-border/50">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">简短描述</p>
                    <textarea
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="简单说明这个标签的用途（选填）..."
                      maxLength={200}
                      rows={3}
                      className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                    />
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      联系信息 <span className="text-red-500">*</span>
                    </p>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium mb-1.5 block">
                          昵称 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={form.nickname}
                          onChange={(e) => update("nickname", e.target.value)}
                          placeholder="您的昵称"
                          maxLength={30}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-1.5 block">
                          邮箱 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={form.email}
                          onChange={(e) => update("email", e.target.value)}
                          placeholder="your@email.com"
                          type="email"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">用于接收验证结果通知</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full gap-2 bg-violet-500 hover:bg-violet-600 text-white border-0"
              >
                {loading ? <RiLoader4Line className="w-4 h-4 animate-spin" /> : <RiShieldCheckLine className="w-4 h-4" />}
                提交申请
              </Button>

              <div className="glass-panel border border-border rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full border border-muted-foreground/30 flex items-center justify-center text-[9px]">i</span>
                  申请须知
                </p>
                {[
                  { title: "所有权验证", desc: "通过 DNS TXT 记录自动验证域名所有权，无需人工审核，即时生效" },
                  { title: "展示效果", desc: "验证通过后，所有查询该域名的用户均可看到你添加的标签信息" },
                  { title: "内容规范", desc: "标签内容应真实合法，禁止虚假宣传或误导性信息" },
                ].map((item) => (
                  <div key={item.title} className="flex gap-2">
                    <RiCheckLine className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </form>
          )}

          {step === "verify" && submitResult && (
            <div className="space-y-4">
              <div className="glass-panel border border-border rounded-xl p-5">
                <h2 className="text-base font-bold mb-1 flex items-center gap-2">
                  <RiShieldCheckLine className="w-4 h-4 text-violet-500" />
                  验证域名所有权
                </h2>
                <p className="text-xs text-muted-foreground mb-5">
                  在你的 DNS 控制台中添加以下 TXT 记录，完成后点击"立即验证"
                </p>

                <div className="space-y-3 mb-5">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">记录主机名</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-mono text-violet-600 dark:text-violet-400 break-all">
                        {submitResult.txtRecord}
                      </code>
                      <button
                        onClick={() => copyText(submitResult.txtRecord)}
                        className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                      >
                        <RiFileCopyLine className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">记录值</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-mono text-emerald-600 dark:text-emerald-400 break-all">
                        {submitResult.txtValue}
                      </code>
                      <button
                        onClick={() => copyText(submitResult.txtValue)}
                        className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                      >
                        <RiFileCopyLine className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30 rounded-lg p-3 mb-5 flex gap-2">
                  <RiAlertLine className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  DNS 记录生效通常需要几分钟到几小时，添加后请稍等片刻再验证
                </div>

                {verifyState === "fail" && (
                  <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200/50 rounded-lg p-3 mb-4 flex gap-2">
                    <RiAlertLine className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    未检测到 TXT 记录，请确认已正确添加后重试
                  </div>
                )}
                {verifyState === "dnsError" && (
                  <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200/50 rounded-lg p-3 mb-4 flex gap-2">
                    <RiAlertLine className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    DNS 查询失败，请确认域名格式正确并稍后重试
                  </div>
                )}

                <Button
                  onClick={handleVerify}
                  disabled={verifyState === "loading"}
                  className="w-full gap-2 bg-violet-500 hover:bg-violet-600 text-white border-0"
                >
                  {verifyState === "loading" ? (
                    <RiLoader4Line className="w-4 h-4 animate-spin" />
                  ) : (
                    <RiShieldCheckLine className="w-4 h-4" />
                  )}
                  立即验证
                </Button>
              </div>

              <button
                onClick={() => setStep("form")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
              >
                ← 返回修改表单
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="glass-panel border border-emerald-300/50 dark:border-emerald-700/40 rounded-xl p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-300/60">
                <RiCheckLine className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mb-1">域签验证成功！</h2>
                <p className="text-sm text-muted-foreground">
                  你的标签已生效，现在查询 <strong>{domain}</strong> 时将显示：
                </p>
              </div>
              <div className="py-3">
                <TagBadge tagName={form.tagName} tagStyle={form.tagStyle} />
              </div>
              <Link href={`/${domain}`}>
                <Button className="gap-2">
                  <RiExternalLinkLine className="w-4 h-4" />
                  查看域名页面
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
