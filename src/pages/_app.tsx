import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { siteTitle, siteDescription, siteKeywords } from "@/lib/seo";
import { Navbar } from "@/components/navbar";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import { SessionProvider } from "next-auth/react";

const pageVariants = {
  initial: { opacity: 0, y: 8, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 1.002 },
};

const pageTransition = {
  duration: 0.28,
  ease: [0.25, 0.46, 0.45, 0.94],
};

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const origin: string = pageProps.origin || "";
  const router = useRouter();

  return (
    <SessionProvider session={session}>
    <>
      <Head>
        <title>{siteTitle}</title>
        <meta name="description" content={siteDescription} />
        <meta name="tags" content={siteKeywords} />
        <meta name="keywords" content={siteKeywords} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="format-detection" content="telephone=no" />
        <meta key="og:title" property="og:title" content={siteTitle} />
        <meta
          key="og:description"
          property="og:description"
          content={siteDescription}
        />
        <meta
          key="og:image"
          property="og:image"
          content={`${origin}/banner.png`}
        />
        <meta key="og:url" property="og:url" content={origin} />
        <meta key="og:type" property="og:type" content="website" />
        <meta
          key="twitter:card"
          name="twitter:card"
          content="summary_large_image"
        />
        <meta key="twitter:title" name="twitter:title" content={siteTitle} />
        <meta
          key="twitter:description"
          name="twitter:description"
          content={siteDescription}
        />
        <meta
          key="twitter:image"
          name="twitter:image"
          content={`${origin}/banner.png`}
        />
      </Head>
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
    </>
    </SessionProvider>
  );
}
