import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Game data JSONs only change on deploy, so the CDN holds them a year and a Vercel deploy busts them
        // Browser holds an hour, enough for tab reuse without re-downloading
        // stale-while-revalidate is valid here because Vercel does not implement proxy-revalidate
        // Cloudflare fronts api.wuwa.build and does the opposite, which is why lb emits no swr
        source: '/Data/:file*.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=31536000, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Mirrored game images (public/assets) take a 1-day edge TTL, not the 1-year /Data pattern
        // Cloudflare edge-caches images and respects s-maxage, but a Vercel deploy never purges it
        // A day is how long an asset changed under the same path takes to self-heal without a manual CF purge
        // max-age holds only while the Cloudflare zone keeps Browser Cache TTL on "Respect Existing Headers"
        // /Data escapes that because Cloudflare does not cache json
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
