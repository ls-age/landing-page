import type {
  SerializedBlockNode,
  SerializedHeadingNode,
  SerializedUploadNode,
} from '@payloadcms/richtext-lexical';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext';
import {
  type JSXConvertersFunction,
  LinkJSXConverter,
  RichText as PayloadRichText,
} from '@payloadcms/richtext-lexical/react';
import { cn } from '@workspace/ui/lib/utils';
import { ArrowUpRightIcon, DownloadIcon } from 'lucide-react';
import Image from 'next/image';
import { cloneElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import slugify from 'slugify';
import type { Media } from '@/__generated__/payload-types';
import { CodeBlock } from '@/components/code-block';
import { PostTool } from '@/components/post-tool';
import { site } from '@/lib/site';
import { isTool } from '@/lib/tools';
import { collectionPath } from '@/payload/helpers';

/** The id of a heading, for links to it (`#…`) */
const headingId = (node: SerializedHeadingNode) =>
  slugify(convertLexicalToPlaintext({ data: { root: node } as never }), {
    strict: true,
    lower: true,
  });

// Internal links point to the linked document's page (from boraan's converters)
const links = LinkJSXConverter({
  internalDocToHref: ({ linkNode }) => {
    const { relationTo, value } = linkNode.fields.doc ?? {};
    const path =
      relationTo && typeof value === 'object' ? collectionPath(relationTo, value) : undefined;
    return path ?? '#';
  },
});

/** Files that links download instead of opening */
const fileExtension = /\.(3mf|stl|zip|pdf|svg|png|jpe?g|webp|csv|json)$/i;

/** Whether a link leaves the site or downloads a file (one on the site) */
function linkKind(href: string): 'external' | 'download' | undefined {
  const url = new URL(href, site.url);
  if (url.origin !== new URL(site.url).origin) return 'external';
  if (fileExtension.test(url.pathname)) return 'download';
}

const linkIcons = { external: ArrowUpRightIcon, download: DownloadIcon };

/**
 * Makes a link stand out from the text (in the primary color, also in dark mode, where the
 * primary color is too dark on the background) and puts an icon before links that leave the site
 * or download a file. Links in headings look like the heading.
 */
function styleLink(link: ReactNode) {
  const anchor = link as ReactElement<ComponentProps<'a'>>;
  const kind = linkKind(anchor.props.href ?? '');
  const Icon = kind && linkIcons[kind];

  return cloneElement(
    anchor,
    {
      className: cn(
        'text-primary decoration-primary/40 dark:text-rose-400 dark:decoration-rose-400/40 underline-offset-[0.2em] decoration-[0.08em] transition-colors hover:decoration-current',
        'in-[:is(h1,h2,h3,h4,h5,h6)]:text-inherit in-[:is(h1,h2,h3,h4,h5,h6)]:decoration-current/30',
      ),
      ...(kind === 'download' ? { download: '' } : {}),
    },
    Icon && (
      <Icon
        aria-hidden
        className="mr-0.5 inline size-[0.85em] align-[-0.05em]"
        strokeWidth={2.25}
      />
    ),
    anchor.props.children,
  );
}

/** The largest an image in the text gets, in rem: phone photos would fill the screen otherwise */
const imageBox = { width: 36, height: 32 };

/**
 * An uploaded image, optimized with `next/image` and centered, at most `imageBox` big (Payload's
 * converter shows the original file). `undefined` for other uploads and unpopulated ones.
 */
function uploadImage({ node }: { node: SerializedUploadNode }) {
  const media = node.value as Media | string;
  if (typeof media !== 'object' || !media.url || !media.mimeType?.startsWith('image/')) return;

  const width = media.width ?? 1200;
  const height = media.height ?? 900;
  // Fills the box's width, unless that makes it too high
  const displayWidth = Math.min(imageBox.width, (imageBox.height * width) / height);

  return (
    <Image
      src={media.url}
      alt={media.alt}
      width={width}
      height={height}
      sizes={`(min-width: ${displayWidth + 4}rem) ${displayWidth}rem, 100vw`}
      style={{ width: `${displayWidth}rem` }}
      className="mx-auto block h-auto"
    />
  );
}

/** A converter's output (converters can also be plain nodes) */
const render = (converter: unknown, converterArguments: unknown) =>
  typeof converter === 'function'
    ? (converter as (converterArguments: unknown) => ReactNode)(converterArguments)
    : (converter as ReactNode);

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  link: (converterArguments) => styleLink(render(links.link, converterArguments)),
  autolink: (converterArguments) => styleLink(render(links.autolink, converterArguments)),
  heading: ({ node, nodesToJSX }) => {
    const Tag = node.tag;
    return <Tag id={headingId(node)}>{nodesToJSX({ nodes: node.children })}</Tag>;
  },
  upload: (converterArguments) =>
    uploadImage(converterArguments) ?? render(defaultConverters.upload, converterArguments),
  blocks: {
    ...defaultConverters.blocks,
    Code: ({ node }: { node: SerializedBlockNode<{ code?: string; language?: string }> }) => (
      <CodeBlock code={node.fields.code ?? ''} language={node.fields.language} />
    ),
    // Outside the Typeset styles, which are for prose
    Tool: ({ node }: { node: SerializedBlockNode<{ tool?: string }> }) =>
      isTool(node.fields.tool) ? (
        <div className="not-typeset my-8">
          <PostTool tool={node.fields.tool} />
        </div>
      ) : null, // eslint-disable-line unicorn/no-null
  },
});

/** Payload rich text, styled with shadcn's Typeset */
export function RichText({ data }: { data: SerializedEditorState }) {
  return <PayloadRichText data={data} converters={converters} className="typeset" />;
}
