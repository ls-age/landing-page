import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  // Keep preview deployments out of search engines
  if (process.env.VERCEL_ENV !== 'production') return { rules: { userAgent: '*', disallow: '/' } };

  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
    sitemap: new URL('/sitemap.xml', site.url).href,
  };
}
