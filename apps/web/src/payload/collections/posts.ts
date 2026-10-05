import type { CollectionConfig } from 'payload';
import { adminOnly, publishedPostOrAdmin } from '@/payload/access';
import { titleBasedSlug } from '@/payload/helpers';
import { revalidateSiteAfterChange, revalidateSiteAfterDelete } from '@/payload/revalidate';

/** Previews go through the draft endpoint, so they show unpublished changes too */
const previewUrl = (slug: unknown) =>
  typeof slug === 'string' && slug ? `/api/draft?${new URLSearchParams({ slug })}` : null; // eslint-disable-line unicorn/no-null

export const Posts: CollectionConfig<'posts'> = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', '_status'],
    preview: (data) => previewUrl(data.slug),
    livePreview: { url: ({ data }) => previewUrl(data.slug) },
  },
  access: { ...adminOnly, read: publishedPostOrAdmin },
  versions: {
    // No autosave: every save revalidates the whole site (see `revalidate.ts`)
    drafts: true,
  },
  hooks: {
    afterChange: [revalidateSiteAfterChange],
    afterDelete: [revalidateSiteAfterDelete],
  },
  fields: [
    ...titleBasedSlug('posts'),
    {
      name: 'description',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Shown on the blog page and used as the meta description.',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Published posts only show up from this date on (within an hour).',
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      admin: { position: 'sidebar' },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
  ],
};
