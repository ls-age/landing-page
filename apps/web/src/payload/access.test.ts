import configPromise from '@payload-config';
import { describe, expect, test } from 'bun:test';

/**
 * Payload falls back to "any logged-in user" for undefined access, which would include customers.
 * Every collection and global must therefore define its access explicitly (see `access.ts`).
 */

/**
 * Payload's own collections, which keep the default access. Only safe as long as customers can't
 * authenticate against Payload's REST/GraphQL API (the `customers` collection has no auth strategy).
 */
const internalCollections = new Set([
  // Denies every API operation by default; jobs are queued and run through the local API
  'payload-jobs',
  'payload-kv',
  'payload-locked-documents',
  'payload-migrations',
  'payload-preferences',
]);

/** Added by `@payloadcms/plugin-mcp`, restricted to the `users` collection by the plugin itself */
const pluginCollections = new Set(['payload-mcp-api-keys']);

const collectionOperations = [
  'create',
  'read',
  'update',
  'delete',
  'readVersions',
  'unlock',
] as const;
const globalOperations = ['read', 'update', 'readVersions'] as const;

const config = await configPromise;

const isDefault = (access: unknown) =>
  typeof access !== 'function' || /^default.*Access$/.test(access.name);

describe('access control', () => {
  const collections = config.collections.filter(
    ({ slug }) => !internalCollections.has(slug) && !pluginCollections.has(slug),
  );

  test.each(collections.map(({ slug, access }) => [slug, access] as const))(
    'collection %s defines every operation',
    (_slug, access) => {
      const defaults = collectionOperations.filter((operation) => isDefault(access[operation]));
      expect(defaults).toEqual([]);
    },
  );

  test.each(config.globals.map(({ slug, access }) => [slug, access] as const))(
    'global %s defines every operation',
    (_slug, access) => {
      const defaults = globalOperations.filter((operation) => isDefault(access[operation]));
      expect(defaults).toEqual([]);
    },
  );

  test('internal collections are known', () => {
    const unknown = config.collections
      .map(({ slug }) => slug)
      .filter((slug) => slug.startsWith('payload-'))
      .filter((slug) => !internalCollections.has(slug) && !pluginCollections.has(slug));
    expect(unknown).toEqual([]);
  });
});
