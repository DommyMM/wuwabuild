import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'files.wuthery.com',
        pathname: '/p/GameData/UIResources/Common/**',
      },
    ],
  },
};

export default nextConfig;