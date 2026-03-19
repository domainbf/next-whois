/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ['en', 'zh', 'zh-tw', 'de', 'ru', 'ja', 'fr', 'ko'],
    defaultLocale: 'en',
  },
  poweredByHeader: false,
  compress: true,
  experimental: {
    serverComponentsExternalPackages: ['whoiser', 'node-rdap', 'ioredis'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'whoiser', 'node-rdap'];
    }
    return config;
  },
}

module.exports = nextConfig
