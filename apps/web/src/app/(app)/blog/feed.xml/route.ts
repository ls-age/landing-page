import { getPosts } from '@/lib/posts';
import { site } from '@/lib/site';

export const revalidate = 3600;

const escape = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** The blog's RSS 2.0 feed */
export async function GET() {
  const posts = await getPosts();
  const blogUrl = new URL('/blog', site.url).href;

  const items = posts.map((post) => {
    const url = new URL(`/blog/${post.slug}`, site.url).href;
    return `    <item>
      <title>${escape(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escape(post.description)}</description>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
    </item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(`${site.name} · Blog`)}</title>
    <link>${blogUrl}</link>
    <description>${escape(site.description)}</description>
    <language>en</language>
    <atom:link href="${blogUrl}/feed.xml" rel="self" type="application/rss+xml" />
${items.join('\n')}
  </channel>
</rss>
`;

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
