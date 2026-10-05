import { editorConfigFactory, getEnabledNodes } from '@payloadcms/richtext-lexical';
import { createHeadlessEditor } from '@payloadcms/richtext-lexical/lexical/headless';
import type { Payload } from 'payload';
import { codeLanguages } from '@/lib/code-languages';

/**
 * Strict validation of a post's content (Lexical JSON) for agents writing posts through MCP.
 *
 * Payload itself only checks the rough shape of rich text. This also loads the content into a
 * headless Lexical editor with the posts' editor config (unknown node types fail there) and checks
 * what the editor config allows but the site doesn't render: other headings than h2-h4, blocks
 * other than code blocks, code languages without highlighting, and links to nothing.
 */

type Node = { type?: unknown; children?: unknown; [key: string]: unknown };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Problems in the nodes' fields, with the path of each node (e.g. `root.children[2]`) */
function checkNodes(node: Node, path: string, problems: string[], internalLinks: string[]) {
  const fields = isRecord(node.fields) ? node.fields : {};

  switch (node.type) {
    case 'heading': {
      if (!['h2', 'h3', 'h4'].includes(String(node.tag))) {
        problems.push(`${path}: headings must be h2, h3 or h4 (the post title is the h1)`);
      }
      break;
    }
    case 'block': {
      if (fields.blockType === 'Code') {
        if (typeof fields.code !== 'string' || !fields.code) {
          problems.push(`${path}: a code block needs \`fields.code\``);
        }
        if (!(String(fields.language) in codeLanguages)) {
          problems.push(
            `${path}: unknown code language "${String(fields.language)}", use one of ${Object.keys(codeLanguages).join(', ')}`,
          );
        }
      } else {
        problems.push(`${path}: the only block is "Code", not "${String(fields.blockType)}"`);
      }
      break;
    }
    case 'link':
    case 'autolink': {
      if (fields.linkType === 'internal') {
        const document_ = isRecord(fields.doc) ? fields.doc : {};
        const id = isRecord(document_.value) ? document_.value.id : document_.value;
        if (document_.relationTo !== 'posts' || typeof id !== 'string') {
          problems.push(
            `${path}: internal links need \`fields.doc\`: { relationTo: "posts", value: "<post id>" }`,
          );
        } else {
          internalLinks.push(id);
        }
      } else if (typeof fields.url !== 'string' || !/^(https?:|mailto:|#|\/)/.test(fields.url)) {
        problems.push(`${path}: external links need an http(s), mailto, # or / \`fields.url\``);
      }
      break;
    }
    case 'upload': {
      if (node.relationTo !== 'media' || typeof node.value !== 'string') {
        problems.push(`${path}: images need relationTo "media" and the media id as \`value\``);
      }
      break;
    }
  }

  if (Array.isArray(node.children)) {
    for (const [index, child] of node.children.entries()) {
      if (isRecord(child)) checkNodes(child, `${path}.children[${index}]`, problems, internalLinks);
      else problems.push(`${path}.children[${index}]: not a node`);
    }
  }
}

/** The problems with the content, empty if it can be saved */
export async function validatePostContent(
  content: unknown,
  payload: Pick<Payload, 'config' | 'find'>,
): Promise<string[]> {
  if (!isRecord(content) || !isRecord(content.root) || content.root.type !== 'root') {
    return ['content must be Lexical JSON: { "root": { "type": "root", "children": [...] } }'];
  }

  const problems: string[] = [];
  const internalLinks: string[] = [];
  checkNodes(content.root, 'root', problems, internalLinks);

  // The editor config of the posts' content field (not Payload's default editor)
  const field = payload.config.collections
    .find(({ slug }) => slug === 'posts')
    ?.flattenedFields.find((candidate) => candidate.name === 'content');
  if (field?.type !== 'richText') throw new Error('posts have no rich text content field');
  const editorConfig = editorConfigFactory.fromField({ field });

  // Lexical reports parse errors (e.g. unknown node types) to `onError` instead of throwing
  const editor = createHeadlessEditor({
    nodes: getEnabledNodes({ editorConfig }),
    onError: (error) => problems.push(`the editor can't load the content: ${error.message}`),
  });
  try {
    editor.setEditorState(editor.parseEditorState(JSON.stringify(content)));
  } catch (error) {
    problems.push(`the editor can't load the content: ${(error as Error).message}`);
  }

  if (internalLinks.length > 0 && problems.length === 0) {
    const { docs } = await payload.find({
      collection: 'posts',
      where: { id: { in: internalLinks } },
      draft: true,
      depth: 0,
      limit: 0,
      pagination: false,
      select: { slug: true },
    });
    const found = new Set(docs.map(({ id }) => id));
    for (const id of internalLinks) if (!found.has(id)) problems.push(`no post with id "${id}"`);
  }

  return problems;
}
