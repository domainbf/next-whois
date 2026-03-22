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
  RiLoader4Line, RiLockLine, RiMailLine,
  RiEyeLine, RiEyeOffLine, RiCheckLine, RiAlertLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/lib/site-settings";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const settings = useSiteSettings();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError("请输入邮箱地址"); return; }
    if (!password) { setError("请输入密码"); return; }
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });
      if (res?.error) {
        setError("邮箱或密码错误，请检查后重试");
      } else {
        toast.success("登录成功，欢迎回来！");
        const callbackUrl = (router.query.callbackUrl as string) || "/dashboard";
        router.replace(callbackUrl);
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  const logoText = settings.site_logo_text || "NEXT WHOIS";
  const subtitle = settings.site_subtitle || "专业的 WHOIS 查询工具";

  return (
    <>
      <Head><title key="site-title">登录 · {settings.site_title || "Next Whois"}</title></Head>
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-sm"
        >
          {/* Logo & heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-4">
              <RiLockLine className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">欢迎回来</h1>
            <p className="text-sm text-muted-foreground mt-1">
              登录你的 <span className="font-semibold text-foreground">{logoText}</span> 账户
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="glass-panel border border-border rounded-2xl p-6 space-y-4">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold">密码</Label>
                  <Link href="/forgot-password" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
                    忘记密码？
                  </Link>
                </div>
                <div className="relative">
                  <RiLockLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="输入密码"
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
                  ? <><RiLoader4Line className="w-4 h-4 animate-spin" />登录中…</>
                  : <><RiCheckLine className="w-4 h-4" />登录</>
                }
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-5 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              还没有账户？{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                立即注册
              </Link>
            </p>
            <p className="text-[10px] text-muted-foreground/50">{subtitle}</p>
          </div>
        </motion.div>
      </div>
    </>
  );
}
