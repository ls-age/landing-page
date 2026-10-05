import { Badge } from '@workspace/ui/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import type { Metadata } from 'next';
import Image from 'next/image';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  // The root layout's title template only applies to nested segments
  title: { absolute: site.name },
};

const skills = [
  {
    title: 'Web Apps',
    description: 'I currently focus on developing high-performance progressive web apps.',
    tags: ['React', 'Next.js', 'Svelte', 'SvelteKit'],
  },
  {
    title: 'Backend Development',
    description: 'Where the real magic happens.',
    tags: ['Docker', 'Node.js', 'Bun', 'GraphQL'],
  },
  {
    title: 'App Development',
    description: 'iOS, Android, macOS, cross-platform...',
    tags: ['Tauri', 'React Native', 'Swift'],
  },
  {
    title: 'Continuous Delivery',
    description:
      'Using modern tools allows me to ship updates and bugfixes within minutes. Everything that can be automated saves time here!',
    tags: ['GitHub Actions', 'Vercel', 'CircleCI', 'Custom Solutions'],
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
        <Image
          src="/lukas-hechenberger.png"
          alt={site.author.name}
          width={256}
          height={256}
          priority
          className="size-48 rounded-full"
        />
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">Hey there!</h1>
          <p className="text-muted-foreground text-lg">
            I&apos;m Lukas, a software developer from Austria, living in Switzerland.
          </p>
        </div>
        <blockquote className="border-primary border-l-2 pl-4 text-left italic">
          I started to teach myself how to program during high school and have not stopped learning
          new, cutting-edge technologies since then.
        </blockquote>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">What I do</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {skills.map(({ title, description, tags }) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
