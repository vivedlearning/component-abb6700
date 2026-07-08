## Agent skills

### Issue tracker

Issues live in GitHub Issues (vivedlearning/component-abb6700). See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### PRD spec tests

Every PRD in `docs/prd/` has a co-located `.test.ts` that proves its user stories are implemented. Stories start as `it.todo()` stubs; the PRD is done when all pass. See `docs/agents/prd-spec-tests.md`.

### vived-prd skill

Write a new PRD and co-located test stub file locally. Explores the codebase, scans existing PRDs for conflicts, and shows a draft for approval before writing any files. See `.vscode/skills/vived-prd/SKILL.md`.
