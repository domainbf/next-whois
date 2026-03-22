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
import { RiMegaphoneLine, RiCloseLine } from "@remixicon/react";

const pageVariants = {
  initial: { opacity: 0, y: 8, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 1.002 },
};

const pageTransition = {
  duration: 0.28,
  ease: [0.25, 0.46, 0.45, 0.94],
};

function AppHead({ origin }: { origin: string }) {
  const settings = useSiteSettings();
  const title = settings.site_title || siteTitle;
  const description = settings.site_description || siteDescription;
  const siteName = settings.og_site_name || settings.site_title || siteTitle;
  const canonicalUrl = settings.og_url || origin;
  const ogImage = settings.og_image || `${origin}/banner.png`;
  const twitterCard = settings.twitter_card || "summary_large_image";

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="tags" content={siteKeywords} />
      <meta name="keywords" content={siteKeywords} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="format-detection" content="telephone=no" />

      {/* Open Graph */}
      <meta key="og:type" property="og:type" content="website" />
      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:image" property="og:image" content={ogImage} />
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

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const origin: string = pageProps.origin || "";
  const router = useRouter();

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
        <div className="relative w-full min-h-screen font-sans">
          <AnnouncementBanner />
          <Navbar />
          <main className="pt-16">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={router.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
              >
                <Component {...pageProps} />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </ThemeProvider>
    </SiteSettingsProvider>
    </LocaleProvider>
    </SessionProvider>
  );
}
