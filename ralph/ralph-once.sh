#!/usr/bin/env bash
# Human-in-the-loop: a SINGLE Ralph iteration. Runs INSIDE the container.
#
#   bash ralph/ralph-once.sh <prd-file>
#
# Use this while you're getting comfortable — watch it do one slice, inspect the
# commit, then run it again. Graduate to afk-ralph.sh once you trust it.
set -uo pipefail

if [[ -z "${1:-}" ]]; then
  echo "Error: PRD path required." >&2
  echo "Usage: bash ralph/ralph-once.sh <prd-file>" >&2
  echo "Example: bash ralph/ralph-once.sh docs/prd/world-navigation.md" >&2
  exit 1
fi
PRD="$1"
MODEL="${RALPH_MODEL:-opus}"

cd "$(dirname "$0")/.." || exit 1
# shellcheck source=_ralph-lib.sh
source "ralph/_ralph-lib.sh"

ralph_ensure_deps
ralph_build_prompt "$PRD" || exit 1

echo "Ralph (single slice): $SLUG — model $MODEL (sub-agent: ${RALPH_SUBAGENT_MODEL:-haiku})"
echo

# --permission-mode acceptEdits auto-accepts file edits but still surfaces other
# actions, so you stay in the loop. Run this container session with a TTY.
claude --permission-mode acceptEdits --model "$MODEL" "$PROMPT"
