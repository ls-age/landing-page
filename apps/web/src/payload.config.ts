import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres';
import { seoPlugin } from '@payloadcms/plugin-seo';
import {
  BlocksFeature,
  CodeBlock,
  HeadingFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import { codeLanguages } from './lib/code-languages';
import { site } from './lib/site';
import { Media } from './payload/collections/media';
import { Posts } from './payload/collections/posts';
import { Users } from './payload/collections/users';
import { collectionPath } from './payload/helpers';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  telemetry: false,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    livePreview: {
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
  collections: [Posts, Media, Users],
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      // The page title is the only h1
      ...defaultFeatures.filter((feature) => feature.key !== 'heading'),
      HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
      // Highlighted with Shiki when rendered (`components/code-block.tsx`)
      BlocksFeature({
        blocks: [CodeBlock({ languages: codeLanguages, defaultLanguage: 'typescript' })],
      }),
    ],
  }),
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
    seoPlugin({
      collections: ['posts'],
      uploadsCollection: 'media',
      tabbedUI: true,
      // The page title gets the site name appended (` · Lukas Hechenberger`)
      generateTitle: ({ doc }) => doc.title,
      generateDescription: ({ doc }) => doc.description,
      generateImage: ({ doc }) => doc.featuredImage,
      generateURL: ({ collectionSlug, doc }) =>
        new URL((collectionSlug && collectionPath(collectionSlug, doc)) || '/', site.url).href,
    }),
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
