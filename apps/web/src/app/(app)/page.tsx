import { Badge } from '@workspace/ui/components/badge';
import { buttonVariants } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ContactDialog } from '@/components/contact-dialog';
import { JsonLd, website } from '@/components/json-ld';
import { formatDate, getPosts } from '@/lib/posts';
import { site } from '@/lib/site';

// Picks up scheduled posts (changes in the admin revalidate the whole site right away)
export const revalidate = 3600;

export const metadata: Metadata = {
  // The root layout's title template only applies to nested segments
  title: { absolute: site.name },
};

const work: {
  title: string;
  url: string;
  description: string;
  image: string;
  /** A screenshot in dark mode, if the site has one */
  darkImage?: string;
  tags: string[];
}[] = [
  {
    title: 'QRcard',
    url: 'https://www.qrcardapp.com',
    description:
      'A digital business card: share your contact details with a QR code, on iOS and Android.',
    image: '/work/qrcard-light.webp',
    darkImage: '/work/qrcard-dark.webp',
    tags: ['React Native', 'Next.js', 'Payload', 'Vercel'],
  },
  {
    title: 'Boraan',
    url: 'https://www.boraan.at',
    description: 'An online shop for organic, fair-trade Kampot pepper from Cambodia.',
    image: '/work/boraan.webp',
    tags: ['Next.js', 'Payload', 'Vercel'],
  },
  {
    title: 'Sonja Martin Design',
    url: 'https://www.sonjamartindesign.com',
    description:
      "The website of a jewelry designer's studio, with her collections in two languages.",
    image: '/work/sonja.webp',
    tags: ['Svelte', 'Sapper', 'Vercel'],
  },
];

const skills = [
  {
    title: 'Web Apps',
    description:
      'Fast, accessible apps and websites, from the database schema to the last pixel, with a CMS where it helps.',
    tags: ['TypeScript', 'React', 'Next.js', 'Svelte', 'Payload', 'PostgreSQL'],
  },
  {
    title: 'Mobile & Desktop Apps',
    description: 'Native and cross-platform apps that share code and tooling with the web.',
    tags: ['React Native', 'Swift', 'Tauri'],
  },
  {
    title: 'Shipping & Automation',
    description:
      'Checks and a preview for every change, deploys in minutes, and scripts for everything I would otherwise do twice.',
    tags: ['GitHub Actions', 'Vercel', 'Turborepo', 'Docker', 'Bun'],
  },
];

export default async function HomePage() {
  const posts = await getPosts();
  const latestPosts = posts.slice(0, 3);

  return (
    <>
      <JsonLd thing={website} />
      <section className="mx-auto grid max-w-5xl items-center gap-12 px-4 py-16 sm:py-24 md:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-6">
          <Image
            src="/lukas-hechenberger.png"
            alt={site.author.name}
            width={256}
            height={256}
            priority
            className="ring-background size-24 rounded-full shadow-md ring-4"
          />
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            I build web apps, end to end.
          </h1>
          <p className="text-muted-foreground text-pretty text-lg">
            I&apos;m Lukas, a software developer. I take products from the first database schema to
            the last deploy, and write about the problems I solve along the way.
          </p>
          <div className="flex flex-wrap gap-3">
            <ContactDialog label="Get in touch" size="lg" />
            <Link href="/blog" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
              Read the blog
            </Link>
          </div>
        </div>
        <figure className="mx-auto flex w-64 flex-col items-center gap-3 sm:w-72">
          {/* Recolored to the theme's primary color, so the card switches with the theme */}
          <Image
            src="/qrcard-lukas-hechenberger-light.webp"
            alt={`QRcard of ${site.author.name}: email address, website, Instagram profile and QR code`}
            width={752}
            height={1233}
            priority
            className="w-full rotate-2 rounded-2xl shadow-xl dark:hidden"
          />
          <Image
            src="/qrcard-lukas-hechenberger-dark.webp"
            alt={`QRcard of ${site.author.name}: email address, website, Instagram profile and QR code`}
            width={752}
            height={1233}
            priority
            className="hidden w-full rotate-2 rounded-2xl shadow-xl dark:block"
          />
          <figcaption className="text-muted-foreground text-sm">
            {site.author.name} on{' '}
            <a
              className="hover:text-foreground underline"
              href="https://www.qrcardapp.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              QRcard
            </a>
          </figcaption>
        </figure>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">Selected work</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {work.map(({ title, url, description, image, darkImage, tags }) => (
            <a key={title} href={url} target="_blank" rel="noopener noreferrer" className="group">
              <Card className="group-hover:bg-muted/50 h-full overflow-hidden pt-0 transition-colors">
                <div className="relative aspect-[8/5] overflow-hidden border-b">
                  <Image
                    src={image}
                    alt={`The home page of ${title}`}
                    fill
                    sizes="(min-width: 768px) 320px, 100vw"
                    className={`object-cover object-top transition-transform duration-300 group-hover:scale-105 ${darkImage ? 'dark:hidden' : ''}`}
                  />
                  {darkImage && (
                    <Image
                      src={darkImage}
                      alt={`The home page of ${title}`}
                      fill
                      sizes="(min-width: 768px) 320px, 100vw"
                      className="hidden object-cover object-top transition-transform duration-300 group-hover:scale-105 dark:block"
                    />
                  )}
                </div>
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
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">What I do</h2>
        <div className="grid gap-4 md:grid-cols-3">
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

      {latestPosts.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-16">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Latest posts</h2>
            <Link href="/blog" className="text-muted-foreground hover:text-foreground text-sm">
              All posts →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {latestPosts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card className="hover:bg-muted/50 h-full transition-colors">
                  <CardHeader>
                    <p className="text-muted-foreground text-sm">
                      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                    </p>
                    <CardTitle>{post.title}</CardTitle>
                    <CardDescription>{post.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
