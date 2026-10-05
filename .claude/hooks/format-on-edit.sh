#!/usr/bin/env bash
# PostToolUse: run Prettier on the edited file (skips migrations and generated files).
f=$(jq -r '.tool_input.file_path // empty')
[ -z "$f" ] && exit 0
case "$f" in
  */src/migrations/*|*/__generated__/*|*/importMap.js) exit 0 ;;
esac
cd "$CLAUDE_PROJECT_DIR" && bunx prettier --write --ignore-unknown "$f" >/dev/null 2>&1
exit 0
