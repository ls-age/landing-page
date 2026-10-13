/** The tools posts can embed (as `Tool` blocks), each implemented in `src/tools/<slug>` */
export const tools = {
  'svg-to-stl': 'SVG to STL',
} as const;

export type ToolSlug = keyof typeof tools;

export const isTool = (value: unknown): value is ToolSlug =>
  typeof value === 'string' && Object.hasOwn(tools, value);

/** The tools embedded in rich text (Lexical JSON), in order of appearance and without duplicates */
export function toolsIn(content: unknown): ToolSlug[] {
  const found = new Set<ToolSlug>();
  const visit = (node: unknown) => {
    if (typeof node !== 'object' || node === null) return;
    const { type, fields, children, root } = node as Record<string, unknown>;
    if (type === 'block') {
      const { blockType, tool } = (fields ?? {}) as Record<string, unknown>;
      if (blockType === 'Tool' && isTool(tool)) found.add(tool);
    }
    if (Array.isArray(children)) for (const child of children) visit(child);
    visit(root);
  };
  visit(content);
  return [...found];
}
