#!/usr/bin/env bash
# Autonomous Ralph loop. Runs INSIDE the container.
#
#   bash ralph/afk-ralph.sh [iterations] <prd-file>
#
# Each iteration spawns a fresh `claude -p` process that does exactly one slice
# of the vived-ralph methodology against the PRD, then commits. The loop exits
# early when the agent prints <promise>COMPLETE</promise>.
set -uo pipefail

ITER="${1:-20}"

if [[ -z "${2:-}" ]]; then
  echo "Error: PRD path required." >&2
  echo "Usage: bash ralph/afk-ralph.sh [iterations] <prd-file>" >&2
  echo "Example: bash ralph/afk-ralph.sh 20 docs/prd/world-navigation.md" >&2
  exit 1
fi
PRD="$2"

# Loop-body model (the "main" role). Sub-agent model is RALPH_SUBAGENT_MODEL (see _ralph-lib.sh).
MODEL="${RALPH_MODEL:-opus}"

cd "$(dirname "$0")/.." || exit 1
# shellcheck source=_ralph-lib.sh
source "ralph/_ralph-lib.sh"

ralph_ensure_deps
ralph_build_prompt "$PRD" || exit 1

echo "Ralph loop: $SLUG — up to $ITER iterations"
echo "  PRD:       $PRD"
echo "  Test:      $TEST"
echo "  Plan:      $([[ -f $PLAN ]] && echo "$PLAN" || echo '(none)')"
echo "  Progress:  $PROGRESS"
echo "  Model:     $MODEL (sub-agent: ${RALPH_SUBAGENT_MODEL:-haiku})"
echo

fails=0
for ((i=1; i<=ITER; i++)); do
  echo "════════════════════ iteration $i/$ITER ════════════════════"
  logf="$(mktemp)"

  # --dangerously-skip-permissions: the container is the isolation boundary, so
  # we let the agent run lint/test/git without prompting. -p: print mode (one
  # shot, non-interactive). Stream live to the terminal AND capture to grep.
  claude --dangerously-skip-permissions --model "$MODEL" -p "$PROMPT" 2>&1 | tee "$logf"
  rc=${PIPESTATUS[0]}

  if grep -q "<promise>COMPLETE</promise>" "$logf"; then
    rm -f "$logf"
    echo
    echo "✅ PRD complete after $i iteration(s)."
    ralph_final_sweep
    exit 0
  fi

  if [[ $rc -ne 0 ]] || [[ ! -s "$logf" ]]; then
    fails=$((fails + 1))
    echo "⚠️  iteration $i produced no usable output (claude rc=$rc, consecutive fails=$fails)"
    if [[ $fails -ge 3 ]]; then
      rm -f "$logf"
      echo "❌ 3 consecutive failed iterations — stopping. Check auth (run: claude) and the prompt."
      exit 1
    fi
  else
    fails=0
  fi
  rm -f "$logf"
done

echo
echo "Reached $ITER iterations without <promise>COMPLETE</promise>. Re-run to continue."
ralph_final_sweep
