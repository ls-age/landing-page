import { Badge } from '@workspace/ui/components/badge';
import { buttonVariants } from '@workspace/ui/components/button';
import {
  Timeline,
  TimelineContent,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from '@workspace/ui/components/reui/timeline';
import { FolderGit2Icon, GitPullRequestIcon, StarIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getContributions, getRepositories } from '@/lib/github';
import { site } from '@/lib/site';

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: 'Open Source',
  description: 'My open source projects and contributions to other projects',
};

interface Entry {
  key: string;
  kind: 'project' | 'contribution';
  title: string;
  href: string;
  description: string | undefined;
  language: string | undefined;
  /** Stars of a project, merged pull requests of a contribution */
  count: number;
  start: string;
  end: string;
}

const year = (date: string) => new Date(date).getUTCFullYear();

function period({ start, end }: Pick<Entry, 'start' | 'end'>) {
  return year(start) === year(end) ? `${year(start)}` : `${year(start)}–${year(end)}`;
}

export default async function OpenSourcePage() {
  const [repositories, contributions] = await Promise.all([getRepositories(), getContributions()]);

  const entries: Entry[] = [
    ...repositories.map((repo) => ({
      key: repo.nameWithOwner,
      kind: 'project' as const,
      title: repo.nameWithOwner,
      href: `/open-source/${repo.nameWithOwner}`,
      description: repo.description,
      language: repo.language,
      count: repo.stars,
      start: repo.createdAt,
      end: repo.pushedAt,
    })),
    ...contributions.map((contribution) => ({
      key: contribution.nameWithOwner,
      kind: 'contribution' as const,
      title: contribution.nameWithOwner,
      href: contribution.pullRequestsUrl,
      description: contribution.description,
      language: contribution.language,
      count: contribution.pullRequests,
      start: contribution.firstMergedAt,
      end: contribution.lastMergedAt,
    })),
  ].sort((a, b) => b.start.localeCompare(a.start));

  // One timeline item per year, by the year an entry started
  const entriesByYear = new Map<number, Entry[]>();
  for (const entry of entries) {
    const startYear = year(entry.start);
    entriesByYear.set(startYear, [...(entriesByYear.get(startYear) ?? []), entry]);
  }
  const years = [...entriesByYear];

  return (
    <>
      <section className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Open Source</h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          I use a lot of open source software – in return I open source a lot of my own software and
          contribute to the projects I use.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-12 px-4 pb-16 lg:grid-cols-[minmax(0,42rem)_auto] lg:justify-between">
        <div className="flex flex-col gap-8">
          <h2 className="text-2xl font-semibold tracking-tight">Contributions</h2>
          <Timeline defaultValue={years.length} className="max-w-2xl">
            {years.map(([startYear, yearEntries], index) => (
              <TimelineItem key={startYear} step={index + 1}>
                <TimelineHeader>
                  <TimelineSeparator />
                  <TimelineTitle render={<h3 />} className="text-lg font-semibold leading-4">
                    {startYear}
                  </TimelineTitle>
                  <TimelineIndicator className="bg-primary" />
                </TimelineHeader>
                <TimelineContent className="mt-4 flex flex-col gap-6">
                  {yearEntries.map((entry) => {
                    const Icon = entry.kind === 'project' ? FolderGit2Icon : GitPullRequestIcon;

                    return (
                      <article key={`${entry.kind}:${entry.key}`} className="flex flex-col gap-2">
                        <h4 className="text-foreground flex items-center gap-2 break-words text-base font-medium">
                          <Icon className="text-primary size-4 shrink-0" aria-hidden />
                          {entry.kind === 'project' ? (
                            <Link href={entry.href} className="hover:underline">
                              {entry.title}
                            </Link>
                          ) : (
                            <a href={entry.href} className="hover:underline">
                              {entry.title}
                            </a>
                          )}
                        </h4>
                        {entry.description && <p>{entry.description}</p>}
                        <div className="flex flex-wrap gap-2">
                          {entry.kind === 'project' ? (
                            <Badge variant="secondary">
                              <StarIcon data-icon="inline-start" />
                              {entry.count}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <GitPullRequestIcon data-icon="inline-start" />
                              {entry.count === 1
                                ? '1 pull request'
                                : `${entry.count} pull requests`}
                            </Badge>
                          )}
                          {entry.language && <Badge variant="outline">{entry.language}</Badge>}
                          <Badge variant="outline">{period(entry)}</Badge>
                        </div>
                      </article>
                    );
                  })}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </div>
        <aside className="self-start lg:sticky lg:top-24">
          <a href={site.author.github} className={buttonVariants({ variant: 'outline' })}>
            View all repositories on GitHub
          </a>
        </aside>
      </section>
    </>
  );
}
