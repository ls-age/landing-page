import { Badge } from '@workspace/ui/components/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { cn } from '@workspace/ui/lib/utils';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FeaturedImage, featuredImagesOf } from '@/components/featured-image';
import { formatDate, getPosts } from '@/lib/posts';

// Picks up scheduled posts (changes in the admin revalidate the whole site right away)
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Notes on things I built and problems I solved, mostly with Next.js and Payload.',
  alternates: { canonical: '/blog' },
};

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <>
      <section className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Blog</h1>
        <p className="text-muted-foreground text-lg">
          Notes on things I built and problems I solved, mostly with Next.js and Payload.
        </p>
      </section>

      <section className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pb-16">
        {posts.length === 0 && <p className="text-muted-foreground">No posts yet.</p>}
        {posts.map((post) => {
          const hasImage = featuredImagesOf(post) !== undefined;
          return (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <Card
                className={cn(
                  'hover:bg-muted/50 transition-colors',
                  hasImage && 'pt-0 sm:flex-row sm:items-center sm:py-0',
                )}
              >
                {hasImage && (
                  <div className="sm:w-72 sm:shrink-0 sm:self-stretch">
                    <FeaturedImage
                      post={post}
                      decorative
                      sizes="(min-width: 40rem) 288px, 100vw"
                      className="aspect-video size-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className={cn(hasImage && 'sm:flex-1 sm:py-6')}>
                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                    {post.tools.length > 0 && <Badge variant="secondary">Tool</Badge>}
                  </p>
                  <CardTitle className="text-xl">{post.title}</CardTitle>
                  <CardDescription>{post.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </section>
    </>
  );
}
