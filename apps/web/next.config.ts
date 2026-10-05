import { withPayload } from '@payloadcms/next/withPayload';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@workspace/ui'],
  experimental: {
    // Inline the (small, atomic) Tailwind CSS instead of a render-blocking <link>
    inlineCss: true,
    // The site and the Payload admin have separate root layouts, so unmatched URLs need a global
    // 404 page (`src/app/global-not-found.tsx`)
    globalNotFound: true,
  },
  // PostHog through the site's own origin (`components/analytics.tsx`)
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      { source: '/ingest/:path*', destination: 'https://eu.i.posthog.com/:path*' },
    ];
  },
  // Required for PostHog's API requests with trailing slashes
  skipTrailingSlashRedirect: true,
};

export default withPayload(nextConfig, {
  // See: https://payloadcms.com/docs/performance/overview#only-bundle-server-packages-in-production
  devBundleServerPackages: false,
});
