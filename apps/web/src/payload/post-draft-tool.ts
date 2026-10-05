import type { PayloadRequest } from 'payload';
import { z } from 'zod';
import type { Post } from '@/__generated__/payload-types';
import { codeLanguages } from '@/lib/code-languages';
import { validatePostContent } from './post-content';
import { examplePostContent } from './post-content-example';

/**
 * MCP tools and resources for agents writing blog posts. Posts are only ever saved as drafts here
 * (publishing is up to Lukas in the admin panel), and their content must be Lexical JSON that
 * passes `validatePostContent`; the `post-content-format` resource explains the format.
 */

const lexicalSchema = z
  .object({
    root: z.object({ type: z.literal('root'), children: z.array(z.unknown()) }).passthrough(),
  })
  .passthrough()
  .describe(
    'Lexical JSON ({ "root": { "type": "root", "children": [...] } }), not Markdown or HTML. ' +
      'Read the post-content-format resource first.',
  );

const postDraftParameters = {
  id: z.string().optional().describe('ID of an existing post to update. Omit to create a new one'),
  title: z
    .string()
    .min(1)
    .optional()
    .describe('Required for new posts. The slug is generated from it once and then kept'),
  description: z
    .string()
    .min(1)
    .optional()
    .describe('One or two sentences, shown on the blog page and as the meta description'),
  content: lexicalSchema.optional(),
  publishedAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe('Publication date (ISO 8601). Published posts only show up from this date on'),
  featuredImage: z.string().nullable().optional().describe('Media ID, or null to remove it'),
  metaTitle: z.string().optional().describe('SEO title if it should differ from the title'),
  metaDescription: z
    .string()
    .optional()
    .describe('SEO description if it should differ from the description (120-155 characters)'),
};

type PostDraftInput = z.infer<z.ZodObject<typeof postDraftParameters>>;

const text = (value: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value) }],
});

async function savePostDraft(input: PostDraftInput, request: PayloadRequest) {
  const { payload } = request;

  if (input.content) {
    const problems = await validatePostContent(input.content, payload);
    if (problems.length > 0) {
      throw new Error(`Invalid content, nothing was saved:\n- ${problems.join('\n- ')}`);
    }
  }

  const data = {
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.content === undefined
      ? {}
      : { content: input.content as unknown as Post['content'] }),
    ...(input.publishedAt === undefined ? {} : { publishedAt: input.publishedAt }),
    ...(input.featuredImage === undefined ? {} : { featuredImage: input.featuredImage }),
    ...(input.metaTitle === undefined && input.metaDescription === undefined
      ? {}
      : { meta: { title: input.metaTitle, description: input.metaDescription } }),
    _status: 'draft' as const,
  };
  const options = {
    collection: 'posts',
    draft: true,
    depth: 0,
    overrideAccess: false,
    req: request,
  } as const;

  if (input.id) return payload.update({ ...options, id: input.id, data });

  if (!input.title) throw new Error('A new post needs a title (its slug is generated from it)');
  return payload.create({ ...options, data: { ...data, title: input.title } as never });
}

export const postDraftTool = {
  name: 'savePostDraft',
  description:
    'Save a blog post on lukashechenberger.com as a draft (creates it, or updates it by id). ' +
    'Never publishes. Pass only what changes. `content` must be Lexical JSON in the format of ' +
    'the post-content-format resource; invalid content is rejected with a list of problems and ' +
    "nothing is saved. Returns the post's id, slug, status and URLs.",
  parameters: postDraftParameters,
  handler: async (arguments_: Record<string, unknown>, request: PayloadRequest) => {
    const post = await savePostDraft(z.object(postDraftParameters).parse(arguments_), request);

    return text({
      id: post.id,
      slug: post.slug,
      status: post._status,
      // Relative to the MCP server's site (local, preview or production)
      adminPath: `/admin/collections/posts/${post.id}`,
      // Through the draft endpoint, which needs a logged-in admin
      previewPath: `/api/draft?${new URLSearchParams({ slug: post.slug ?? '' })}`,
    });
  },
};

export const postContentFormatResource = {
  name: 'post-content-format',
  title: 'Blog post content format',
  description:
    "The Lexical JSON format of a blog post's content (savePostDraft), with an example of every node",
  uri: 'lukashechenberger://post-content-format',
  mimeType: 'text/markdown',
  handler: (uri: URL) => ({
    contents: [
      {
        uri: uri.href,
        text: `# Blog post content format

Post content is Payload's Lexical JSON: \`{ "root": { "type": "root", "children": [...] } }\`.
Markdown, HTML or plain strings are rejected.

## Allowed nodes

- \`paragraph\` with \`text\` children. Text \`format\` is a bit mask: 0 plain, 1 bold, 2 italic,
  16 inline code (e.g. 3 = bold italic).
- \`heading\` with \`tag\` "h2", "h3" or "h4" (the post title is the page's h1).
- \`link\` inside a paragraph: \`fields.linkType\` "custom" with a \`fields.url\`, or "internal" with
  \`fields.doc\`: \`{ "relationTo": "posts", "value": "<post id>" }\` to link to another post.
- \`list\` (\`listType\` "bullet" or "number", \`tag\` "ul" or "ol") with \`listitem\` children.
- \`quote\` with text children.
- \`block\` with \`fields.blockType\` "Code": a code block with \`fields.code\` and
  \`fields.language\`, one of ${Object.keys(codeLanguages)
    .map((language) => `"${language}"`)
    .join(', ')}. Every block needs a unique \`fields.id\` (24 hex characters).
- \`upload\` with \`relationTo\` "media" and the media id as \`value\` (an image).

Keep \`version\`, \`format\`, \`indent\` and \`direction\` as in the example. Every link also needs
a unique \`id\`.

## Example

\`\`\`json
${JSON.stringify(examplePostContent, undefined, 2)}
\`\`\`
`,
      },
    ],
  }),
};

export const postsResource = {
  name: 'posts',
  title: 'Blog posts',
  description: 'The blog posts on lukashechenberger.com (published and drafts) with id and slug',
  uri: 'lukashechenberger://posts',
  mimeType: 'text/markdown',
  handler: async (uri: URL, request: PayloadRequest) => {
    const { docs } = await request.payload.find({
      collection: 'posts',
      draft: true,
      depth: 0,
      pagination: false,
      overrideAccess: false,
      req: request,
      sort: '-publishedAt',
      select: { title: true, slug: true, description: true, publishedAt: true, _status: true },
    });

    const lines = docs.map(
      (post) =>
        `- **${post.title}** (id ${post.id}, /blog/${post.slug}, ${post._status}, ${post.publishedAt.slice(0, 10)}): ${post.description}`,
    );

    return {
      contents: [{ uri: uri.href, text: `# Blog posts\n\n${lines.join('\n') || 'None yet.'}\n` }],
    };
  },
};
