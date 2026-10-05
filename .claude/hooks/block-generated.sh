#!/usr/bin/env bash
# PreToolUse: refuse hand edits to generated files, migration snapshots and the lockfile.
f=$(jq -r '.tool_input.file_path // empty')
case "$f" in
  */src/__generated__/*|*/admin/importMap.js|*/src/migrations/*.json|*/bun.lock)
    echo "Blocked: $f is generated. Regenerate it (build:payload, migration:create, bun install) instead of editing it." >&2
    exit 2 ;;
esac
exit 0
