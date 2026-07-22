// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'quickbite.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'quickbite-backend-mzon.onrender.com',
        pathname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async rewrites() {
    // ✅ Only use rewrites in development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3001/api/:path*',
        },
      ];
    }
    // In production, let the frontend call the API directly
    return [];
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  reactStrictMode: true,
  poweredByHeader: false,
  // ✅ Add this for better production builds
  output: 'standalone',
};

export default nextConfig;