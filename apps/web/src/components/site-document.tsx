import { cn } from '@workspace/ui/lib/utils';
import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { ThemeProvider } from '@/components/theme-provider';
import { site } from '@/lib/site';
import '@workspace/ui/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const siteMetadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  authors: [{ name: site.author.name, url: site.author.github }],
  creator: site.author.name,
};

export const siteViewport: Viewport = {
  themeColor: site.themeColor,
};

/**
 * The public site's `<html>` document. Shared by the `(app)` root layout and `global-not-found`,
 * which renders without any layout (the Payload admin has its own root layout).
 */
export function SiteDocument({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn('antialiased', fontMono.variable, 'font-sans', inter.variable)}
    >
      <body className="flex min-h-svh flex-col">
        <ThemeProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
