import "@/styles/globals.css";
import React from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { siteTitle, siteDescription, siteKeywords } from "@/lib/seo";
import { Navbar } from "@/components/navbar";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import { SessionProvider } from "next-auth/react";
import { LocaleProvider } from "@/lib/locale-context";
import { SiteSettingsProvider, useSiteSettings } from "@/lib/site-settings";
import { RiMegaphoneLine, RiCloseLine, RiWrenchLine } from "@remixicon/react";
import { ADMIN_EMAIL } from "@/lib/admin-shared";

const pageVariants = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -3 },
};

const pageTransition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
};

function AppHead({ origin }: { origin: string }) {
  const settings = useSiteSettings();
  const title = settings.site_title || siteTitle;
  const description = settings.site_description || siteDescription;
  const keywords = settings.site_keywords || siteKeywords;
  const siteName = settings.og_site_name || settings.site_title || siteTitle;
  const canonicalUrl = settings.og_url || origin;
  const ogImage = settings.og_image || `${origin}/bannermepng.png`;
  const twitterCard = settings.twitter_card || "summary_large_image";

  return (
    <Head>
      <title key="site-title">{title}</title>
      <meta name="description" content={description} />
      <meta name="tags" content={keywords} />
      <meta name="keywords" content={keywords} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="format-detection" content="telephone=no" />

      {/* Open Graph */}
      <meta key="og:type" property="og:type" content="website" />
      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:image" property="og:image" content={ogImage} />
      <meta key="og:image:width" property="og:image:width" content="1440" />
      <meta key="og:image:height" property="og:image:height" content="1440" />
      <meta key="og:image:type" property="og:image:type" content="image/png" />
      {canonicalUrl && <meta key="og:url" property="og:url" content={canonicalUrl} />}
      <meta key="og:site_name" property="og:site_name" content={siteName} />

      {/* Twitter Card */}
      <meta key="twitter:card" name="twitter:card" content={twitterCard} />
      <meta key="twitter:title" name="twitter:title" content={title} />
      <meta key="twitter:description" name="twitter:description" content={description} />
      <meta key="twitter:image" name="twitter:image" content={ogImage} />

      {/* Canonical */}
      {canonicalUrl && <link key="canonical" rel="canonical" href={canonicalUrl} />}

      {/* Favicon */}
      {settings.site_icon_url
        ? <link rel="icon" href={settings.site_icon_url} />
        : <link rel="icon" href="/favicon.ico" />
      }
    </Head>
  );
}

function SiteFooter() {
  const settings = useSiteSettings();
  const router = useRouter();
  const footerText = settings.site_footer;
  if (!footerText) return null;
  // Hide on admin pages
  if (router.pathname.startsWith("/admin")) return null;
  return (
    <footer className="border-t border-border/40 mt-12 py-6 px-4 text-center">
      <p className="text-xs text-muted-foreground/60">{footerText}</p>
    </footer>
  );
}

function AnnouncementBanner() {
  const settings = useSiteSettings();
  const [dismissed, setDismissed] = React.useState(false);
  const msg = settings.site_announcement;
  if (!msg || dismissed) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center px-4 py-2 bg-gradient-to-r from-primary to-violet-600 text-white text-xs font-medium gap-2 shadow-md">
      <RiMegaphoneLine className="w-3.5 h-3.5 shrink-0" />
      <span className="flex-1 text-center">{msg}</span>
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 rounded hover:bg-white/20 transition-colors shrink-0"
        aria-label="关闭公告"
      >
        <RiCloseLine className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const settings = useSiteSettings();
  const [sessionEmail, setSessionEmail] = React.useState<string | null | undefined>(undefined);

  React.useEffect(() => {
    if (settings.maintenance_mode !== "1") return;
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(s => setSessionEmail((s?.user?.email as string) || null))
      .catch(() => setSessionEmail(null));
  }, [settings.maintenance_mode]);

  // Not in maintenance — render normally
  if (settings.maintenance_mode !== "1") return <>{children}</>;
  // Still checking session — render nothing briefly to avoid flash
  if (sessionEmail === undefined) return null;
  // Admin bypass
  if (sessionEmail && sessionEmail.toLowerCase().trim() === ADMIN_EMAIL) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center mb-5">
        <RiWrenchLine className="w-7 h-7 text-amber-600 dark:text-amber-400" />
      </div>
      <h1 className="text-xl font-bold mb-2">站点维护中</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        系统正在升级维护，请稍后再访问。感谢您的耐心等待。
      </p>
      {settings.site_announcement && (
        <p className="mt-4 text-xs text-muted-foreground/70 border border-border rounded-xl px-4 py-2 max-w-xs">
          {settings.site_announcement}
        </p>
      )}
    </div>
  );
}

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const origin: string = pageProps.origin || process.env.NEXT_PUBLIC_SITE_URL || "";
  const router = useRouter();
  const isAdminPage = router.pathname.startsWith("/admin");

  return (
    <SessionProvider session={session}>
    <LocaleProvider initialLocale={router.locale}>
    <SiteSettingsProvider>
      <AppHead origin={origin} />
      <Toaster />
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-dot-pattern opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
        </div>
        <MaintenanceGate>
        <div className="relative w-full min-h-screen font-sans">
          {!isAdminPage && <AnnouncementBanner />}
          {!isAdminPage && <Navbar />}
          <main className={isAdminPage ? undefined : "pt-16"}>
            {isAdminPage ? (
              <Component {...pageProps} />
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={router.asPath}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                  style={{ willChange: "opacity, transform" }}
                >
                  <Component {...pageProps} />
                </motion.div>
              </AnimatePresence>
            )}
            {!isAdminPage && <SiteFooter />}
          </main>
        </div>
        </MaintenanceGate>
      </ThemeProvider>
    </SiteSettingsProvider>
    </LocaleProvider>
    </SessionProvider>
  );
}
