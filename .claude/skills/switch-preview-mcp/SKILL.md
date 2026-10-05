---
name: switch-preview-mcp
description: Point the payload-preview MCP server at another preview deployment (e.g. when starting work on a new branch or PR) by updating PAYLOAD_PREVIEW_MCP_URL in the git-ignored .env.local. Use when the user wants to switch, change or set the preview MCP deployment.
---

`.mcp.json` is generated from `.mcp.template.json`, which reads the preview endpoint from `PAYLOAD_PREVIEW_MCP_URL` (see "MCP servers" in AGENTS.md). This skill edits `.env.local` and regenerates `.mcp.json`; Claude Code only reads `.mcp.json` at startup, so the change has no effect until the user restarts it; make that unmistakable.

1. Determine the deployment URL, in this order: one the user gave; the preview URL of the current branch's PR (`gh pr view <branch> --json comments` or the Vercel MCP `list_deployments`); otherwise ask. Strip any path and use `https://<host>/api/mcp`. Only accept `https://*.vercel.app` hosts of the `lukashechenberger` project.
2. Confirm `.env.local` in the repo root is git-ignored (`git check-ignore .env.local`). If it is not, stop and say so.
3. Set or replace the `PAYLOAD_PREVIEW_MCP_URL=...` line in `.env.local`, keeping all other lines untouched; create the file if missing. Leave `PAYLOAD_PREVIEW_MCP_TOKEN` unset unless the user says the preview needs a different token, as it falls back to the production token.
4. Check whether `VERCEL_PROTECTION_BYPASS` is set in `.env.local` (presence only). If not, tell the user the SSO-protected preview will reject requests until they add it.
5. Never print, log or commit any token or bypass value; refer to them by variable name only.
6. Run `bun run prepare` from the repo root and relay any warning about unset variables (names only).
7. End your reply with a prominent restart notice, as its own paragraph in bold, e.g. "**Restart required: quit and reopen Claude Code (CLI or desktop app). `payload-preview` keeps using the old deployment until you do.**" State clearly that the running session is NOT updated and that MCP config is only read at startup. Do not claim the preview server is switched, and do not call its tools to verify before the restart; offer to verify afterwards.
