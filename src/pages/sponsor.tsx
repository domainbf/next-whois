import React from "react";
import Head from "next/head";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/lib/site-settings";
import { useRouter } from "next/router";
import {
  RiHeart3Line, RiHeart3Fill, RiGithubLine, RiAlipayLine,
  RiWechatLine, RiExternalLinkLine, RiStarLine, RiUserLine,
  RiCalendarLine, RiMessage2Line, RiCopperCoinLine,
} from "@remixicon/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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

function SponsorCard({ s, index }: { s: Sponsor; index: number }) {
  const symbol = CURRENCY_SYMBOL[s.currency] || s.currency;
  const displayName = s.is_anonymous ? "匿名赞助者" : s.name;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
      className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors"
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
        {s.avatar_url ? (
          <img src={s.avatar_url} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <span>{displayName.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{displayName}</span>
          {s.platform && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{s.platform}</span>
          )}
          {s.amount && (
            <span className="text-xs font-medium text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full">
              {symbol}{parseFloat(s.amount).toFixed(0)}
            </span>
          )}
        </div>
        {s.message && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.message}</p>
        )}
        {s.sponsor_date && (
          <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground/70">
            <RiCalendarLine className="w-3 h-3" />
            <span>{s.sponsor_date.slice(0, 10)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function QrCard({ title, url, icon, color }: { title: string; url: string; icon: React.ReactNode; color: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className={cn("flex flex-col items-center gap-3 p-5 rounded-2xl border border-border bg-card shadow-sm", color)}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-background shadow-sm">
        {icon}
      </div>
      <span className="text-sm font-semibold">{title}</span>
      <div className="w-36 h-36 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
        <img
          src={url}
          alt={`${title} 收款码`}
          className="w-full h-full object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground text-center">扫码赞助</p>
    </div>
  );
}

export default function SponsorPage() {
  const settings = useSiteSettings();
  const router = useRouter();
  const isChinese = router.locale !== "en";
  const siteName = settings.site_title || "Next Whois";

  const [sponsors, setSponsors] = React.useState<Sponsor[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAll, setShowAll] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/admin/sponsors?visible_only=1")
      .then(r => r.json())
      .then(d => { if (d.sponsors) setSponsors(d.sponsors); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pageTitle = settings.sponsor_page_title || "赞助支持";
  const pageDesc = settings.sponsor_page_desc || "感谢您对本项目的支持！";
  const alipayQr = settings.sponsor_alipay_qr;
  const wechatQr = settings.sponsor_wechat_qr;
  const githubUrl = settings.sponsor_github_url;

  const hasPayment = alipayQr || wechatQr || githubUrl;
  const visibleSponsors = showAll ? sponsors : sponsors.slice(0, 12);
  const totalAmount = sponsors.reduce((s, sp) => s + (sp.amount ? parseFloat(sp.amount) : 0), 0);

  return (
    <>
      <Head>
        <title>{`${isChinese ? pageTitle : "Sponsor"} — ${siteName}`}</title>
        <meta name="description" content={pageDesc} />
      </Head>
      <ScrollArea className="w-full h-[calc(100vh-4rem)]">
        <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-20">

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/40 border border-rose-200/50 dark:border-rose-700/30 mb-4 shadow-sm">
              <RiHeart3Fill className="w-7 h-7 text-rose-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{pageTitle}</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">{pageDesc}</p>
            {sponsors.length > 0 && totalAmount > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-4 py-1.5 rounded-full border border-rose-100 dark:border-rose-800/30">
                <RiCopperCoinLine className="w-4 h-4" />
                <span>累计获得 ¥{totalAmount.toFixed(0)} 赞助 · {sponsors.length} 位赞助者</span>
              </div>
            )}
          </motion.div>

          {hasPayment && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }} className="mb-10">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                <RiCopperCoinLine className="w-4 h-4" /> 赞助方式
              </h2>
              <div className="flex flex-wrap justify-center gap-4">
                {alipayQr && (
                  <QrCard
                    title="支付宝"
                    url={alipayQr}
                    icon={<RiAlipayLine className="w-5 h-5 text-blue-500" />}
                    color="hover:border-blue-200 dark:hover:border-blue-800"
                  />
                )}
                {wechatQr && (
                  <QrCard
                    title="微信支付"
                    url={wechatQr}
                    icon={<RiWechatLine className="w-5 h-5 text-green-500" />}
                    color="hover:border-green-200 dark:hover:border-green-800"
                  />
                )}
                {githubUrl && (
                  <div className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-border bg-card shadow-sm hover:border-slate-300 dark:hover:border-slate-600">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-background shadow-sm">
                      <RiGithubLine className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold">GitHub Sponsors</span>
                    <div className="w-36 h-36 rounded-xl border border-border bg-muted/30 flex items-center justify-center">
                      <div className="text-center space-y-2 px-3">
                        <RiGithubLine className="w-8 h-8 mx-auto text-muted-foreground/50" />
                        <p className="text-[11px] text-muted-foreground/70">在 GitHub 上赞助</p>
                      </div>
                    </div>
                    <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="text-xs gap-1.5">
                        <RiExternalLinkLine className="w-3.5 h-3.5" />
                        前往赞助
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {(loading || sponsors.length > 0) && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.3 }}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                <RiStarLine className="w-4 h-4" /> 赞助者名单
              </h2>
              {loading ? (
                <div className="grid grid-cols-1 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : sponsors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <RiHeart3Line className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>暂无赞助记录，成为第一位赞助者！</p>
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
                      <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)}>
                        {showAll ? "收起" : `查看全部 ${sponsors.length} 位赞助者`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </motion.section>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-10 p-5 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border border-rose-100 dark:border-rose-800/30 text-center">
            <RiMessage2Line className="w-5 h-5 mx-auto mb-2 text-rose-400" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              如有赞助记录未显示，请<Link href="/about" className="text-rose-500 hover:underline mx-0.5">联系我们</Link>进行确认。感谢每一位支持者！
            </p>
          </motion.div>

        </main>
      </ScrollArea>
    </>
  );
}
