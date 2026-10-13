import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { ToolSlug } from '@/lib/tools';

// Loaded only on the posts that show them
const components: Record<ToolSlug, ComponentType> = {
  'svg-to-stl': dynamic(() =>
    import('@/tools/svg-to-stl/svg-to-stl').then((tool) => tool.SvgToStl),
  ),
};

/** A tool embedded in a post (a `Tool` block) */
export function PostTool({ tool }: { tool: ToolSlug }) {
  const Tool = components[tool];
  return <Tool />;
}
