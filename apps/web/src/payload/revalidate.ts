import { revalidatePath } from 'next/cache';
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload';

/**
 * The public pages are rendered statically and read Payload through the local API, which doesn't
 * tag anything, so `revalidateTag` can't reach them. The site is small, so every change invalidates
 * all of it; pages are re-rendered lazily on their next visit.
 */
function revalidateSite(request: PayloadRequest) {
  try {
    revalidatePath('/', 'layout');
  } catch (error) {
    // Expected outside of a Next.js request (e.g. in scripts), where there is no cache to invalidate
    request.payload.logger.warn({ err: error }, 'Could not revalidate the site');
  }
}

export const revalidateSiteAfterChange: CollectionAfterChangeHook = ({ doc, req }) => {
  revalidateSite(req);
  return doc;
};

export const revalidateSiteAfterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  revalidateSite(req);
  return doc;
};
