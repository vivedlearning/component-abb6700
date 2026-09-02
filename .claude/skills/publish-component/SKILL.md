---
name: publish-component
description: "Release @vived/component-abb-6700 to npm: determine the SemVer bump from Conventional Commits, reconcile COMPONENT_KNOWLEDGE.md against the Vivian canon template (the vivedlearning/vivian-knowledge repo, read with gh), update the changelog, version-tag and publish from main, then file a canon-capture issue. Trigger with /publish-component."
argument-hint: "[major|minor|patch]  (optional override; otherwise inferred)"
---

# publish-component

Release `@vived/component-abb-6700` to npm. Encodes the full release ritual in
a consistent, safe order so nothing lands out of sequence.

---

## Preflight — fail fast before touching anything

Run all of these checks upfront. Abort with a clear message on any failure.

1. **Branch**: `git branch --show-current` must be `main`. If not → stop. Tell the
   user to merge their feature branch to main and re-run.
2. **Clean tree**: `git status --porcelain` must be empty. If not → stop. List the
   dirty files and ask the user to commit or stash.
3. **Synced with origin**: `git fetch origin && git rev-list HEAD..origin/main --count`
   must be 0. If not → stop. Tell the user to `git pull` first.
4. **npm auth**: run `npm whoami`. If it fails or returns nothing → stop. Tell the
   user to run `! npm login` (which opens a browser), then re-invoke this skill.
5. **Vivian reachable**: Vivian is the **`vivedlearning/vivian-knowledge` GitHub repo** —
   an OKF-style wiki of markdown pages. No RAG, no service, **no MCP server**: you read
   the files directly with `gh`, using the org access you already have. Confirm with:
   ```bash
   gh api -H "Accept: application/vnd.github.raw" repos/vivedlearning/vivian-knowledge/contents/index.md
   ```
   (No leading slash on the path — Git Bash on Windows rewrites `/repos/...` into a
   filesystem path.) If that fails, it is an ordinary `gh auth` problem: have the user
   run `gh auth login` / `gh auth refresh` and re-invoke. There is no separate Vivian
   login. Do **not** look for a `vivian` MCP server; if one is configured in `.mcp.json`
   it is not the canon source and must not be used here.
