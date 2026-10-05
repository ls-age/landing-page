Default to using Bun instead of Node.js: `bun install`, `bun run <script>`, `bunx <package>`, `bun test`. Bun loads `.env` and `.env.local` automatically, so don't use dotenv.

## Repository layout

Lukas Hechenberger's website and blog (lukashechenberger.com). Bun workspaces + Turborepo monorepo, deployed to Vercel. The plan for the rebuild and the blog is in `docs/blog-plan.md`.

- `apps/web` (`@ls-age/web`): Next.js app with Payload CMS. Source in `src/`: `app/(app)/` (the site's routes), `app/(payload)/` (admin and API, generated), `components/`, `lib/` (`site.ts` holds the site name, URL and author), `payload/` (collections, access helpers, hooks), `payload.config.ts`, `migrations/`, `__generated__/`.
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

## Payload

Run Payload commands from `apps/web` via the `x-payload` script (`bun run x-payload <command>`), not `payload` directly.

- `src/__generated__/` is generated and git-ignored (`bun run build:payload` writes `payload-types.ts` and the admin's `importMap.js`). Never edit them by hand; regenerate after changing collections, globals or blocks.
- The site and the admin have separate root layouts (`app/(app)/layout.tsx`, `app/(payload)/layout.tsx`); unmatched URLs render `app/global-not-found.tsx`.
- Databases are Neon branches: production uses the main branch, every preview deployment gets its own branch (Vercel Marketplace integration), and local development uses the `dev` branch (`DATABASE_URL` in `apps/web/.env.local`). Media go to Vercel Blob on Vercel and to `apps/web/media` locally.
- Schema push is disabled (`push: false`), also locally: every database runs the migrations (`bun run migration:deploy`; deployments run it before the build, see `apps/web/vercel.json`). Create migrations with the `add-migration` skill and commit the `.ts`, `.json` and `index.ts` together.
- Payload's default access is "any logged-in user". Define every operation of every collection and global explicitly with the helpers in `src/payload/access.ts` (`src/payload/access.test.ts` fails otherwise).
- Public pages are static and read Payload through the Local API; collections revalidate the whole site after changes (`src/payload/revalidate.ts`).
- Blog posts (`posts`) have drafts; the site shows published posts once their `publishedAt` has come (`src/lib/posts.ts`, the same rule as their read access). The live preview goes through `/api/draft` (admins only). Rich text renders with `src/components/rich-text.tsx` inside shadcn's Typeset styles; code blocks (Payload's `CodeBlock`, languages in `src/lib/code-languages.ts`) are highlighted on the server with Shiki.
- Keep the slug of a published post (`titleBasedSlug` in `src/payload/helpers.ts` generates it once from the title).

## Analytics

PostHog (EU, the `lukashechenberger` organization) runs cookieless (`cookieless_mode: 'always'`, so there's no consent banner) and is loaded lazily in `src/components/analytics.tsx`, through the `/ingest` proxy in `next.config.ts`. `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is only set for production, so previews and local development don't send events.

## Next.js docs

`apps/web` runs Next.js 16.3, which may differ from training data in APIs, conventions and file structure. Before writing code in `apps/web`, check the version-matched docs at `apps/web/node_modules/next/dist/docs/`.

## Checks

CI runs these; run them before pushing (or use the `pre-pr` skill):

- `bun run check`: knip, Prettier and `tsc --noEmit` via turbo.
- `bun run lint`: ESLint with `--max-warnings 0`.
- `bun run format`: fix Prettier issues.
- `bun run test` in `apps/web`: unit tests (`bun test`).

## Changesets

Add a changeset (`.changeset/<name>.md`) for every change that's visible on the site or may be a source of errors: changed layouts or behavior, schema changes and migrations, changed data fetching or SEO output. Purely internal changes (docs, tooling, refactors without visible effect) don't need one. Only `@ls-age/web` is versioned; name it in the changeset, also for changes in `packages/ui` that affect the site.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
