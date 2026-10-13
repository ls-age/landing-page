import { Button, buttonVariants } from '@workspace/ui/components/button';
import { ButtonGroup } from '@workspace/ui/components/button-group';
import Link from 'next/link';
import { ContactDialog } from '@/components/contact-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { site } from '@/lib/site';
import { Logo } from './logo';

const links = [
  { href: '/blog', label: 'Blog' },
  { href: '/open-source', label: 'Open Source' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40">
      {/* Blurred gradient */}
      <div className="absolute inset-0">
        {/* mask-b-from-20% mask-b-to-80% */}
        <div className="mask-b-from-0% mask-b-to-100% pointer-events-none absolute inset-0 -mb-20 backdrop-blur backdrop-brightness-150 backdrop-saturate-150 dark:backdrop-brightness-50"></div>

        {/* Darken */}
        <div className="bg-linear-to-t from-background/0 to-background/80 pointer-events-none absolute inset-0 -mb-5"></div>
      </div>

      <div className="relative mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <Link
          href="/"
          aria-label={site.name}
          className={buttonVariants({ size: 'icon', className: 'drop-shadow' })}
        >
          <Logo className="size-8 rounded-full" />
        </Link>

        {/* Hidden on phones, where the footer links to the same pages */}
        <ButtonGroup className="hidden drop-shadow sm:flex">
          {links.map(({ href, label }) => (
            <Button
              key={href}
              variant="secondary"
              nativeButton={false}
              className="border-0"
              render={<Link href={href}>{label}</Link>}
            />
          ))}
        </ButtonGroup>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ContactDialog />
        </div>
      </div>
    </header>
  );
}
