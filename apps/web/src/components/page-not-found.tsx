import { buttonVariants } from '@workspace/ui/components/button';
import Link from 'next/link';

export function PageNotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">This page doesn&apos;t exist (anymore).</p>
      <Link href="/" className={buttonVariants()}>
        Back to the start page
      </Link>
    </section>
  );
}
