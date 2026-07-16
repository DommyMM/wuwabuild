import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Game data JSONs — only change on deployment, cache aggressively.
        // s-maxage: CDN holds for 1 year, busted automatically on Vercel deploy.
        // max-age: browser holds for 1 hour (covers tab reuse without re-downloading).
        source: '/Data/:file*.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=31536000, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Mirrored game images (public/assets). Deliberately NOT the 1-year
        // /Data pattern: Cloudflare edge-caches images (unlike JSON) and
        // respects s-maxage, but a Vercel deploy doesn't purge Cloudflare —
        // so keep the edge TTL short enough that an asset changed under the
        // same path self-heals within a day without a manual CF purge.
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  async redirects() {
    return [
      {
        source: '/:path((?!saves).*)',
        has: [{ type: 'host', value: 'www.wuwabuilds.moe' }],
        destination: 'https://wuwa.build/:path*',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
