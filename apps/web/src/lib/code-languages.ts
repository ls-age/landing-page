/**
 * The languages of code blocks: the keys are Shiki's language ids (also understood by the admin
 * panel's Monaco editor where it supports them), the values the labels in the editor.
 */
export const codeLanguages = {
  typescript: 'TypeScript',
  tsx: 'TSX',
  javascript: 'JavaScript',
  json: 'JSON',
  shellscript: 'Shell',
  css: 'CSS',
  html: 'HTML',
  sql: 'SQL',
  yaml: 'YAML',
  markdown: 'Markdown',
  diff: 'Diff',
  text: 'Plain text',
} as const;
