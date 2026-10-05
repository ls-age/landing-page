Default to using Bun instead of Node.js: `bun install`, `bun run <script>`, `bunx <package>`, `bun test`. Bun loads `.env` and `.env.local` automatically, so don't use dotenv.

## Repository layout

Lukas Hechenberger's website and blog (lukashechenberger.com). Bun workspaces + Turborepo monorepo, deployed to Vercel. The plan for the rebuild and the blog is in `docs/blog-plan.md`.

- `apps/web` (`@ls-age/web`): Next.js app. Source in `src/`: `app/` (routes), `components/`, `lib/` (`site.ts` holds the site name, URL and author).
- `packages/ui` (`@workspace/ui`): shared shadcn components (Base UI, style `base-luma`, Rose theme). Add components from `apps/web` with `bunx shadcn@latest add <component>`; they land in `packages/ui`. Keep them as generated: style pages with Tailwind classes, don't restyle the components.
- `packages/eslint-config`, `packages/typescript-config`, `packages/toolsync-plugin`: shared tooling config, kept in sync with the boraan and QRcard repos.

## Generated files

`bun install` runs `prepare` (toolsync + ignore-sync), which writes `turbo.json`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.vscode/*`, `.github/workflows/ci.yml`, the package README headers and `.mcp.json`. Change `toolsync.json`, `packages/toolsync-plugin`, `.gitignore-sync` or `.prettierignore-sync` instead and run `bun run prepare`.

## MCP servers, plugins and skills

- `.mcp.json` is generated and git-ignored: `bun run prepare` creates it from the committed `.mcp.template.json`, expanding `${VAR}` / `${VAR:-default}` from the environment (put values in the git-ignored `.env.local`). Edit the template, never `.mcp.json`, and never put token values in it. Restart Claude Code afterwards.

  | Server          | Variable | Notes                                             |
  | --------------- | -------- | ------------------------------------------------- |
  | `next-devtools` | –        | Errors, routes and docs of the running dev server |

- `.claude/settings.json` enables the Vercel, PostHog and Neon Claude Code plugins, which bring their own skills and MCP servers.
- Skills from the [skills](https://skills.sh) registry are installed with `bunx skills add <owner/repo> -s <skill> -a claude-code` and tracked in `skills-lock.json`. Only install official skills (published by the maker of the technology), and only for topics no plugin covers. Project-specific skills live in `.claude/skills` next to them.

## Next.js docs

`apps/web` runs Next.js 16.3, which may differ from training data in APIs, conventions and file structure. Before writing code in `apps/web`, check the version-matched docs at `apps/web/node_modules/next/dist/docs/`.

## Checks

CI runs these; run them before pushing (or use the `pre-pr` skill):

- `bun run check`: knip, Prettier and `tsc --noEmit` via turbo.
- `bun run lint`: ESLint with `--max-warnings 0`.
- `bun run format`: fix Prettier issues.

## Changesets

Add a changeset (`.changeset/<name>.md`) for every change that's visible on the site or may be a source of errors: changed layouts or behavior, schema changes and migrations, changed data fetching or SEO output. Purely internal changes (docs, tooling, refactors without visible effect) don't need one. Only `@ls-age/web` is versioned; name it in the changeset, also for changes in `packages/ui` that affect the site.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
