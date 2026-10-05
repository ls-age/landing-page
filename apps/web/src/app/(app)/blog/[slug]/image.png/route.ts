import { ogImage } from '@/lib/og-image';
import { getPost, getPosts } from '@/lib/posts';

export const revalidate = 3600;

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map(({ slug }) => ({ slug }));
}

/**
 * The post's generated image at a stable URL, for the structured data. The `opengraph-image`
 * file convention only serves its image under a hashed URL in production.
 */
export async function GET(_request: Request, { params }: RouteContext<'/blog/[slug]/image.png'>) {
  const { slug } = await params;
  const post = await getPost(slug);

  return ogImage({ title: post?.title ?? 'Blog', eyebrow: 'Blog' });
}
