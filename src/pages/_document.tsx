import { Html, Head, Main, NextScript } from "next/document";
import { geistSans, geistMono } from "@/lib/fonts";

export default function Document() {
  return (
    <Html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <Head>
        {/* DNS prefetch for third-party APIs used client-side */}
        <link rel="preconnect" href="https://api.frankfurter.app" />
        <link rel="dns-prefetch" href="https://api.frankfurter.app" />
        <link rel="dns-prefetch" href="https://rdap.iana.org" />
        <link rel="dns-prefetch" href="https://data.iana.org" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
