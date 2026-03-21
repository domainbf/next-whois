import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RiLoader4Line, RiLockLine, RiEyeLine, RiEyeOffLine,
  RiCheckLine, RiArrowLeftLine, RiErrorWarningLine,
} from "@remixicon/react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!password || password.length < 8) { setError("密码至少 8 位"); return; }
    if (password !== confirm) { setError("两次密码输入不一致"); return; }
    if (!token) { setError("无效的重置链接"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/user/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "重置失败，请重新申请"); return; }
      setDone(true);
      toast.success("密码已重置，请重新登录");
      setTimeout(() => router.replace("/login"), 2500);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  const isInvalidToken = !token && router.isReady;

  return (
    <>
      <Head><title>重置密码 · Next WHOIS</title></Head>
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <RiLockLine className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">
              {done ? "密码已重置" : "设置新密码"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {done ? "正在跳转到登录页…" : "请输入你的新密码"}
            </p>
          </div>

          {isInvalidToken ? (
            <div className="glass-panel border border-red-300/40 bg-red-50/30 dark:bg-red-950/20 rounded-2xl p-6 text-center space-y-3">
              <RiErrorWarningLine className="w-8 h-8 text-red-500 mx-auto" />
              <p className="font-semibold text-sm">无效的重置链接</p>
              <p className="text-xs text-muted-foreground">该链接已失效或已被使用，请重新申请密码重置。</p>
              <Link href="/forgot-password">
                <Button size="sm" className="mt-2">重新申请</Button>
              </Link>
            </div>
          ) : done ? (
            <div className="glass-panel border border-emerald-400/40 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
                <RiCheckLine className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="font-semibold text-sm">密码重置成功</p>
              <p className="text-xs text-muted-foreground">即将跳转到登录页面…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="glass-panel border border-border rounded-2xl p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold">
                    新密码 <span className="text-muted-foreground font-normal">（至少 8 位）</span>
                  </Label>
                  <div className="relative">
                    <RiLockLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="设置新密码"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-9 pr-10 h-10 rounded-xl"
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors">
                      {showPwd ? <RiEyeOffLine className="w-4 h-4" /> : <RiEyeLine className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm" className="text-xs font-semibold">确认新密码</Label>
                  <div className="relative">
                    <RiLockLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      id="confirm"
                      type={showPwd ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="再次输入新密码"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      className="pl-9 h-10 rounded-xl"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50/60 dark:bg-red-950/20 border border-red-200/50 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button type="submit" disabled={loading || !token}
                  className="w-full h-10 rounded-xl font-semibold text-sm gap-2">
                  {loading
                    ? <><RiLoader4Line className="w-4 h-4 animate-spin" />重置中…</>
                    : "确认重置密码"
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
