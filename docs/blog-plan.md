# Blog plan

Rebuild ls-age.com as a Next.js 16 + Payload 3.90 app (bun, Turborepo, Tailwind 4, shadcn) on Vercel and add a blog. Decided 2026-10-05.

## Decisions

- Fresh app on a new branch cut from `master`; don't revive the old `nextjs` branch. Tag the last Sapper commit `sapper-final`, then remove Sapper, CircleCI and the FTP deploy.
- Payload over MDX, so posts can be drafted through MCP and the blog can use the shared Payload packages planned with boraan and QRcard.
- Database: a new Neon project. Development uses a Neon `dev` branch (no local Postgres), previews get a branch each via the Vercel integration. `push: false` everywhere; run `payload migrate` against dev too.
- AdSense: removed. Don't carry the `adsbygoogle.js` script from `src/template.html` over.
- Search Console: no need to preserve old URLs beyond `/open-source/...`; the old site had little SEO value.
- Author: Lukas Hechenberger, linked to https://github.com/LukasHechenberger (Person JSON-LD `sameAs`).
- English only, no next-intl.
- Branding: the site is "Lukas Hechenberger" (name in the header and titles, "LH" monogram icon in the theme's primary color); the `{ls-age;}` logo is dropped.
- Contact email stays hello@ls-age.com for now.
- Domain: the new site lives at **lukashechenberger.com** (already on Vercel Domains). Lukas sets up the ls-age.com → lukashechenberger.com redirect at ls-age.com's domain provider himself; ls-age.github.io gets archived or redirects too.

## Architecture

- Collections: `users`, `media` (Vercel Blob, client uploads), `posts` (title, `slugField()`, description, featured image, `publishedAt`, rich text, SEO meta, drafts; public read = published and `publishedAt <= now`). No tags in v1.
- Lexical: Payload's Code block rendered server-side with Shiki (light/dark themes), uploads, internal links to posts, h2–h4.
- Copy (small, to be replaced by shared packages later):
  - boraan: `apps/web/src/payload/blocks/converters/jsx.tsx` (internal links), `revalidate.ts`, `access.ts` + `access.test.ts`, `mcp.ts` + `mcp.test.ts`, `app/(app)/sitemap.ts`, `llms.txt/route.ts`, `components/content/seo.tsx`, `experimental.inlineCss`.
  - QRcard: `apps/web/src/components/payload/rich-text.tsx` (anchored headings), `lib/source.ts` (TOC), `components/seo/json-ld.tsx`, `lib/og-image.tsx`.
- Routes: `/`, `/open-source`, `/open-source/[owner]/[repo]` (GitHub API, ISR 1 day instead of the nightly rebuild), `/blog`, `/blog/[slug]`, `/blog/feed.xml`, OG images, sitemap, robots, `llms.txt`.

## Steps (one PR each)

1. Scaffold: bun, Turborepo, Next 16.3, Tailwind 4, `@workspace/ui`, ESLint, toolsync, Changesets, agent tooling (see below); port the About page.
2. Open Source pages (ls-age org and LukasHechenberger repos, daily ISR, old `/open-source/...` URLs kept).
3. Vercel project (when the branch is pushed), lukashechenberger.com, Payload base: Neon via the Vercel Marketplace (Frankfurt, preview branches) plus a `dev` branch, public Blob store, users, media, access helpers + test, first migration; add the `add-migration` skill.
4. Posts: collection, Shiki renderer, live preview, blog pages, revalidation.
5. SEO and analytics: metadata, OG images, JSON-LD, sitemap, RSS, `llms.txt`; PostHog (lazy-loaded, `/ingest` proxy, as in QRcard).
6. MCP plugin with the `awaitResponseBody` wrapper; add the `payload-*` MCP servers and the `blog-post` skill.
7. First post.

## Agent tooling

Set up like boraan, alongside the other tools in each step. `AGENTS.md` (with `CLAUDE.md` as `@AGENTS.md`) documents the stack, checks, migrations and the MCP servers table.

### Claude Code plugins

Committed in `.claude/settings.json` (step 1), so anyone who trusts the repo is asked to install them. Each brings its vendor's own skills and MCP server, so those aren't added separately:

```json
{
  "extraKnownMarketplaces": {
    "claude-plugins-official": {
      "source": { "source": "github", "repo": "anthropics/claude-plugins-official" }
    },
    "neon": { "source": { "source": "github", "repo": "neondatabase/agent-skills" } }
  },
  "enabledPlugins": {
    "vercel@claude-plugins-official": true,
    "posthog@claude-plugins-official": true,
    "neon-postgres@neon": true
  }
}
```

- `vercel`: deployments, env vars, Next.js / React / shadcn / caching skills, Vercel MCP.
- `posthog`: analytics, errors and flags skills, PostHog MCP. Implies PostHog analytics on the site (step 5), loaded lazily like QRcard's.
- `neon-postgres`: Neon skills (incl. branching) and the Neon MCP, for the dev and preview branches.

### MCP servers

`.mcp.template.json` is committed; the toolsync plugin (copied from boraan's `packages/toolsync-plugin`, including `mcp-config.ts`) generates the git-ignored `.mcp.json` on `bun install`, expanding `${VAR}` / `${VAR:-default}` from `.env.local`. Never put tokens in the template.

| Server               | URL                                                            | Added in | Why                                                                                    |
| -------------------- | -------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `next-devtools`      | `bunx next-devtools-mcp@latest` (stdio)                        | step 1   | Errors, routes and docs of the running Next 16 dev server. Also in `.vscode/mcp.json`. |
| `payload-local`      | `http://localhost:3000/api/mcp`                                | step 6   | Draft and check posts locally. `PAYLOAD_LOCAL_MCP_TOKEN`                               |
| `payload-production` | `https://lukashechenberger.com/api/mcp`                        | step 6   | Draft posts from Claude. `PAYLOAD_PRODUCTION_MCP_TOKEN`                                |
| `payload-preview`    | `${PAYLOAD_PREVIEW_MCP_URL:-…}` + `x-vercel-protection-bypass` | step 6   | Preview deployments; port boraan's `switch-preview-mcp` skill with it.                 |
| `Spronta`            | `https://app.spronta.com/mcp`                                  | step 5   | SEO/GEO audits of the live site.                                                       |

Vercel, PostHog and Neon come with the plugins above; GitHub via `gh`. Spronta's Claude plugin (`crawlie@spronta`) is skipped: it bundles the local `crawlie-mcp` (no saved reports, projects or scheduled crawls) and would duplicate the hosted server's tool names.

### Skills

Only official skills (published by the maker of the technology, see skills.sh "Official"), and only where no plugin above covers the topic. Installed with the `skills` CLI (`bunx skills add <owner/repo@skill>`), which writes them to `.agents/skills` / `.claude/skills` and tracks them in `skills-lock.json` (commit all of it), as in boraan:

| Skill                   | Source                     | Why                                 |
| ----------------------- | -------------------------- | ----------------------------------- |
| `find-skills`           | `vercel-labs/skills`       | Find more skills later.             |
| `shadcn`                | `shadcn/ui`                | `@workspace/ui` components.         |
| `turborepo`             | `vercel/turborepo`         | Monorepo tasks and caching.         |
| `web-design-guidelines` | `vercel-labs/agent-skills` | UI review for the redesigned pages. |

The registry has no Payload skill (checked 2026-10-05), so Payload knowledge comes from our own skills, copied and adapted from boraan's `.claude/skills`:

- `pre-pr` (checks before pushing), step 1.
- `add-migration` (generate, fix the type-only import, check the diff), step 3.
- `switch-preview-mcp`, step 6.
- New `blog-post`: outline, draft through the `payload-*` MCP tools, code snippets, SEO meta, never publish without being asked. Step 6/7.

Also copy boraan's `.claude/hooks` (`block-generated.sh`, `format-on-edit.sh`) and `.claude/settings.json` in step 1, and the `access-control-reviewer` agent in step 3. These are candidates for the shared Claude Code plugin planned for boraan and QRcard.

## Deferred: LinkedIn sharing

Remind Lukas about this once the blog is live. Possible with the self-serve "Share on LinkedIn" product (`w_member_social`, free, no review), but access tokens expire after 60 days and refresh tokens are partner-only, so it needs a reconnect every ~2 months. Approach: "Connect LinkedIn" in the admin, a Payload job that shares on publish (like boraan's social-post publishing), stored post ID for idempotency.

## Deferred: email at lukashechenberger.com

Probably set up Resend to receive (and send) email at lukashechenberger.com, then switch the contact address in `apps/web/src/lib/site.ts`. The domain is already on Vercel (bought through Vercel Domains), so the DNS records go there.

## First posts (from boraan)

1. Payload MCP edits never show up: the MCP endpoint streams its response before the tool runs, so Next.js drops `revalidatePath` (fix: `awaitResponseBody`, boraan d6b4e8334). Publish first.
2. Passing `req` to `findByID` with `locale: 'all'` in a hook switched the save's locale and dropped edits (boraan 3879b38f5).
3. Live preview's `RefreshRouteOnSave` reload loop on 404 pages (boraan 5de98ac7f).
