import { Badge } from '@workspace/ui/components/badge';
import { buttonVariants } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { StarIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDate, getRepositories } from '@/lib/github';
import { site } from '@/lib/site';

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: 'Open Source',
  description: 'My open source projects',
};

export default async function OpenSourcePage() {
  const repositories = await getRepositories();

  return (
    <>
      <section className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Open Source</h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          I use a lot of open source software – in return I open source most of my own software.
        </p>
        <a href={site.author.github} className={buttonVariants()}>
          View all repositories on GitHub
        </a>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-16 sm:grid-cols-2">
        {repositories.map((repo) => (
          <Link key={repo.nameWithOwner} href={`/open-source/${repo.nameWithOwner}`}>
            <Card className="hover:bg-muted/50 h-full transition-colors">
              <CardHeader>
                <CardTitle className="break-words">{repo.nameWithOwner}</CardTitle>
                {repo.description && <CardDescription>{repo.description}</CardDescription>}
              </CardHeader>
              <CardContent className="mt-auto flex flex-wrap gap-2">
                <Badge variant="secondary">Last pushed {formatDate(repo.pushedAt)}</Badge>
                <Badge variant="secondary">
                  <StarIcon data-icon="inline-start" />
                  {repo.stars}
                </Badge>
                {repo.language && <Badge variant="outline">{repo.language}</Badge>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </>
  );
}
