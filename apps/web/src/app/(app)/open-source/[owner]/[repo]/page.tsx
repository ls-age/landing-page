import { Badge } from '@workspace/ui/components/badge';
import { buttonVariants } from '@workspace/ui/components/button';
import { StarIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRepository } from '@/lib/github';

export const revalidate = 86_400;

// Render repositories on their first request instead of at build time, to stay within GitHub's
// rate limit for unauthenticated requests
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/open-source/[owner]/[repo]'>): Promise<Metadata> {
  const { owner, repo } = await params;
  const repository = await getRepository(owner, repo);
  if (!repository) return {};

  return { title: repository.nameWithOwner, description: repository.description };
}

export default async function RepositoryPage({ params }: PageProps<'/open-source/[owner]/[repo]'>) {
  const { owner, repo } = await params;
  const repository = await getRepository(owner, repo);
  if (!repository) notFound();

  return (
    <>
      <section className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-16">
        <h1 className="break-words text-4xl font-semibold tracking-tight">
          {repository.nameWithOwner}
        </h1>
        {repository.description && (
          <p className="text-muted-foreground text-lg">{repository.description}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            <StarIcon data-icon="inline-start" />
            {repository.stars}
          </Badge>
          {repository.release && (
            <Badge variant="secondary">Current release {repository.release}</Badge>
          )}
          {repository.language && <Badge variant="outline">{repository.language}</Badge>}
        </div>
        <a href={repository.url} className={buttonVariants({ variant: 'outline' })}>
          View on GitHub
        </a>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        {repository.readme ? (
          <article
            // Hide the anchor icons GitHub adds next to each heading
            className="typeset [&_a.anchor]:hidden"
            dangerouslySetInnerHTML={{ __html: repository.readme }}
          />
        ) : (
          <p className="text-muted-foreground italic">No README</p>
        )}
      </section>
    </>
  );
}
