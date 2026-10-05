import type { CollectionConfig } from 'payload';
import { adminOnly } from '@/payload/access';

export const Users: CollectionConfig = {
  slug: 'users',
  access: adminOnly,
  admin: {
    useAsTitle: 'email',
    group: 'Payload',
  },
  auth: true,
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
};
