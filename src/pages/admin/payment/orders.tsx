import React from "react";
import Head from "next/head";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RiBankCardLine, RiLoader4Line, RiCheckDoubleLine, RiRefundLine,
  RiSearchLine, RiFilterLine, RiMoneyDollarCircleLine,
  RiAlipayLine, RiExternalLinkLine,
} from "@remixicon/react";

type Order = {
  id: string;
  user_email: string;
  user_name: string | null;
  plan_name: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  provider_order_id: string | null;
};

type Stats = { total: number; paid: number; revenue: number };

const STATUS_TABS = [
  { key: "all",     label: "全部" },
  { key: "paid",    label: "已付款" },
  { key: "pending", label: "待付款" },
  { key: "failed",  label: "失败" },
  { key: "expired", label: "已过期" },
  { key: "refunded",label: "已退款" },
];

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe", xunhupay: "虎皮椒", alipay: "支付宝", paypal: "PayPal",
};

const STATUS_STYLE: Record<string, string> = {
  paid:     "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  pending:  "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  failed:   "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
  expired:  "bg-muted text-muted-foreground border-border/50",
  refunded: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
};

const STATUS_LABEL: Record<string, string> = {
  paid: "已付款", pending: "待付款", failed: "失败", expired: "已过期", refunded: "已退款",
};

function fmt(date: string) {
  return new Date(date).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function currencySymbol(c: string) {
  return { CNY: "¥", USD: "$", EUR: "€", HKD: "HK$" }[c] ?? c;
}

export default function PaymentOrdersAdmin() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [stats, setStats] = React.useState<Stats>({ total: 0, paid: 0, revenue: 0 });
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [acting, setActing] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, search, limit: "100" });
      const r = await fetch(`/api/admin/payment/orders?${params}`);
      const d = await r.json();
      setOrders(d.orders ?? []);
      setStats(d.stats ?? { total: 0, paid: 0, revenue: 0 });
    } catch { toast.error("加载失败"); }
    finally { setLoading(false); }
  }

  React.useEffect(() => { load(); }, [status]);

  async function doAction(orderId: string, action: string, label: string) {
    if (!confirm(`确认${label}订单 ${orderId}？`)) return;
    setActing(orderId);
    try {
      const r = await fetch("/api/admin/payment/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, orderId }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error);
      toast.success(`订单已${label}`);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setActing(null); }
  }

  const filtered = search
    ? orders.filter(o =>
        o.user_email.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.plan_name.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  return (
    <AdminLayout title="订单管理">
      <Head><title>订单管理 · 后台</title></Head>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
            <RiBankCardLine className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold">支付订单管理</h2>
            <p className="text-[11px] text-muted-foreground">共 {stats.total} 笔订单</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "总订单", value: stats.total, color: "text-foreground" },
            { label: "成功付款", value: stats.paid, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "总收入", value: `¥${stats.revenue.toFixed(2)}`, color: "text-violet-600 dark:text-violet-400" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
              <div className={cn("text-lg font-black", s.color)}>{s.value}</div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <RiSearchLine className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="邮箱 / 订单号 / 套餐名" className="pl-8 h-8 text-sm" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {STATUS_TABS.map(t => (
              <button key={t.key} onClick={() => setStatus(t.key)} className={cn(
                "text-[11px] px-2.5 py-1 rounded-lg border transition-all",
                status === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}>{t.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">暂无订单</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(order => (
              <div key={order.id} className="border border-border rounded-xl p-3.5 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  order.status === "paid" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                )}>
                  <RiMoneyDollarCircleLine className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{order.plan_name}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", STATUS_STYLE[order.status] ?? STATUS_STYLE.pending)}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                      {PROVIDER_LABELS[order.provider] ?? order.provider}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                    <span>{order.user_email}</span>
                    <span className="font-semibold text-foreground">{currencySymbol(order.currency)}{order.amount.toFixed(2)}</span>
                    <span>{fmt(order.created_at)}</span>
                    {order.paid_at && <span className="text-emerald-600 dark:text-emerald-400">付款 {fmt(order.paid_at)}</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono truncate">{order.id}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {order.status === "pending" && (
                    <button
                      onClick={() => doAction(order.id, "mark_paid", "标记为已付款")}
                      disabled={acting === order.id}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors text-emerald-600 dark:text-emerald-400"
                      title="手动标记为已付款"
                    >
                      {acting === order.id ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" /> : <RiCheckDoubleLine className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {order.status === "paid" && (
                    <button
                      onClick={() => doAction(order.id, "mark_refunded", "标记退款")}
                      disabled={acting === order.id}
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors text-blue-500"
                      title="标记为已退款"
                    >
                      {acting === order.id ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" /> : <RiRefundLine className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
