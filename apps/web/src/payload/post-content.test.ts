import configPromise from '@payload-config';
import { describe, expect, test } from 'bun:test';
import type { Payload } from 'payload';
import { validatePostContent } from './post-content';
import { examplePostContent } from './post-content-example';

const config = await configPromise;
const payload = {
  config,
  find: () => Promise.reject(new Error('unexpected')),
} as unknown as Payload;

const withChildren = (children: unknown[]) => ({
  root: { ...examplePostContent.root, children },
});
const paragraph = examplePostContent.root.children[0];

describe('validatePostContent', () => {
  test('accepts the example given to agents', async () => {
    expect(await validatePostContent(examplePostContent, payload)).toEqual([]);
  });

  test('rejects Markdown and other strings', async () => {
    expect(await validatePostContent('## Hello', payload)).toHaveLength(1);
  });

  test('rejects h1 headings', async () => {
    const heading = { ...examplePostContent.root.children[1], tag: 'h1' };
    expect(await validatePostContent(withChildren([heading]), payload)).toEqual([
      'root.children[0]: headings must be h2, h3 or h4 (the post title is the h1)',
    ]);
  });

  test('rejects unknown code languages', async () => {
    const block = examplePostContent.root.children[2];
    const code = { ...block, fields: { ...block.fields, language: 'cobol' } };
    const [problem] = await validatePostContent(withChildren([code]), payload);
    expect(problem).toStartWith('root.children[0]: unknown code language "cobol"');
  });

  test('rejects node types the editor does not know', async () => {
    const table = { type: 'table', version: 1, children: [] };
    const problems = await validatePostContent(withChildren([paragraph, table]), payload);
    expect(problems.some((problem) => problem.startsWith("the editor can't load"))).toBe(true);
  });
});
