import config from '@payload-config';
import { draftMode, headers } from 'next/headers';
import { getPayload } from 'payload';
import type { User } from '@/__generated__/payload-types';

/** The admin (`users` collection) of the current request, if any */
export async function getAdmin(): Promise<User | undefined> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers(), canSetHeaders: false });

  return user?.collection === 'users' ? user : undefined;
}

/**
 * Whether the current request may see unpublished content: draft mode is on (see `/api/draft`)
 * and an admin is logged in. Checks the session too, so a leaked draft mode cookie isn't enough.
 */
export async function isPreviewingDrafts() {
  const { isEnabled } = await draftMode();

  return isEnabled && Boolean(await getAdmin());
}
