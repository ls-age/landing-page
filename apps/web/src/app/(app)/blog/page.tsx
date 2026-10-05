import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDate, getPosts } from '@/lib/posts';

// Picks up scheduled posts (changes in the admin revalidate the whole site right away)
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Notes on things I built and problems I solved, mostly with Next.js and Payload.',
};

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <>
      <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Blog</h1>
        <p className="text-muted-foreground text-lg">
          Notes on things I built and problems I solved, mostly with Next.js and Payload.
        </p>
      </section>

      <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pb-16">
        {posts.length === 0 && <p className="text-muted-foreground">No posts yet.</p>}
        {posts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader>
                <p className="text-muted-foreground text-sm">
                  <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                </p>
                <CardTitle className="text-xl">{post.title}</CardTitle>
                <CardDescription>{post.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>
    </>
  );
}
