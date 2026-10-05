import type { CollectionConfig } from 'payload';
import { adminOnly, anyone } from '@/payload/access';
import { revalidateSiteAfterChange, revalidateSiteAfterDelete } from '@/payload/revalidate';

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Payload',
  },
  access: { ...adminOnly, read: anyone },
  hooks: {
    afterChange: [revalidateSiteAfterChange],
    afterDelete: [revalidateSiteAfterDelete],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    skipSafeFetch: true,
    // An allow-list makes Payload fetch client uploads in full. Otherwise it only probes the first
    // megabyte of images, and that fetch hangs until the function times out for larger files
    mimeTypes: ['image/*'],
  },
};
