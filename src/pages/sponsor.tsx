import React from "react";
import Head from "next/head";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSiteSettings } from "@/lib/site-settings";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  RiHeart3Line, RiHeart3Fill, RiGithubLine, RiAlipayLine,
  RiWechatLine, RiExternalLinkLine, RiStarLine, RiStarFill,
  RiCalendarLine, RiMessage2Line, RiCopperCoinLine,
  RiPaypalLine, RiBitCoinLine, RiSparkling2Line,
  RiCheckLine, RiLoader4Line, RiFileCopyLine, RiUser3Line,
  RiQuillPenLine, RiArrowRightLine, RiShieldLine,
} from "@remixicon/react";
import { motion, AnimatePresence } from "framer-motion";

type Sponsor = {
  id: string;
  name: string;
  avatar_url: string | null;
  amount: string | null;
  currency: string;
  message: string | null;
  sponsor_date: string | null;
  is_anonymous: boolean;
  platform: string | null;
};

const CURRENCY_SYMBOL: Record<string, string> = {
  CNY: "¥", USD: "$", EUR: "€", JPY: "¥", GBP: "£",
};

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={cn(
        "flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all touch-manipulation",
        copied
          ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
      )}
    >
      {copied ? <RiCheckLine className="w-3 h-3" /> : <RiFileCopyLine className="w-3 h-3" />}
      {copied ? "已复制！" : (label || "复制")}
    </button>
  );
}

