import React from "react";
import Head from "next/head";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiLoader4Line, RiMailLine, RiArrowLeftLine, RiCheckLine } from "@remixicon/react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError("请输入邮箱地址"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/user/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "操作失败，请稍后重试"); return; }
      setSent(true);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title key="site-title">找回密码 · Next WHOIS</title></Head>
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <RiMailLine className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">找回密码</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {sent ? "重置邮件已发送" : "输入注册邮箱，我们将发送重置链接"}
            </p>
          </div>

          {sent ? (
            <div className="glass-panel border border-emerald-400/40 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
                <RiCheckLine className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">邮件已发送</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  如果 <span className="font-mono font-medium text-foreground">{email}</span> 已注册，
                  你将在几分钟内收到密码重置邮件。请检查垃圾邮件文件夹。
                </p>
              </div>
              <p className="text-xs text-muted-foreground">链接有效期 60 分钟</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="glass-panel border border-border rounded-2xl p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold">邮箱地址</Label>
                  <div className="relative">
                    <RiMailLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-9 h-10 rounded-xl"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50/60 dark:bg-red-950/20 border border-red-200/50 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button type="submit" disabled={loading}
                  className="w-full h-10 rounded-xl font-semibold text-sm gap-2">
                  {loading
                    ? <><RiLoader4Line className="w-4 h-4 animate-spin" />发送中…</>
                    : "发送重置邮件"
                  }
                </Button>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground mt-5">
            <Link href="/login" className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">
              <RiArrowLeftLine className="w-3 h-3" />返回登录
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
