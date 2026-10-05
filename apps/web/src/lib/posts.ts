import config from '@payload-config';
import { getPayload, type Where } from 'payload';
import 'server-only';

/** Published posts whose publication date has come (the same rule as the `posts` read access) */
const visible = (): Where => ({
  and: [
    { _status: { equals: 'published' } },
    { publishedAt: { less_than_equal: new Date().toISOString() } },
  ],
});

/** The visible posts, newest first, without their content */
export async function getPosts() {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'posts',
    where: visible(),
    sort: '-publishedAt',
    depth: 0,
    limit: 0,
    pagination: false,
    select: { title: true, slug: true, description: true, publishedAt: true, updatedAt: true },
  });

  return docs;
}

/** A visible post, or with `draft` its latest version (for the live preview) */
export async function getPost(slug: string, { draft = false } = {}) {
  const payload = await getPayload({ config });
  const {
    docs: [post],
  } = await payload.find({
    collection: 'posts',
    where: draft ? { slug: { equals: slug } } : { and: [{ slug: { equals: slug } }, visible()] },
    draft,
    depth: 1,
    limit: 1,
  });

  return post;
}

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(date));
