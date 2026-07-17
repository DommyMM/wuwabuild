import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Game data JSONs — only change on deployment, cache aggressively.
        // s-maxage: CDN holds for 1 year, busted automatically on Vercel deploy.
        // max-age: browser holds for 1 hour (covers tab reuse without re-downloading).
        // stale-while-revalidate is deliberate here and must not be removed to
        // "match" the LB service: these routes are served by Vercel, which does
        // not implement proxy-revalidate, so s-maxage + swr is valid and is
        // Vercel's own documented pattern. Cloudflare (which fronts api.wuwa.build)
        // does the opposite, which is why lb emits no swr. See lb/docs/api-behaviors.md.
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
        // respects s-maxage, but a Vercel deploy doesn't purge Cloudflare
        // so keep the edge TTL short enough that an asset changed under the
        // same path self-heals within a day without a manual CF purge.
        // max-age here only survives while the Cloudflare zone keeps "Browser
        // Cache TTL" on "Respect Existing Headers". Cloudflare caches this path,
        // so any other value rewrites max-age (it was pinned to 4h until
        // 2026-07-16). /Data below is immune only because CF doesn't cache json
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
