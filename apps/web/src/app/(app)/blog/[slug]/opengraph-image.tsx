import { ogImage } from '@/lib/og-image';
import { getPost, getPosts } from '@/lib/posts';

export const contentType = 'image/png';

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map(({ slug }) => ({ slug }));
}

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);

  return ogImage({ title: post?.title ?? 'Blog', eyebrow: 'Blog' });
}

export { ogImageSize as size } from '@/lib/og-image';
