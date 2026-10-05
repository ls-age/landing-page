import type { Access, CollectionConfig, PayloadRequest, Where } from 'payload';

/**
 * Access control helpers (from boraan, to be shared later).
 *
 * Payload's default access is "any logged-in user", regardless of their collection. Admins are the
 * `users` collection, so always check the collection instead of just `req.user`, and define every
 * operation explicitly (`access.test.ts` enforces this).
 */

const isAdmin = ({ req }: { req: Pick<PayloadRequest, 'user'> }): boolean =>
  req.user?.collection === 'users';

export const anyone: Access = () => true;

/** Admins see all posts, everyone else published posts once their publication date has come */
export const publishedPostOrAdmin: Access = ({ req }) => {
  if (isAdmin({ req })) return true;

  const visible: Where = {
    and: [
      { _status: { equals: 'published' } },
      { publishedAt: { less_than_equal: new Date().toISOString() } },
    ],
  };
  return visible;
};

export const adminOnly = {
  create: isAdmin,
  read: isAdmin,
  update: isAdmin,
  delete: isAdmin,
  readVersions: isAdmin,
  unlock: isAdmin,
} satisfies Required<Omit<NonNullable<CollectionConfig['access']>, 'admin'>>;
