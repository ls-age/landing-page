import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres';
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import { Media } from './payload/collections/media';
import { Users } from './payload/collections/users';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  telemetry: false,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, '__generated__/payload-types.ts'),
  },
  db: vercelPostgresAdapter({
    idType: 'uuid',
    // Local databases (the Neon `dev` branch) use the migrations too (`bun run migration:deploy`),
    // so they never drift from production and schema changes are tested with the migration that
    // ships them. Deployments run them before the build (`vercel.json`)
    push: false,
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [
    vercelBlobStorage({
      // Local development stores uploads on disk (`apps/web/media`); `migration:create` passes a
      // placeholder token so the plugin's columns end up in the migrations
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: {
        media: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      clientUploads: true, // bypass the request size limit of Vercel Functions
    }),
  ],
});
