import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { RiCheckLine, RiAlertLine, RiLoader4Line, RiArrowLeftLine } from "@remixicon/react";

type State = "loading" | "success" | "not_found" | "error";

export default function CancelPage() {
  const router = useRouter();
  const { locale } = useTranslation();
  const isZh = locale.startsWith("zh");
  const s = (zh: string, en: string) => isZh ? zh : en;

  const [state, setState] = React.useState<State>("loading");
  const [domain, setDomain] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [called, setCalled] = React.useState(false);

  React.useEffect(() => {
    if (!router.isReady || called) return;
    const token = String(router.query.token || "").trim();
    if (!token) {
      setState("error");
      return;
    }
    setCalled(true);
    fetch(`/api/remind/cancel?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (data.ok) {
          setDomain(data.domain || "");
          setEmail(data.email || "");
          setState("success");
        } else if (data.error === "not_found") {
          setState("not_found");
        } else {
          setState("error");
        }
      })
      .catch(() => setState("error"));
  }, [router.isReady, router.query.token, called]);

  const title = s("取消订阅", "Unsubscribe");

  return (
    <>
      <Head>
        <title>{title} — WHOIS</title>
      </Head>

      <div className="min-h-[calc(100vh-64px)] bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm">

          {state === "loading" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center">
                <RiLoader4Line className="w-7 h-7 text-muted-foreground animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">{s("处理中…", "Processing…")}</p>
            </div>
          )}

          {state === "success" && (
            <div className="glass-panel border border-emerald-300/40 dark:border-emerald-700/30 rounded-2xl p-8 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" />
                <div className="relative w-16 h-16 bg-emerald-500/10 border-2 border-emerald-400/40 rounded-full flex items-center justify-center">
                  <RiCheckLine className="w-8 h-8 text-emerald-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                  {s("已取消订阅", "Unsubscribed")}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isZh
                    ? <>已成功取消 <strong className="text-foreground font-mono">{domain}</strong> 的到期提醒。<br /><span className="text-xs opacity-70">{email}</span> 将不再收到相关邮件。</>
                    : <><strong className="text-foreground font-mono">{domain}</strong> expiry reminders have been cancelled.<br /><span className="text-xs opacity-70">{email}</span> will no longer receive emails.</>
                  }
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2 rounded-xl"
                onClick={() => router.push(domain ? `/${domain}` : "/")}
              >
                <RiArrowLeftLine className="w-4 h-4" />
                {s("返回首页", "Go home")}
              </Button>
            </div>
          )}

          {state === "not_found" && (
            <div className="glass-panel border border-border rounded-2xl p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted/40 border-2 border-border flex items-center justify-center">
                <RiAlertLine className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-foreground">
                  {s("未找到订阅", "Subscription not found")}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s("该订阅已取消或不存在。", "This subscription has already been cancelled or does not exist.")}
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2 rounded-xl"
                onClick={() => router.push("/")}
              >
                <RiArrowLeftLine className="w-4 h-4" />
                {s("返回首页", "Go home")}
              </Button>
            </div>
          )}

          {state === "error" && (
            <div className="glass-panel border border-red-200/60 dark:border-red-800/40 rounded-2xl p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-50/60 dark:bg-red-950/20 border-2 border-red-200/50 flex items-center justify-center">
                <RiAlertLine className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-foreground">
                  {s("取消失败", "Something went wrong")}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s("请稍后重试或联系支持。", "Please try again later or contact support.")}
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2 rounded-xl"
                onClick={() => router.push("/")}
              >
                <RiArrowLeftLine className="w-4 h-4" />
                {s("返回首页", "Go home")}
              </Button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
