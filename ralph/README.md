# Dockerized Ralph loop

A containerized version of the [Ralph technique](https://www.aihero.dev/getting-started-with-ralph):
run the same prompt in a loop, let the agent pick the next task from a spec, commit after each
one. This version drives the [`vived-ralph`](../.github/skills/vived-ralph/SKILL.md)
methodology — one TDD slice per iteration, verified green, committed.

The container is the isolation boundary, so inside it the agent runs autonomously
(`--dangerously-skip-permissions`). Your repo is bind-mounted, so commits land in your **real
local repo** — nothing is pushed; you review locally, exactly as the skill intends.

## How it maps to the article

| Article | This repo |
| --- | --- |
| `ralph-once.sh` (one run, human in loop) | `ralph-once.sh` |
| `afk-ralph.sh <N>` (autonomous for-loop) | `afk-ralph.sh <N> <prd>` |
| `@PRD.md @progress.txt` prompt | `@SKILL.md @<prd>.md @<prd>.test.ts @<prd>.plan.md @<prd>.progress.md` |
| `docker sandbox run claude` | custom `Dockerfile` + `docker-compose.yml` |
| `<promise>COMPLETE</promise>` early-exit | same sigil — your skill already emits it |

## One-time setup

From the **`ralph/`** directory (PowerShell):

```powershell
# 1. Build the image (node 22 + Claude Code CLI + git)
docker compose build

# 2. Log in with your Team account — interactive, ONE time.
#    The login persists in the `claude-auth` Docker volume for all later runs.
docker compose run --rm ralph claude
#    → run /login inside, complete the browser auth, then exit the session.
```

> **Commit identity:** commits are attributed to the name and email read from your local
> `git config` at the time `/vived-init` was run. To change it, create a `.env` file next
> to `docker-compose.yml` with `GIT_AUTHOR_NAME=...` and `GIT_AUTHOR_EMAIL=...`.

> **Dependencies install themselves on first run.** `node_modules` lives on a fast
> Docker volume (not the bind mount — see [Performance](#performance) for why), so the
> first run does a one-time `npm ci` into it (a few minutes).
> To pre-warm it yourself instead: `docker compose run --rm ralph npm ci`.

## Run it

```powershell
# Single slice, watch it work (human in the loop):
docker compose run --rm ralph bash ralph/ralph-once.sh docs/prd/world-navigation.md

# Autonomous: up to 20 slices, exits early on <promise>COMPLETE</promise>:
docker compose run --rm ralph bash ralph/afk-ralph.sh 20 docs/prd/world-navigation.md
```

Point at any PRD under `docs/prd/`:

```powershell
docker compose run --rm ralph bash ralph/afk-ralph.sh 15 docs/prd/panel-hitbox-select.md
```

## Model split (subscription-friendly)

On a Team login you don't pay per token — but every call draws down a usage allowance,
and Opus burns it far faster than Sonnet, which burns it faster than Haiku. So the loop
runs **two tiers**, set via env vars (defaults shown):

| Env var | Default | Role |
| --- | --- | --- |
| `RALPH_MODEL` | `opus` | The loop body ("main") — risk analysis, PRD story test, verification, commits. |
| `RALPH_SUBAGENT_MODEL` | `haiku` | The delegated implementer sub-agent — the mechanical TDD red-green grind. |

Opus on the loop body buys the strongest judgment where it matters most (slice selection,
non-tautological PRD story tests, catching a weak sub-agent diff at the verification gate),
while Haiku keeps the mechanical implementation cheap.

Override per run:

```powershell
# Stretch the allowance on a long/low-risk PRD:
docker compose run --rm -e RALPH_MODEL=sonnet ralph bash ralph/afk-ralph.sh 10 docs/prd/world-navigation.md
```

After logging in, run `/status` (or `/usage`) inside a `docker compose run --rm ralph claude`
session to check your remaining allowance before turning the loop loose for 20 iterations.

## Before you run

- **Check out the right branch first.** The loop commits onto whatever branch is currently
  checked out in your local repo. Make a feature branch for the PRD you're running.
- **The progress file is auto-seeded.** If `plans/<slug>.progress.md` doesn't exist, the loop
  creates it from the skill's template. It lives in git-ignored `plans/` and is never committed.
- **A plan helps but isn't required.** If `plans/<slug>.plan.md` exists (from `vived-architect`),
  the loop feeds it in and prefers it.

## What each iteration does

A fresh `claude -p` process per slice (fresh context every time — the Ralph benefit). Each one:
reads the SKILL.md + PRD + test + plan + progress → picks the single highest-risk unfinished
`it.todo` slice → drives it red→green through co-located unit tests → converts the PRD story
test → verifies the **tiered gate** — `npm run lint` + `npx tsc --noEmit` + `npx vitest run
--changed HEAD` (affected unit tests) + `npx vitest run docs/prd` (all PRD tests) all green →
commits one slice → updates the progress file. The full `npm run test` suite does **not** run
per slice; it runs once at the end of the loop. Continuity between iterations lives in git
history, the progress file, and the `it.todo`→`it()` state in the test file.

## Files

| File | Purpose |
| --- | --- |
| `Dockerfile` | node:22 + Claude Code CLI + git; runs as non-root `node`. |
| `docker-compose.yml` | Bind-mounts the repo + a persisted auth volume; sets commit identity. |
| `entrypoint.sh` | Marks the bind-mounted repo as git-safe, then runs the command. |
| `afk-ralph.sh` | The autonomous for-loop. Streams output, early-exits on COMPLETE. |
| `ralph-once.sh` | A single human-in-the-loop iteration. |
| `_ralph-lib.sh` | Shared: resolves PRD paths, seeds progress, builds the prompt, bootstraps deps. |

## Performance

**Docker Desktop on Windows has slow bind-mount file I/O.** Reading/transforming many
files (which `vitest` does constantly during `collect`/`transform`) over a mount of a
`C:\` path is dramatically slower than native. Three mitigations, in order of impact:

1. **Tiered test gate (already configured).** The vived-ralph gate is scoped per slice:
   only the **affected** unit tests (`vitest run --changed HEAD`) and **all PRD tests**
   (`vitest run docs/prd`). PRD tests each boot the entire production domain via
   `makeDomainForTesting()`, catching cross-feature regressions cheaply. The full
   `npm run test` runs **once** at the end of the loop. This is automatic — nothing to do.
2. **`node_modules` on a Docker volume (already configured).** Module resolution no longer
   crosses the bind mount. Your source still does, but that's a far smaller set.
3. **Move the repo into the WSL2 filesystem (biggest win for source I/O).** Bind mounts from
   WSL2's native ext4 run at near-native speed. If the loop is still slow after #1 and #2,
   clone/work on the repo inside your WSL2 distro and run Docker from there.

## Troubleshooting

- **"Invalid API key" / auth errors every iteration** → the login didn't persist. Re-run the
  one-time `docker compose run --rm ralph claude` step and complete `/login`.
- **Loop stops after 3 iterations with "no usable output"** → almost always auth. See above.
- **git "dubious ownership"** → handled by `entrypoint.sh`; if you bypass it, run
  `git config --global --add safe.directory /workspace` inside the container.
- **Nothing committed but tests pass** → the agent reverted a slice it couldn't finish to green
  (a valid vived-ralph end state). Check the progress file for the recorded blocker.
- **Each iteration takes forever (minutes per test run)** → bind-mount I/O. See
  [Performance](#performance). `node_modules` is already on a volume; if it's still slow,
  move the repo into WSL2.
