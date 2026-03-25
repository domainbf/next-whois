/** @type {import('next').NextConfig} */

const setupPWA = require('next-pwa');

const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  optimizeFonts: true,
  i18n: {
    locales: ['en', 'zh', 'zh-tw', 'de', 'ru', 'ja', 'fr', 'ko'],
    defaultLocale: 'en',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
      {
        // Next.js build artifacts are content-addressed — safe to cache forever
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Icons and images in /public are mostly stable
        source: '/(icons|images)/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        // Favicon proxy — already sets its own Cache-Control in the handler,
        // but this ensures Vercel's edge cache also stores it
        source: '/api/favicon',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' },
        ],
      },
    ];
  },
  ...(process.env.NEXT_BUILD_DIR ? { distDir: process.env.NEXT_BUILD_DIR } : {}),
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        // These are ESM-only packages; keep as externals and load via dynamic
        // import() at runtime (CJS dynamic import() handles ESM correctly).
        'whoiser',
        'node-rdap',
        'ioredis',
        'nodemailer',
      ];
    }
    return config;
  },
};

const withPWA = setupPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [/manifest\.json$/, /_next\/data/, /_next\/static/],
  runtimeCaching: [
    {
      urlPattern: /^https?.*\.(css|js|woff2)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'assets-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
      },
    },
  ],
});

module.exports = withPWA(nextConfig);
