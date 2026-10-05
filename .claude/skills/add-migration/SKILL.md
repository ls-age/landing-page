---
name: add-migration
description: Create a Payload database migration for a schema change, with the manual fixes this repo needs.
disable-model-invocation: true
---

Run from `apps/web`.

1. Make sure collections/globals/blocks are changed, then `bun run build:payload`.
2. `bun run migration:create <name>`. This writes `src/migrations/<ts>_<name>.ts` and `.json` and registers it in `src/migrations/index.ts`. When it asks whether a table or column was created or renamed, answer "create" unless you really renamed it (it can't be answered non-interactively; use `expect` if needed).
3. Fix the import in the `.ts` (TS1484 with `verbatimModuleSyntax`):
   `import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-vercel-postgres';`
4. Review the SQL: it must only touch what you changed. The script passes a placeholder Blob token so the Vercel Blob plugin's `media` columns (`_objectkey`, `prefix`) stay in the schema; remove any statement that drops them.
5. Add a changeset in `.changeset/` naming `@ls-age/web` (schema changes need one, unless it only fixes an unreleased change).
6. Run `bun run check:types`.
7. Run `bun run migration:deploy` to apply it to the local database (the Neon `dev` branch; schema push is disabled, so the dev server won't), and check the app with it.

Commit the `.ts`, the `.json` snapshot and `index.ts` together. For data-only changes, hand-write a migration without a snapshot instead.
