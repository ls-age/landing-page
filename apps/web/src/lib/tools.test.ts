import { describe, expect, test } from 'bun:test';
import { toolsIn } from './tools';

const toolBlock = (tool: string) => ({ type: 'block', fields: { blockType: 'Tool', tool } });

describe('toolsIn', () => {
  test('finds tool blocks anywhere in the content, once each', () => {
    const content = {
      root: {
        type: 'root',
        children: [
          { type: 'paragraph', children: [{ type: 'text', text: 'Hi' }] },
          toolBlock('svg-to-stl'),
          { type: 'quote', children: [toolBlock('svg-to-stl')] },
        ],
      },
    };
    expect(toolsIn(content)).toEqual(['svg-to-stl']);
  });

  test('ignores other blocks and unknown tools', () => {
    const content = {
      root: {
        type: 'root',
        children: [{ type: 'block', fields: { blockType: 'Code', code: '' } }, toolBlock('nope')],
      },
    };
    expect(toolsIn(content)).toEqual([]);
  });
});
