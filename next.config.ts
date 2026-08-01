import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ui-avatars.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '**.vercel-storage.com' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['drizzle-orm', '@neondatabase/serverless', 'bcryptjs', 'jose'],
  },
  // Allow building even with TS errors in edge cases during migration
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Rewrites for presentation static site (if applicable)
  async rewrites() {
    return [
      { source: '/presentation', destination: '/presentation/index.html' },
      { source: '/presentation/:path*', destination: '/presentation/:path*' },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
