import type { BlogPosting, Person, Thing, WebSite, WithContext } from 'schema-dts';
import { site } from '@/lib/site';

export function JsonLd<T extends Thing>({ thing }: { thing: WithContext<T> }) {
  return (
    <script
      type="application/ld+json"
      // Escaped, so content can't close the script element
      dangerouslySetInnerHTML={{ __html: JSON.stringify(thing).replaceAll('<', String.raw`<`) }}
    />
  );
}

/** The site's author, referenced by the website and the blog posts */
const author = {
  '@type': 'Person',
  '@id': `${site.url}/#person`,
  name: site.author.name,
  url: site.url,
  image: `${site.url}/lukas-hechenberger.png`,
  sameAs: [site.author.github],
} satisfies Exclude<Person, string>;

export const website: WithContext<WebSite> = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${site.url}/#website`,
  name: site.name,
  url: site.url,
  description: site.description,
  author,
  inLanguage: 'en',
};

export function blogPosting(post: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt: string;
  image?: string;
}): WithContext<BlogPosting> {
  const url = `${site.url}/blog/${post.slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#post`,
    mainEntityOfPage: url,
    url,
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author,
    publisher: author,
    image: post.image ?? `${url}/opengraph-image`,
    inLanguage: 'en',
    isPartOf: { '@id': `${site.url}/#website` },
  };
}
