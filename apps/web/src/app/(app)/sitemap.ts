import type { MetadataRoute } from 'next';
import { getRepositories } from '@/lib/github';
import { getPosts } from '@/lib/posts';
import { absoluteUrl } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, repositories] = await Promise.all([getPosts(), getRepositories()]);

  return [
    { url: absoluteUrl('/') },
    { url: absoluteUrl('/blog'), lastModified: posts[0]?.publishedAt },
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.updatedAt,
    })),
    { url: absoluteUrl('/open-source'), lastModified: repositories[0]?.pushedAt },
    ...repositories.map((repo) => ({
      url: absoluteUrl(`/open-source/${repo.nameWithOwner}`),
      lastModified: repo.pushedAt,
    })),
  ];
}
