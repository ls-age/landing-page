import { SiteDocument } from '@/components/site-document';

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return <SiteDocument>{children}</SiteDocument>;
}

export { siteMetadata as metadata, siteViewport as viewport } from '@/components/site-document';
