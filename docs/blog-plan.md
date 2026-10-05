# Site plan

Rebuild of ls-age.com as lukashechenberger.com: a Next.js 16 + Payload 3.90 app (Bun, Turborepo, Tailwind 4, shadcn/ui) on Vercel, with a blog. Decided 2026-10-05.

## Decisions

- Fresh app instead of the old Sapper site (tagged `sapper-final`); CircleCI, the FTP deploy and AdSense are gone.
- Payload over MDX, so posts can be drafted through MCP.
- Database: Neon via the Vercel Marketplace. Production uses the main branch, each preview deployment gets its own branch, local development uses a `dev` branch. Migrations only (`push: false`), also locally.
- Search Console: no need to preserve old URLs beyond `/open-source/...`; the old site had little SEO value.
- Author: Lukas Hechenberger, linked to https://github.com/LukasHechenberger.
- English only.
- Branding: the site is "Lukas Hechenberger" (name in the header and titles, "LH" monogram icon in the theme's primary color).
- Contact email stays hello@ls-age.com for now.
- Domain: lukashechenberger.com (on Vercel Domains). ls-age.com redirects there (set up at its domain provider); ls-age.github.io gets archived or redirects too.
- Analytics: PostHog, cookieless, production only.

## Steps

1. Scaffold, About page and agent tooling. Done.
2. Open Source pages (repositories of both GitHub accounts, daily ISR, old URLs kept). Done.
3. Vercel project, Neon, Blob, Payload base (users, media, access helpers and test). Done.
4. Blog: posts with drafts and scheduling, Shiki code blocks, live preview. Done.
5. SEO and analytics: metadata, OG images, JSON-LD, sitemap, robots, RSS, `llms.txt`, PostHog. Done.
6. Drafting posts through MCP (`savePostDraft`, `blog-post` skill). Done.
7. First post, then go live.

The agent setup (plugins, MCP servers, skills, hooks) is documented in `AGENTS.md`.

## Deferred: LinkedIn sharing

Remind Lukas about this once the blog is live. Possible with the self-serve "Share on LinkedIn" product (`w_member_social`, free, no review), but access tokens expire after 60 days and refresh tokens are partner-only, so it needs a reconnect every ~2 months. Approach: "Connect LinkedIn" in the admin, a Payload job that shares on publish, stored post ID for idempotency.

## Deferred: email at lukashechenberger.com

Probably set up Resend to receive (and send) email at lukashechenberger.com, then switch the contact address in `apps/web/src/lib/site.ts`. The domain is already on Vercel (bought through Vercel Domains), so the DNS records go there.
