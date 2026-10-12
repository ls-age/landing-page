import { getPosts } from '@/lib/posts';
import { absoluteUrl, site } from '@/lib/site';
import { tools, toolUrl } from '@/lib/tools';

export const revalidate = 3600;

/** A summary of the site for AI assistants (https://llmstxt.org) */
export async function GET() {
  const posts = await getPosts();

  const text = `# ${site.name}

> ${site.description}

- [About](${absoluteUrl('/')}): who I am and what I do
- [Open Source](${absoluteUrl('/open-source')}): my open source projects on GitHub
- [Tools](${absoluteUrl('/tools')}): small tools that run in the browser
- [GitHub](${site.author.github})

## Blog

${posts.map((post) => `- [${post.title}](${absoluteUrl(`/blog/${post.slug}`)}): ${post.description}`).join('\n') || 'No posts yet.'}

## Tools

${tools.map((tool) => `- [${tool.title}](${toolUrl(tool)}): ${tool.description}`).join('\n') || 'No tools yet.'}
`;

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
