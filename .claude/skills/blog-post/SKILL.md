---
name: blog-post
description: Plan and draft a blog post for lukashechenberger.com (a problem Lukas solved, usually with Next.js and Payload) and save it as a draft through the savePostDraft MCP tool. Use for anything about writing, outlining or revising blog posts.
---

Posts are short dev write-ups (about 600-900 words) for developers using Next.js and Payload: one concrete problem, why it happens, the fix with a small code excerpt, and what to take away. English, first person, plain and specific. Topics come from Lukas; planned topics aren't kept in this public repo.

## Workflow

1. **Agree on the topic and outline first.** Propose a title, a one-line hook, the target reader and the headings (h2/h3), and wait for Lukas's go before drafting the text.
2. **Get the facts from the source.** Read the commits, diffs and docs the post is about (e.g. `git -C <repo> show <hash>`). Never invent facts, numbers, quotes or benchmarks; if something isn't in the source, ask or leave it out.
3. **Keep code excerpts small and generic.** Show the part that matters, rename project-specific things, and never include secrets, tokens, internal URLs, customer or business data. This repo and the posts are public.
4. **Read the `post-content-format` resource** of the Payload MCP server before writing content. It lists the allowed nodes with an example; content is Lexical JSON, never Markdown or HTML.
5. **Save the draft with `savePostDraft`** on the server Lukas names (`payload-local`, `payload-preview` or `payload-production`; ask if unclear). Pass `title`, `description` (one or two sentences, also the meta description) and `content`; leave `publishedAt` unless asked. Use the `posts` resource to find a post's id for updates and for internal links.
   - If the tool returns problems, fix exactly those and save again. Nothing is saved while problems remain.
   - Code blocks use one of the languages the resource lists.
6. **Report back** with the post's slug and admin path, and the preview path (`/api/draft?slug=…`, needs a logged-in admin on that site).

## Rules

- Only drafts: never publish or schedule a post unless Lukas asks for that post. `savePostDraft` can't publish anyway; publishing happens in the admin panel.
- Keep the slug once a post is published (don't change the title-based slug through other tools).
- Revisions: pass only what changes (e.g. only `content`), on the same post id.
