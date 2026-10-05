import Link from 'next/link';
import { ContactDialog } from '@/components/contact-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { site } from '@/lib/site';

const links = [
  { href: '/', label: 'About' },
  { href: '/open-source', label: 'Open Source' },
  { href: 'https://hechenbros.com', label: 'Hechenbros' },
];

export function SiteHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:gap-6">
        <Link href="/" className="whitespace-nowrap font-semibold tracking-tight">
          {site.name}
        </Link>
        {/* Hidden on phones: the name links to the About page, the footer to the others */}
        <nav className="text-muted-foreground hidden items-center gap-4 text-sm sm:flex">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:text-foreground transition-colors">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ContactDialog />
        </div>
      </div>
    </header>
  );
}