6. **Tests**: run `npm test`. Abort on any failure; show the failing output.
7. **Build**: run `npm run build`. Abort on any failure; show the failing output.
8. **Packaging convention** (standard for every VIVED smart component): `package.json`
   must have `"license": "UNLICENSED"` and a `files` allowlist that includes `dist`,
   `COMPONENT_KNOWLEDGE.md`, and `CHANGELOG.md`; a `LICENSE` file must exist at the
   repo root. This ships the **version-accurate** knowledge + changelog docs alongside
   the code (so a consumer pinned to an old version reads docs that match it, not
   Vivian's always-latest copy) and marks the package proprietary. If any piece is
   missing, add it before releasing. Verify with `npm pack --dry-run`: the tarball must
   contain only `dist/`, `README.md`, `LICENSE`, `COMPONENT_KNOWLEDGE.md`,
   `CHANGELOG.md`, and `package.json` — nothing contributor-facing (`docs/`, `ralph/`,
   `.github/`, `src/`). See the Vivian page
   `recipes/smart-component-packaging.md` (its `## Conformance` section is the
   assertion set).

---

## GATE 1 — Propose version + changelog

### Determine the bump type

If the user passed an explicit argument (`major`, `minor`, or `patch`), use it.

Otherwise, analyze Conventional Commits since the last release:

- **Baseline**: If `git describe --tags --abbrev=0 2>/dev/null` returns a tag, diff
  from that tag. Otherwise (first release), read the top version from `CHANGELOG.md`
  (e.g. `## [1.4.0]`) and diff from the commit that last touched `CHANGELOG.md`.
- Map prefixes: `BREAKING CHANGE:` (in footer) → **major**; `feat:` → **minor**; `fix:`,
  `perf:`, `refactor:`, `docs:`, `chore:` → **patch**. The highest level wins.
- Compute new version by bumping the current `version` in `package.json`.

### Draft the CHANGELOG entry

Format: Keep-a-Changelog (`## [x.y.z] - YYYY-MM-DD`), grouped under `### Added`,
`### Changed`, `### Fixed`, `### Removed`. Derive the groups from commit prefixes
(`feat:` → Added, `fix:` → Fixed, breaking changes → a "BREAKING CHANGES" note at top).

### Present to the user

Show:
- Current version → proposed new version
- Bump type and why (list the commits that drove it)
- Draft CHANGELOG section

**Wait for approval.** The user may override the bump type or edit the changelog text.
Do not proceed until they confirm.

---

## GATE 2 — Reconcile the component knowledge doc (canon capture DEFERRED to after publish)

> Vivian is the **`vivedlearning/vivian-knowledge` repo** — plain markdown pages read with
> `gh`. There is no service, no vector store, and no MCP server. Pages are addressed by
> path, and `index.md` is the retrieval mechanism: every page is one line with a
> description. The relevant paths for this skill are `components/_template.md` (the
> smart-component doc template), `components/abb-6700.md` (this component's canon page),
> and `recipes/smart-component-packaging.md`. There is **no `knowledge/` directory.**

1. **Fetch the index, then the template.** Read `index.md` first and match on the
   descriptions rather than guessing a path:
   ```bash
   gh api -H "Accept: application/vnd.github.raw" repos/vivedlearning/vivian-knowledge/contents/index.md
   gh api -H "Accept: application/vnd.github.raw" repos/vivedlearning/vivian-knowledge/contents/components/_template.md
   ```
   Verify the page you read really is the template (it describes required sections rather
   than documenting a specific component) before relying on it. Note any required
   sections or fields.

2. **Reconcile local `COMPONENT_KNOWLEDGE.md`** against:
   - the template (add any missing sections/fields).
   - the actual current public API — `src/index.ts` exports, `src/ABB6700Facade.ts`,
     controllers, events, VM. Update any stale descriptions or missing entries. If the
     facade has changed, it is the **primary host-facing surface**; controllers are the
     internal mechanism it delegates to.
   - the new version number (the file header is currently stamped 1.4.0 — update it).

3. **Show the diff** to the user.
   **Wait for approval.** The user may request further edits.

> **Do not touch canon here.** Filing the capture issue is deferred to Step 4, *after*
> `npm publish` succeeds — so Vivian never advertises a version that is not yet on npm.
> This gate only reconciles and approves the local file; Step 3 commits it. The approved
> content carries forward to Step 4.

---

## Step 3 — Land the docs (commit before the bump)

After both gates are approved and Vivian has been updated, commit the changed files
**as a regular work commit** (not the version bump commit):

```
git add CHANGELOG.md COMPONENT_KNOWLEDGE.md
git commit -m "docs: changelog + component knowledge for v<new-version>"
```

This commit must precede `npm version` so the git tag points to a commit that already
contains its own changelog entry.

---

## GATE 3 — Final go/no-go

Present a release summary before any irreversible action:

| Field | Value |
|-------|-------|
| Package | `@vived/component-abb-6700` |
| Version | current → new |
| Tag | `v<new-version>` |
| Branch | `main` |
| npm dist-tag | `latest` |
| Files to publish | `dist/`, `README.md`, `LICENSE`, `COMPONENT_KNOWLEDGE.md`, `CHANGELOG.md` (per `files` allowlist) |

**Wait for explicit confirmation.** After this point the tag and publish are live.

---

## Step 4 — Release

Run each step in sequence. Surface output on failure; never silently retry.

```bash
# 1. Bump package.json, create release commit, create tag
npm version <type>   # e.g. npm version minor

# 2. Push the release commit AND the tag to origin
git push --follow-tags

# 3. Publish to npm (prepublishOnly auto-runs the build)
#    A browser opens for web auth — wait for it to complete.
npm publish

# 4. Verify the publish landed
npm view @vived/component-abb-6700 version
```

> **Release mechanics — known gotchas:**
> - **Version already ahead of the last tag.** If `package.json`'s version was bumped in
>   a prior PR but never published (it's *ahead* of the latest git tag / npm version), do
>   NOT run `npm version <type>` — it overshoots, or errors on same-version. Publish the
>   current version directly: `git tag v<version>` on the docs commit, push it, then
>   `npm publish`.
> - **Lightweight tags don't push with `--follow-tags`.** That flag only pushes
>   *annotated* tags. A `git tag v<x>` is lightweight — push it explicitly with
>   `git push origin v<version>`.
> - **npm 2FA / OTP timing.** The `prepublishOnly` build runs before npm prompts for the
>   OTP, which often expires the ~30s code, and relaying a code through an assistant is
>   unreliable. Best: the user runs `npm publish` in their own terminal and enters a
>   fresh OTP when prompted. Alternative: pre-build (`npm run build`), then
>   `npm publish --ignore-scripts --otp=<fresh code>` so the code is used immediately.

**5. File a canon-capture issue on vivian-knowledge — only after the publish above is confirmed live.**
This is last because canon should describe the package only once that version is actually on npm.

> **Never author a canon page or open a PR against `vivian-knowledge` from this repo.**
> That is the single hard rule of the contribution model: a consuming repo *files a
> capture*, and a downstream `/vivian-integrate` run turns captures into corpus-aware
> PRs. Writing the page here bypasses the integrator and the corpus-coherence review.

- **Confirm the canon page's path** by matching `index.md` (convention:
  `components/<component>.md`; for this repo it is `components/abb-6700.md`).
- **File the capture** with the GATE 2 content as the payload:
  ```bash
  gh issue create --repo vivedlearning/vivian-knowledge \
    --title "[canon] abb-6700: update component page for v<new-version>" \
    --label knowledge \
    --body "<body>"
  ```
  The body must carry a **mandatory `## Knowledge` section** (a capture without one is
  labelled `needs-payload` and never integrated), plus `## Provenance`, `## Why canon`,
  and an optional `## Suggested placement`. For a released component page the payload is
  the approved `COMPONENT_KNOWLEDGE.md` content, and `## Suggested placement` names the
  existing page so the integrator replaces rather than duplicates. The full contract is
  `.claude/skills/vivian-integrate/ISSUE-FORMAT.md` in the vivian-knowledge repo.
- **Report the issue URL to the user** and note that canon stays stale until
  `/vivian-integrate` lands the page — the npm release does not wait on it.

If `npm publish` fails **after** the tag has been pushed: explain recovery to the user —
the tag is already on the right commit, so they should NOT bump again; just re-run
`npm publish` once the auth issue is resolved.

---

## Recovery reference (include in failure messages)

| Situation | Recovery |
|-----------|----------|
| Tag pushed, publish failed | Fix auth / network, then run `npm publish` again (do NOT re-bump) |
| Tag NOT pushed yet | Run `git push --follow-tags` then `npm publish` |
| Version bumped locally, nothing pushed | Run `git push --follow-tags && npm publish` |
| Need to roll back an unpushed bump | `git tag -d v<ver>` then `git reset HEAD~1` |
