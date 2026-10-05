import { bundledLanguages, codeToHtml } from 'shiki';

/**
 * A code block, highlighted on the server with Shiki. Both themes are rendered as CSS variables
 * and picked by the `.shiki` rules in `@workspace/ui/globals.css`, so it follows dark mode without
 * any client JavaScript.
 */
export async function CodeBlock({ code, language }: { code: string; language?: string | null }) {
  const lang = language && language in bundledLanguages ? language : 'text';
  const html = await codeToHtml(code, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  });

  // Shiki escapes the code, so its HTML is safe to render
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
