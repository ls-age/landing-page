import { type CollectionConfig, type CollectionSlug, slugField } from 'payload';
import slugify from 'slugify';

type Slugify = NonNullable<NonNullable<Parameters<typeof slugField>[0]>['slugify']>;

const toSlug = (value: string) => slugify(value, { strict: true, lower: true });

/**
 * A `title` and a `slug` generated from it with Payload's `slugField` (from boraan's
 * `titleBasedSlug`, without the localization).
 *
 * The slug is generated once and then kept, so titles can change without breaking published URLs
 * (it can still be edited or regenerated in the admin panel). Taken slugs get a numeric suffix.
 */
export function titleBasedSlug<C extends CollectionSlug>(collection: C) {
  const slugFromTitle: Slugify = async ({ data, req, valueToSlugify }) => {
    // A slug that was entered explicitly wins (on create, it's passed instead of the title)
    if (data?.slug && valueToSlugify === data.slug) return toSlug(data.slug);
    if (typeof valueToSlugify !== 'string' || !valueToSlugify) return;

    const base = toSlug(valueToSlugify);
    for (let index = 0; index < 10; index++) {
      const candidate = index === 0 ? base : `${base}-${index}`;
      const { totalDocs } = await req.payload.count({
        collection,
        where: {
          slug: { equals: candidate },
          ...(data?.id ? { id: { not_equals: data.id } } : {}),
        },
        req,
      });
      if (totalDocs === 0) return candidate;
    }

    throw new Error(`No free slug for "${valueToSlugify}"`);
  };

  return [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField({
      useAsSlug: 'title',
      slugify: slugFromTitle,
      overrides: (row) => {
        const slug = row.fields.find((field) => 'name' in field && field.name === 'slug');
        if (slug?.type === 'text') {
          slug.admin = {
            ...slug.admin,
            description: 'Generated from the title when it is first saved. Keep it once published.',
          };
          // `slugField` generates in a `beforeChange` hook, after validation: in the admin panel
          // its field component fills the slug before saving, through the API (e.g. MCP) nothing does
          slug.hooks = {
            ...slug.hooks,
            beforeValidate: [
              ...(slug.hooks?.beforeValidate ?? []),
              async ({ value, data, req }) =>
                value ||
                ((await slugFromTitle({ data, req, valueToSlugify: data?.title })) ?? value),
            ],
          };
        }
        return row;
      },
    }),
  ] as const satisfies CollectionConfig<C>['fields'];
}

/** The public path of a document, if its collection has pages */
export const collectionPath = (collection: string, document: Record<string, unknown>) =>
  collection === 'posts' && typeof document.slug === 'string'
    ? `/blog/${document.slug}`
    : undefined;
