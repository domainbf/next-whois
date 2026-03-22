import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiLoader4Line, RiUserAddLine, RiMailLine,
  RiLockLine, RiEyeLine, RiEyeOffLine, RiUserLine,
  RiAlertLine, RiCheckLine, RiShieldCheckLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/lib/site-settings";

function getStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: "", color: "bg-muted" };
  let s = 0;
  if (pwd.length >= 8) s++;
  if (pwd.length >= 12) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  if (s <= 1) return { score: 1, label: "弱", color: "bg-red-500" };
  if (s <= 2) return { score: 2, label: "一般", color: "bg-amber-500" };
  if (s <= 3) return { score: 3, label: "中等", color: "bg-yellow-500" };
  if (s <= 4) return { score: 4, label: "强", color: "bg-emerald-500" };
  return { score: 5, label: "很强", color: "bg-emerald-600" };
}

export default function RegisterPage() {
  const router = useRouter();
  const { status } = useSession();
  const settings = useSiteSettings();
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

  const strength = getStrength(password);
  const passwordsMatch = confirm && password === confirm;
  const passwordsMismatch = confirm && password !== confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError("请输入邮箱地址"); return; }
    if (!password) { setError("请输入密码"); return; }
    if (password.length < 8) { setError("密码至少 8 位"); return; }
    if (password !== confirm) { setError("两次密码输入不一致"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "注册失败，请稍后重试"); return; }
      toast.success("注册成功！正在自动登录…");
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
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  const logoText = settings.site_logo_text || "NEXT WHOIS";
  const registrationOpen = settings.allow_registration !== "" ? settings.allow_registration === "1" : true;

  if (!registrationOpen) {
    return (
      <>
        <Head><title key="site-title">注册已关闭 · {settings.site_title || "Next Whois"}</title></Head>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-700/30 mb-2">
              <RiAlertLine className="w-7 h-7 text-amber-500" />
            </div>
            <h1 className="text-xl font-bold">注册已暂停</h1>
            <p className="text-sm text-muted-foreground">当前网站暂停开放注册，请联系管理员。</p>
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-semibold">
              ← 去登录
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title key="site-title">注册 · {settings.site_title || "Next Whois"}</title></Head>
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-sm"
        >
          {/* Heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-primary/10 border border-primary/20 mb-4">
              <RiUserAddLine className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">创建账户</h1>
            <p className="text-sm text-muted-foreground mt-1">
              注册 <span className="font-semibold text-foreground">{logoText}</span>，管理你的域名
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="glass-panel border border-border rounded-2xl p-6 space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">
                  昵称 <span className="text-muted-foreground font-normal">（可选）</span>
                </Label>
                <div className="relative">
                  <RiUserLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="你的昵称"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="pl-9 h-10 rounded-xl"
                    disabled={loading}
                    maxLength={50}
                  />
                </div>
              </div>

              {/* Email */}
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
                    onChange={e => { setEmail(e.target.value); setError(null); }}
                    className="pl-9 h-10 rounded-xl"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">
                  密码 <span className="text-muted-foreground font-normal">（至少 8 位）</span>
                </Label>
                <div className="relative">
                  <RiLockLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="设置密码"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    className="pl-9 pr-10 h-10 rounded-xl"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPwd ? <RiEyeOffLine className="w-4 h-4" /> : <RiEyeLine className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength */}
                <AnimatePresence>
                  {password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-1 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div
                              key={i}
                              className={cn(
                                "h-1 flex-1 rounded-full transition-all duration-300",
                                i <= strength.score ? strength.color : "bg-muted"
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          密码强度：<span className={cn(
                            "font-semibold",
                            strength.score <= 1 ? "text-red-500" :
                            strength.score <= 2 ? "text-amber-500" :
                            strength.score <= 3 ? "text-yellow-600" :
                            "text-emerald-600"
                          )}>{strength.label}</span>
                          <span className="ml-2 text-muted-foreground/60">（大小写、数字、符号混合更安全）</span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-xs font-semibold">确认密码</Label>
                <div className="relative">
                  <RiLockLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="confirm"
                    type={showPwd ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="再次输入密码"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(null); }}
                    className={cn(
                      "pl-9 pr-9 h-10 rounded-xl transition-colors",
                      passwordsMatch ? "border-emerald-400/60 focus-visible:ring-emerald-400/20" :
                      passwordsMismatch ? "border-red-400/60 focus-visible:ring-red-400/20" : ""
                    )}
                    disabled={loading}
                  />
                  <AnimatePresence>
                    {(passwordsMatch || passwordsMismatch) && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {passwordsMatch
                          ? <RiCheckLine className="w-4 h-4 text-emerald-500" />
                          : <RiAlertLine className="w-4 h-4 text-red-500" />
                        }
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-2 text-xs text-red-500 bg-red-50/70 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30 rounded-xl px-3 py-2.5">
                      <RiAlertLine className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm gap-2"
              >
                {loading
                  ? <><RiLoader4Line className="w-4 h-4 animate-spin" />注册中…</>
                  : <><RiUserAddLine className="w-4 h-4" />创建账户</>
                }
              </Button>

              <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
                注册即表示您同意我们的服务条款和隐私政策
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-5 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              已有账户？{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                立即登录
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
}
