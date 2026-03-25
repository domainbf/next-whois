import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/lib/site-settings";
import { useTranslation } from "@/lib/i18n";
import { motion } from "framer-motion";
import {
  RiLoader4Line, RiCheckLine, RiCloseLine, RiArrowRightLine,
  RiShieldCheckLine, RiBankCardLine,
} from "@remixicon/react";

type Order = {
  id: string; status: string; amount: number; currency: string;
  plan_name: string; provider: string; paid_at: string | null;
};

const CURRENCY_SYMBOL: Record<string, string> = { CNY: "¥", USD: "$", EUR: "€", HKD: "HK$" };

export default function PaymentResult() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const settings = useSiteSettings();
  const { t } = useTranslation();
  const isChinese = router.locale !== "en";

  const orderId = typeof router.query.order === "string" ? router.query.order : null;
  const urlStatus = typeof router.query.status === "string" ? router.query.status : null;

  const [order, setOrder] = React.useState<Order | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [pollCount, setPollCount] = React.useState(0);

  React.useEffect(() => {
    if (!orderId || authStatus !== "authenticated") {
      if (authStatus !== "loading") setLoading(false);
      return;
    }

    async function fetchOrder() {
      try {
        const r = await fetch(`/api/payment/status?order=${orderId}`);
        const d = await r.json();
        if (d.order) {
          setOrder(d.order);
          if (d.order.status === "paid") { setLoading(false); return; }
        }
      } catch {}
      setLoading(false);
    }

    fetchOrder();
  }, [orderId, authStatus]);

  React.useEffect(() => {
    if (!order || order.status === "paid" || urlStatus === "cancel") return;
    if (pollCount >= 8) return;
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/payment/status?order=${orderId}`);
        const d = await r.json();
        if (d.order) setOrder(d.order);
      } catch {}
      setPollCount(c => c + 1);
    }, 2500);
    return () => clearTimeout(timer);
  }, [order, pollCount, orderId, urlStatus]);

  if (authStatus === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RiLoader4Line className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPaid = order?.status === "paid";
  const isCancelled = urlStatus === "cancel";
  const sym = order ? (CURRENCY_SYMBOL[order.currency] ?? order.currency) : "¥";

  return (
    <>
      <Head>
        <title>{isPaid ? "支付成功" : isCancelled ? "已取消" : "支付结果"} · {settings.site_title}</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm text-center space-y-5 py-10"
        >
          {isPaid ? (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <RiCheckLine className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-xl font-black">{isChinese ? "支付成功！" : "Payment Successful!"}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isChinese ? "感谢你的支持，权限已自动开通" : "Thank you! Your access has been activated."}
                </p>
              </div>
              {order && (
                <div className="rounded-2xl border border-emerald-200/50 dark:border-emerald-700/30 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-sm space-y-1.5 text-left">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">套餐</span>
                    <span className="font-semibold">{order.plan_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">金额</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{sym}{order.amount.toFixed(2)}</span>
                  </div>
                  {order.paid_at && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">付款时间</span>
                      <span>{new Date(order.paid_at).toLocaleString("zh-CN")}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Link href="/dashboard">
                  <Button className="w-full rounded-xl h-10 font-semibold">
                    <RiArrowRightLine className="w-4 h-4 mr-2" />
                    {isChinese ? "前往用户中心" : "Go to Dashboard"}
                  </Button>
                </Link>
                <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground/50 mt-1">
                  <RiShieldCheckLine className="w-3.5 h-3.5" />
                  {isChinese ? "交易已加密保护" : "Transaction encrypted"}
                </div>
              </div>
            </>
          ) : isCancelled ? (
            <>
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <RiCloseLine className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-black">{isChinese ? "已取消支付" : "Payment Cancelled"}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isChinese ? "你取消了本次支付，可以重新选择套餐" : "You cancelled this payment. You can try again anytime."}
                </p>
              </div>
              <Link href="/payment/checkout">
                <Button variant="outline" className="w-full rounded-xl h-10">
                  {isChinese ? "重新选择套餐" : "Choose a Plan"}
                </Button>
              </Link>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <RiLoader4Line className="w-8 h-8 text-amber-500 animate-spin" />
              </div>
              <div>
                <h1 className="text-xl font-black">{isChinese ? "等待支付确认…" : "Waiting for Confirmation…"}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isChinese ? "正在核实支付结果，请稍候" : "Verifying payment, please wait"}
                </p>
              </div>
              {pollCount >= 8 && (
                <p className="text-xs text-muted-foreground">
                  {isChinese ? "如已付款但页面未更新，请刷新或联系客服，附上订单号：" : "If paid but page not updated, refresh or contact support with order ID:"}
                  <br /><code className="font-mono text-[10px] bg-muted px-1 rounded">{orderId}</code>
                </p>
              )}
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}
