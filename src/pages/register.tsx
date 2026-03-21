import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RiLoader4Line, RiUserAddLine, RiMailLine,
  RiLockLine, RiEyeLine, RiEyeOffLine, RiUserLine,
} from "@remixicon/react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const { status } = useSession();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) { setError("请填写邮箱和密码"); return; }
    if (password.length < 8) { setError("密码至少 8 位"); return; }
    if (password !== confirm) { setError("两次密码输入不一致"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "注册失败"); return; }
      toast.success("注册成功，正在登录…");
      const loginRes = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });
      if (loginRes?.ok) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>注册 · Next WHOIS</title></Head>
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <RiUserAddLine className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">创建账户</h1>
            <p className="text-sm text-muted-foreground mt-1">注册 NiC.RW 账户，管理你的域名</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="glass-panel border border-border rounded-2xl p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">昵称 <span className="text-muted-foreground font-normal">（可选）</span></Label>
                <div className="relative">
                  <RiUserLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input id="name" type="text" placeholder="你的昵称" value={name}
                    onChange={e => setName(e.target.value)} className="pl-9 h-10 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">邮箱</Label>
                <div className="relative">
                  <RiMailLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input id="email" type="email" autoComplete="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} className="pl-9 h-10 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">密码 <span className="text-muted-foreground font-normal">（至少 8 位）</span></Label>
                <div className="relative">
                  <RiLockLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input id="password" type={showPwd ? "text" : "password"} autoComplete="new-password"
                    placeholder="设置密码" value={password} onChange={e => setPassword(e.target.value)}
                    className="pl-9 pr-10 h-10 rounded-xl" />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors">
                    {showPwd ? <RiEyeOffLine className="w-4 h-4" /> : <RiEyeLine className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-xs font-semibold">确认密码</Label>
                <div className="relative">
                  <RiLockLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input id="confirm" type={showPwd ? "text" : "password"} autoComplete="new-password"
                    placeholder="再次输入密码" value={confirm} onChange={e => setConfirm(e.target.value)}
                    className="pl-9 h-10 rounded-xl" />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50/60 dark:bg-red-950/20 border border-red-200/50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={loading}
                className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm gap-2">
                {loading ? <><RiLoader4Line className="w-4 h-4 animate-spin" />注册中…</> : "注册"}
              </Button>
            </div>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-5">
            已有账户？{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">立即登录</Link>
          </p>
        </div>
      </div>
    </>
  );
}
