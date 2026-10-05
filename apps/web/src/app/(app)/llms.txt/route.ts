import { getPosts } from '@/lib/posts';
import { absoluteUrl, site } from '@/lib/site';

export const revalidate = 3600;

/** A summary of the site for AI assistants (https://llmstxt.org) */
export async function GET() {
  const posts = await getPosts();

  const text = `# ${site.name}

> ${site.description}

- [About](${absoluteUrl('/')}): who I am and what I do
- [Open Source](${absoluteUrl('/open-source')}): my open source projects on GitHub
- [GitHub](${site.author.github})

## Blog

${posts.map((post) => `- [${post.title}](${absoluteUrl(`/blog/${post.slug}`)}): ${post.description}`).join('\n') || 'No posts yet.'}
`;

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
