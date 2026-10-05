import config from '@payload-config';
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { getPayload } from 'payload';
import { getAdmin } from '@/lib/admin';

/**
 * Live preview of unpublished posts (from boraan): enables Next.js draft mode for a logged-in admin
 * and redirects to the post. The target path is built from the post found, never taken from the
 * query, so this can't be used as an open redirect.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return new Response('Invalid preview request', { status: 400 });

  if (!(await getAdmin())) return new Response('Unauthorized', { status: 401 });

  const payload = await getPayload({ config });
  const {
    docs: [post],
  } = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    draft: true,
    depth: 0,
    limit: 1,
    select: { slug: true },
  });
  if (!post?.slug) return new Response('Not found', { status: 404 });

  const draft = await draftMode();
  draft.enable();

  redirect(`/blog/${post.slug}`);
}
