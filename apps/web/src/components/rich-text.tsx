import type { SerializedBlockNode, SerializedHeadingNode } from '@payloadcms/richtext-lexical';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext';
import {
  type JSXConvertersFunction,
  LinkJSXConverter,
  RichText as PayloadRichText,
} from '@payloadcms/richtext-lexical/react';
import slugify from 'slugify';
import { CodeBlock } from '@/components/code-block';
import { collectionPath } from '@/payload/helpers';

/** The id of a heading, for links to it (`#…`) */
const headingId = (node: SerializedHeadingNode) =>
  slugify(convertLexicalToPlaintext({ data: { root: node } as never }), {
    strict: true,
    lower: true,
  });

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  // Internal links point to the linked document's page (from boraan's converters)
  ...LinkJSXConverter({
    internalDocToHref: ({ linkNode }) => {
      const { relationTo, value } = linkNode.fields.doc ?? {};
      const path =
        relationTo && typeof value === 'object' ? collectionPath(relationTo, value) : undefined;
      return path ?? '#';
    },
  }),
  heading: ({ node, nodesToJSX }) => {
    const Tag = node.tag;
    return <Tag id={headingId(node)}>{nodesToJSX({ nodes: node.children })}</Tag>;
  },
  blocks: {
    ...defaultConverters.blocks,
    Code: ({ node }: { node: SerializedBlockNode<{ code?: string; language?: string }> }) => (
      <CodeBlock code={node.fields.code ?? ''} language={node.fields.language} />
    ),
  },
});

/** Payload rich text, styled with shadcn's Typeset */
export function RichText({ data }: { data: SerializedEditorState }) {
  return <PayloadRichText data={data} converters={converters} className="typeset" />;
}
