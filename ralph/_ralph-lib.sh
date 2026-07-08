#!/usr/bin/env bash
# Shared helpers for the Ralph loop scripts. Sourced, not executed.

# Ensure the node_modules volume is populated. It's a Linux-native Docker
# volume (see docker-compose.yml) that starts empty, so on the first run we
# install into it once. This keeps dependency I/O off the slow Windows bind
# mount — the difference between a ~1s and a ~7min test file.
ralph_ensure_deps() {
  if [ -d node_modules/vitest ]; then
    return 0
  fi
  echo "node_modules volume is empty — installing dependencies into it (one-time, a few minutes)…"
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
  # Verify the install actually populated the volume — do NOT march into the
  # loop without deps (every gate would fail). A common cause is the volume
  # being root-owned; the entrypoint chowns it, so rebuild the image if so.
  if [ ! -d node_modules/vitest ]; then
    echo "ERROR: dependency install failed — node_modules is not populated. Aborting." >&2
    echo "If you saw EACCES above, rebuild the image (docker compose build) so the" >&2
    echo "entrypoint can chown the node_modules volume, then retry." >&2
    exit 1
  fi
  echo "Dependencies installed."
}

# Resolve all the paths a PRD implies, and build the @-mention list + the
# container-specific override prompt. Sets globals: SLUG TEST PLAN PROGRESS
# MENTIONS PROMPT.
ralph_build_prompt() {
  local prd="$1"
  if [[ ! -f "$prd" ]]; then
    echo "PRD not found: $prd" >&2
    return 1
  fi

  local dir
  dir="$(dirname "$prd")"
  SLUG="$(basename "$prd" .md)"
  TEST="$dir/$SLUG.test.ts"
  PLAN="plans/$SLUG.plan.md"
  PROGRESS="plans/$SLUG.progress.md"

  # The progress file is a disposable, git-ignored working file. Seed it from
  # the skill's template on the first iteration if it doesn't exist yet.
  mkdir -p plans
  if [[ ! -f "$PROGRESS" ]]; then
    if [[ -f .github/skills/vived-ralph/assets/progress.template.md ]]; then
      cp .github/skills/vived-ralph/assets/progress.template.md "$PROGRESS"
    else
      printf '# Progress — %s\n\n## Iterations\n' "$SLUG" > "$PROGRESS"
    fi
  fi

  # Inline the skill + spec + state via @-mentions. (We feed SKILL.md directly
  # for robustness in headless/container runs where skill discovery may not fire.)
  MENTIONS="@.github/skills/vived-ralph/SKILL.md @$prd @$PROGRESS"
  [[ -f "$TEST" ]] && MENTIONS="$MENTIONS @$TEST"
  [[ -f "$PLAN" ]] && MENTIONS="$MENTIONS @$PLAN"

  # Sub-agent model for delegated feature slices (Path B). Team-account auth, so
  # use a bare Anthropic alias — NOT the skill's default "(Copilot)" string.
  local subagent_model="${RALPH_SUBAGENT_MODEL:-haiku}"

  local overrides
  overrides="$(cat <<EOF
You are ONE iteration of an autonomous Ralph loop running headless inside a Docker container.
Follow the vived-ralph methodology in the attached SKILL.md exactly, with these container overrides:

1. Do EXACTLY ONE slice this iteration, then STOP. Do NOT continue to the next slice — an
   outer shell loop re-invokes you with fresh context for the next slice. (This overrides the
   skill's "loop automatically after each committed slice" instruction.)
2. You are fully autonomous and headless. NEVER pause for user confirmation or approval.
3. Verify every gate yourself before committing — the SKILL's tiered Step 4 gate, observed
   green: \`npm run lint\`, \`npx tsc --noEmit\`, \`npx vitest run --changed HEAD\` (affected unit
   tests), and \`npx vitest run docs/prd\` (all PRD tests). Do NOT run the full \`npm run test\`
   suite per slice — it is replaced by the affected + PRD runs. Unknown (timeout/hang/crash)
   counts as red.
4. Commit exactly one green slice with a conventional message referencing the story. Do NOT push.
   Update the progress file (it lives in git-ignored plans/ and is never staged).
5. For any delegated feature slice (Path B), spawn the implementer sub-agent on model
   "${subagent_model}". Do NOT use a "(Copilot)" model string — it will not resolve under this
   container's Team-account auth.
6. Only two valid end states: green+committed, or reverted+green. Never leave the tree red.
7. Do NOT run an end-of-run full \`npm run test\` sweep yourself — this outer afk loop runs it
   once after you exit. Skip the SKILL's "final regression sweep before COMPLETE" step.
8. If — after this slice, or because none remain — every it.todo in the PRD test file is
   resolved (passing or justified it.skip), output this literal sigil on its own line:
   <promise>COMPLETE</promise>
EOF
)"

  PROMPT="$MENTIONS

$overrides"
}

# End-of-run full-suite sweep. The per-slice gate scopes tests for speed (affected
# tests + all PRD tests), so the full suite never runs inside the loop. We run it
# ONCE here, after the loop ends, as belt-and-suspenders before the human reviews.
# This is informational only — it does NOT revert any commit. A red sweep means a
# regression slipped past the scoped per-slice gates and the human should look
# before trusting the run's commits.
ralph_final_sweep() {
  echo
  echo "════════════════════ end-of-run full suite ════════════════════"
  echo "Running the full 'npm run test' suite once (per-slice gates were scoped)…"
  if npm run test; then
    echo "✅ full suite green — every committed slice passes the whole repo."
  else
    echo "❌ full suite has failures — a regression slipped past the per-slice"
    echo "   gates. Review the commits from this run before trusting them."
  fi
}
