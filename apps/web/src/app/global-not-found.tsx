import type { Metadata } from 'next';
import { PageNotFound } from '@/components/page-not-found';
import { SiteDocument, siteMetadata } from '@/components/site-document';
import { site } from '@/lib/site';

// Not nested in a layout, so the title template doesn't apply
export const metadata: Metadata = { ...siteMetadata, title: `Page not found · ${site.name}` };

/** Unmatched URLs: there's no single root layout, as the Payload admin has its own */
export default function GlobalNotFound() {
  return (
    <SiteDocument>
      <PageNotFound />
    </SiteDocument>
  );
}

export { siteViewport as viewport } from '@/components/site-document';
