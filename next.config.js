/** @type {import('next').NextConfig} */

const setupPWA = require('next-pwa');

const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  i18n: {
    locales: ['en', 'zh', 'zh-tw', 'de', 'ru', 'ja', 'fr', 'ko'],
    defaultLocale: 'en',
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
