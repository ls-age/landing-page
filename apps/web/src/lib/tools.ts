import { absoluteUrl } from '@/lib/site';

export interface Tool {
  /** The tool's page is `/tools/<slug>` */
  slug: string;
  title: string;
  description: string;
}

/** The small tools on `/tools`, each implemented in `app/(app)/tools/<slug>` */
export const tools: Tool[] = [];

export const toolPath = (tool: Tool) => `/tools/${tool.slug}`;

export const toolUrl = (tool: Tool) => absoluteUrl(toolPath(tool));
