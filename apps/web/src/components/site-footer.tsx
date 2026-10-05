import Link from 'next/link';
import { site } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="text-muted-foreground border-t py-8 text-center text-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4">
        <p>
          &copy; {new Date().getFullYear()} {site.author.name}
        </p>
        <p>
          Check it out on{' '}
          <a
            className="hover:text-foreground underline"
            href="https://github.com/ls-age/landing-page"
          >
            GitHub
          </a>
          .
        </p>
        <p>
          <Link className="hover:text-foreground underline" href="/blog">
            Blog
          </Link>{' '}
          &middot;{' '}
          <Link className="hover:text-foreground underline" href="/open-source">
            Open Source
          </Link>{' '}
          &middot;{' '}
          <a className="hover:text-foreground underline" href="https://hechenbros.com">
            Hechenbros
          </a>{' '}
          &middot;{' '}
          <a className="hover:text-foreground underline" href="https://hechenbros.com/impressum/">
            Imprint
          </a>{' '}
          &middot;{' '}
          <a
            className="hover:text-foreground underline"
            href="https://hechenbros.com/privacy-policy"
          >
            Privacy Policy
          </a>
        </p>
      </div>
    </footer>
  );
}
