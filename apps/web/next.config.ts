import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@workspace/ui'],
  experimental: {
    // Inline the (small, atomic) Tailwind CSS instead of a render-blocking <link>
    inlineCss: true,
  },
};

export default nextConfig;
