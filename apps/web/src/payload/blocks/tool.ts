import type { Block } from 'payload';
import { tools } from '@/lib/tools';

/** Embeds one of the tools (`lib/tools.ts`) in a post, rendered by `components/post-tool.tsx` */
export const ToolBlock: Block = {
  slug: 'Tool',
  interfaceName: 'ToolBlock',
  fields: [
    {
      name: 'tool',
      type: 'select',
      required: true,
      options: Object.entries(tools).map(([value, label]) => ({ value, label })),
    },
  ],
};
