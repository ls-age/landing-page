import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { blogPosting, JsonLd } from '@/components/json-ld';
import { RichText } from '@/components/rich-text';
import { isPreviewingDrafts } from '@/lib/admin';
import { formatDate, getPost, getPosts } from '@/lib/posts';
import { site } from '@/lib/site';
import { RefreshRouteOnSave } from '@/payload/live-preview';

// Picks up scheduled posts (changes in the admin revalidate the whole site right away)
export const revalidate = 3600;

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug, { draft: await isPreviewingDrafts() });
  if (!post) return {};

  const image = typeof post.meta?.image === 'object' ? post.meta.image?.url : undefined;
  return {
    title: post.meta?.title || post.title,
    description: post.meta?.description || post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [site.author.name],
      // Without an image of its own, the post's generated `opengraph-image` is used
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function PostPage({ params }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params;
  const draft = await isPreviewingDrafts();
  const post = await getPost(slug, { draft });
  if (!post) notFound();

  const image = typeof post.featuredImage === 'object' ? post.featuredImage : undefined;

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      {draft && <RefreshRouteOnSave />}
      <JsonLd
        thing={blogPosting({
          title: post.title,
          description: post.description,
          slug: post.slug ?? slug,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          image: image?.url ?? undefined,
        })}
      />
      <header className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> ·{' '}
          <a href={site.author.github} className="hover:text-foreground">
            {site.author.name}
          </a>
        </p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight">{post.title}</h1>
        <p className="text-muted-foreground text-lg">{post.description}</p>
      </header>
      {image?.url && (
        <Image
          src={image.url}
          alt={image.alt}
          width={image.width ?? 1200}
          height={image.height ?? 630}
          priority
          className="rounded-xl"
        />
      )}
      <RichText data={post.content} />
    </article>
  );
}
