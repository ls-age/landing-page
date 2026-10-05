---
name: pre-pr
description: Run the CI checks on the current changes before opening or pushing a PR.
disable-model-invocation: true
---

Run from the repository root, on the changes of the current branch.

1. Run `bun run check`, `bun run lint` and `bun run build`. Fix Prettier issues with `bun run format`.
2. Check whether the change needs a changeset (see "Changesets" in `AGENTS.md`) and add one if it's missing.
3. Report what failed or is missing, grouped by check. Fix mechanical issues (formatting, missing changeset) and ask before anything else.

Do not push or open the PR; that is the user's call.