function SponsorCard({ s, index }: { s: Sponsor; index: number }) {
  const symbol = CURRENCY_SYMBOL[s.currency] || s.currency;
  const displayName = s.is_anonymous ? "匿名赞助者 🫧" : s.name;
  const initial = displayName.replace(/^匿名/, "?").charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-muted/30 transition-colors"
    >
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold shadow-sm",
        s.is_anonymous ? "bg-gradient-to-br from-slate-400 to-slate-600" : "bg-gradient-to-br from-rose-400 to-pink-600"
      )}>
        {s.avatar_url ? (
          <img src={s.avatar_url} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{displayName}</span>
          {s.platform && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono border border-border/50">{s.platform}</span>
          )}
          {s.amount && (
            <span className="text-xs font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
              {symbol}{parseFloat(s.amount).toFixed(0)}
            </span>
          )}
        </div>
        {s.message && (
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
            <RiQuillPenLine className="inline w-3 h-3 mr-0.5 opacity-50" />
            {s.message}
          </p>
        )}
        {s.sponsor_date && (
          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground/60">
            <RiCalendarLine className="w-3 h-3" />
            <span>{s.sponsor_date.slice(0, 10)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function QrCard({ title, url, icon, accentClass, subtitle }: {
  title: string; url: string; icon: React.ReactNode;
  accentClass: string; subtitle?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 p-5 rounded-2xl border bg-card shadow-sm transition-all", accentClass)}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-muted shadow-sm">
        {icon}
      </div>
      <div className="text-center">
        <span className="text-sm font-semibold">{title}</span>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="w-40 h-40 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
        <img
          src={url}
          alt={`${title} 收款码`}
          className="w-full h-full object-contain"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            t.style.display = "none";
            t.parentElement!.innerHTML = `<div class="text-center text-muted-foreground/40 text-xs px-4"><p class="mb-1">二维码未配置</p><p>管理员可在设置中上传</p></div>`;
          }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground text-center">扫码赞助 · 感谢支持</p>
    </div>
  );
}

function CryptoCard({ symbol, name, address, icon, color }: {
  symbol: string; name: string; address: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 space-y-3", color)}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold text-sm">{name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono border border-border/50">{symbol}</span>
      </div>
      <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2 border border-border/40">
        <code className="text-[11px] font-mono text-muted-foreground flex-1 truncate">{address}</code>
        <CopyButton text={address} />
      </div>
    </div>
  );
}

type SubmitForm = {
  name: string;
  message: string;
  amount: string;
  currency: string;
  platform: string;
  is_anonymous: boolean;
};

function PostPaymentForm({ defaultPlatform, onDone }: { defaultPlatform?: string; onDone: () => void }) {
  const [form, setForm] = React.useState<SubmitForm>({
    name: "", message: "", amount: "", currency: "CNY", platform: defaultPlatform || "", is_anonymous: false,
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const platforms = ["支付宝", "微信支付", "PayPal", "加密货币", "GitHub Sponsors", "其他"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() && !form.is_anonymous) {
      toast.error("请填写您的名字，或选择匿名");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/sponsors/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setDone(true);
      setTimeout(onDone, 3000);
    } catch (e: any) {
      toast.error(e.message || "提交失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-3">
        <div className="text-5xl">🎉</div>
        <p className="font-bold text-lg">感谢您的赞助！</p>
        <p className="text-sm text-muted-foreground">您的留言已提交，待管理员审核后将显示在赞助者列表中。</p>
        <p className="text-xs text-muted-foreground/60">您的支持是我们最大的动力 ❤️</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_anonymous}
            onChange={e => setForm(f => ({ ...f, is_anonymous: e.target.checked, name: e.target.checked ? "" : f.name }))}
            className="rounded"
          />
          <span className="text-sm text-muted-foreground">匿名赞助</span>
        </label>
      </div>

      {!form.is_anonymous && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">您的名字 *</label>
          <div className="relative">
            <RiUser3Line className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="您想让大家怎么称呼您？"
              className="pl-9 h-9 text-sm rounded-xl"
              maxLength={50}
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">留言（可选）</label>
        <textarea
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          placeholder="想对项目说点什么？一句鼓励、一个想法都好 ✨"
          className="w-full text-sm rounded-xl border border-input bg-background px-3 py-2 resize-none min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ring"
          maxLength={200}
        />
        <p className="text-[10px] text-muted-foreground text-right">{form.message.length}/200</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">赞助金额（可选）</label>
          <Input
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="如 10"
            type="number"
            min="0"
            step="0.01"
            className="h-9 text-sm rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">货币</label>
          <select
            value={form.currency}
            onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
            className="w-full h-9 rounded-xl border border-input bg-background text-sm px-3 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="CNY">CNY 人民币</option>
            <option value="USD">USD 美元</option>
            <option value="EUR">EUR 欧元</option>
            <option value="GBP">GBP 英镑</option>
            <option value="JPY">JPY 日元</option>
            <option value="USDT">USDT</option>
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">赞助渠道</label>
        <div className="flex flex-wrap gap-1.5">
          {platforms.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setForm(f => ({ ...f, platform: p }))}
              className={cn(
                "text-xs px-2.5 py-1 rounded-lg border transition-colors touch-manipulation",
                form.platform === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full gap-2 h-10 rounded-xl">
        {submitting ? <RiLoader4Line className="w-4 h-4 animate-spin" /> : <RiHeart3Fill className="w-4 h-4" />}
        {submitting ? "提交中…" : "提交留言 · 让大家认识你"}
      </Button>
      <p className="text-[10px] text-muted-foreground/50 text-center">
        留言将在管理员审核后显示在赞助者名单中 · 不包含任何敏感信息
      </p>
    </form>
  );
}

export default function SponsorPage() {
  const settings = useSiteSettings();
  const router = useRouter();
  const isChinese = router.locale !== "en";
  const siteName = settings.site_title || "Next Whois";

  const [sponsors, setSponsors] = React.useState<Sponsor[]>([]);
  const [sponsorLoading, setSponsorLoading] = React.useState(true);
  const [showAll, setShowAll] = React.useState(false);
  const [showPostPayment, setShowPostPayment] = React.useState(false);
  const [postPaymentPlatform, setPostPaymentPlatform] = React.useState<string>("");
  const [floatingHearts, setFloatingHearts] = React.useState<{ id: number; x: number }[]>([]);

  React.useEffect(() => {
    fetch("/api/admin/sponsors?visible_only=1")
      .then(r => r.json())
      .then(d => { if (d.sponsors) setSponsors(d.sponsors); })
      .catch(() => {})
      .finally(() => setSponsorLoading(false));
  }, []);

  function spawnHearts() {
    const id = Date.now();
    const x = 40 + Math.random() * 20;
    setFloatingHearts(prev => [...prev, { id, x }]);
    setTimeout(() => setFloatingHearts(prev => prev.filter(h => h.id !== id)), 1800);
  }

  const pageTitle = settings.sponsor_page_title || "赞助支持";
  const pageDesc = settings.sponsor_page_desc || "感谢您对本项目的支持！您的赞助将帮助我们持续维护和改进服务。";
  const alipayQr = settings.sponsor_alipay_qr;
  const wechatQr = settings.sponsor_wechat_qr;
  const githubUrl = settings.sponsor_github_url;
  const paypalUrl = settings.sponsor_paypal_url;
  const btcAddr = settings.sponsor_crypto_btc;
  const ethAddr = settings.sponsor_crypto_eth;
  const usdtAddr = settings.sponsor_crypto_usdt;
  const okxAddr = settings.sponsor_crypto_okx;

  const hasQrPayment = alipayQr || wechatQr;
  const hasLinkPayment = githubUrl || paypalUrl;
  const hasCrypto = btcAddr || ethAddr || usdtAddr || okxAddr;
  const hasAnyPayment = hasQrPayment || hasLinkPayment || hasCrypto;

  const visibleSponsors = showAll ? sponsors : sponsors.slice(0, 12);
  const totalAmount = sponsors.reduce((s, sp) => s + (sp.amount ? parseFloat(sp.amount) : 0), 0);

  return (
    <>
      <Head>
        <title>{`${isChinese ? pageTitle : "Sponsor"} — ${siteName}`}</title>
        <meta name="description" content={pageDesc} />
      </Head>
      <ScrollArea className="w-full h-[calc(100vh-4rem)]">
        <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-24">

          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="text-center mb-10 relative">
            <div className="relative inline-block mb-4">
              <button
                onClick={spawnHearts}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/40 border border-rose-200/50 dark:border-rose-700/30 shadow-sm hover:scale-110 active:scale-95 transition-transform touch-manipulation"
              >
                <RiHeart3Fill className="w-8 h-8 text-rose-500" />
              </button>
              {/* Floating hearts */}
              <AnimatePresence>
                {floatingHearts.map(h => (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 1, y: 0, scale: 0.8 }}
                    animate={{ opacity: 0, y: -60, scale: 1.4 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.6, ease: "easeOut" }}
                    className="absolute pointer-events-none text-rose-400"
                    style={{ left: `${h.x}%`, bottom: "100%" }}
                  >
                    ❤️
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <h1 className="text-2xl font-bold mb-2">{pageTitle}</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">{pageDesc}</p>

            {sponsors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-5 inline-flex items-center gap-3 text-sm font-medium text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-5 py-2 rounded-full border border-rose-100 dark:border-rose-800/30"
              >
                <RiSparkling2Line className="w-4 h-4" />
                {sponsors.length} 位赞助者
                {totalAmount > 0 && <span>· 累计 ¥{totalAmount.toFixed(0)}</span>}
                <RiSparkling2Line className="w-4 h-4" />
              </motion.div>
            )}
          </motion.div>

          {/* Payment methods */}
          {hasAnyPayment && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }} className="mb-8 space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-border/60" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">赞助方式</p>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              {/* QR codes */}
              {hasQrPayment && (
                <div className="flex flex-wrap justify-center gap-5">
                  {alipayQr && (
                    <QrCard title="支付宝" url={alipayQr} subtitle="扫码完成支付" accentClass="hover:border-blue-200 dark:hover:border-blue-800/60 hover:shadow-md"
                      icon={<RiAlipayLine className="w-6 h-6 text-blue-500" />} />
                  )}
                  {wechatQr && (
                    <QrCard title="微信支付" url={wechatQr} subtitle="扫码完成支付" accentClass="hover:border-green-200 dark:hover:border-green-800/60 hover:shadow-md"
                      icon={<RiWechatLine className="w-6 h-6 text-green-500" />} />
                  )}
                </div>
              )}

              {/* Link-based payments */}
              {hasLinkPayment && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {paypalUrl && (
                    <a href={paypalUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#003087] text-white font-semibold hover:bg-[#002070] transition-colors shadow-sm flex-1 max-w-xs mx-auto sm:mx-0">
                      <RiPaypalLine className="w-5 h-5" />
                      PayPal 赞助
                      <RiExternalLinkLine className="w-3.5 h-3.5 opacity-70" />
                    </a>
                  )}
                  {githubUrl && (
                    <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl border border-border bg-card font-semibold hover:bg-muted/50 transition-colors shadow-sm flex-1 max-w-xs mx-auto sm:mx-0">
                      <RiGithubLine className="w-5 h-5" />
                      GitHub Sponsors
                      <RiExternalLinkLine className="w-3.5 h-3.5 opacity-70" />
                    </a>
                  )}
                </div>
              )}

              {/* Crypto */}
              {hasCrypto && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                    <RiBitCoinLine className="w-4 h-4" />加密货币
                  </p>
                  <div className="grid gap-2.5">
                    {btcAddr && <CryptoCard symbol="BTC" name="Bitcoin" address={btcAddr} color="hover:border-amber-200 dark:hover:border-amber-800/40" icon={<RiBitCoinLine className="w-5 h-5 text-amber-500" />} />}
                    {ethAddr && <CryptoCard symbol="ETH" name="Ethereum" address={ethAddr} color="hover:border-indigo-200 dark:hover:border-indigo-800/40" icon={<RiBitCoinLine className="w-5 h-5 text-indigo-500" />} />}
                    {usdtAddr && <CryptoCard symbol="USDT" name="Tether (TRC20)" address={usdtAddr} color="hover:border-teal-200 dark:hover:border-teal-800/40" icon={<RiBitCoinLine className="w-5 h-5 text-teal-500" />} />}
                    {okxAddr && <CryptoCard symbol="OKX" name="OKX / Web3 钱包" address={okxAddr} color="hover:border-slate-300 dark:hover:border-slate-600" icon={<RiBitCoinLine className="w-5 h-5 text-slate-500" />} />}
                  </div>
                </div>
              )}

              {/* Post-payment CTA */}
              {hasAnyPayment && (
                <div className="mt-2">
                  <AnimatePresence mode="wait">
                    {!showPostPayment ? (
                      <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                        <button
                          onClick={() => setShowPostPayment(true)}
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-rose-200 dark:border-rose-800/50 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors font-medium text-sm touch-manipulation"
                        >
                          <RiHeart3Line className="w-4 h-4" />
                          我已完成赞助，留下我的名字和心声
                          <RiArrowRightLine className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="form"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="rounded-2xl border border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/10 p-5">
                          <div className="flex items-center gap-2 mb-5">
                            <RiHeart3Fill className="w-4 h-4 text-rose-500" />
                            <h3 className="text-sm font-bold">感谢您的赞助！留下您的印记 ✨</h3>
                          </div>
                          <PostPaymentForm
                            defaultPlatform={postPaymentPlatform}
                            onDone={() => setShowPostPayment(false)}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.section>
          )}

          {/* Sponsor list */}
          {(sponsorLoading || sponsors.length > 0) && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.3 }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-border/60" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2 flex items-center gap-1">
                  <RiStarFill className="w-3 h-3 text-amber-400" />赞助者名单<RiStarFill className="w-3 h-3 text-amber-400" />
                </p>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              {sponsorLoading ? (
                <div className="grid grid-cols-1 gap-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : sponsors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <RiHeart3Line className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">暂无赞助记录</p>
                  <p className="text-xs mt-1 opacity-60">成为第一位赞助者，永远记录在这里 ❤️</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    <AnimatePresence>
                      {visibleSponsors.map((s, i) => (
                        <SponsorCard key={s.id} s={s} index={i} />
                      ))}
                    </AnimatePresence>
                  </div>
                  {sponsors.length > 12 && (
                    <div className="text-center mt-4">
                      <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)} className="rounded-xl">
                        {showAll ? "收起" : `查看全部 ${sponsors.length} 位赞助者`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </motion.section>
          )}

          {/* Thank you note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-10 relative overflow-hidden rounded-3xl p-6 text-center"
            style={{
              background: "linear-gradient(135deg, var(--rose-50, #fff1f2) 0%, var(--pink-50, #fdf2f8) 50%, var(--purple-50, #faf5ff) 100%)",
            }}
          >
            <div className="dark:hidden absolute inset-0 rounded-3xl bg-gradient-to-br from-rose-50 to-purple-50" />
            <div className="hidden dark:block absolute inset-0 rounded-3xl bg-gradient-to-br from-rose-950/20 to-purple-950/20 border border-rose-800/20" />
            <div className="relative z-10 space-y-3">
              <div className="text-3xl">🌟</div>
              <p className="font-bold text-base">每一份支持都意义非凡</p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                无论金额大小，您的支持都是这个项目得以持续运转的动力。感谢每一位愿意为开源项目付出的人。
              </p>
              <div className="flex items-center justify-center gap-1 mt-3">
                {(["❤️", "🧡", "💛", "💚", "💙", "💜"] as const).map((e, i) => (
                  <motion.span
                    key={i}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, delay: i * 0.15, duration: 1.2 }}
                    className="text-lg"
                  >
                    {e}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6 text-center">
            <p className="text-xs text-muted-foreground/60">
              赞助记录未显示？请<Link href="/feedback?type=general&source=sponsor" className="text-rose-500 hover:underline mx-0.5">联系我们</Link>确认。感谢每一位支持者！
            </p>
            <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-muted-foreground/40">
              <RiShieldLine className="w-3 h-3" />
              <span>赞助信息由管理员审核后才会公开展示</span>
            </div>
          </motion.div>

        </main>
      </ScrollArea>
    </>
  );
}
