---
name: publish-component
description: "Release @vived/component-abb-6700 to npm: determine the SemVer bump from Conventional Commits, sync COMPONENT_KNOWLEDGE.md with Vivian, update the changelog, then version-tag and publish from main. Trigger with /publish-component."
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
5. **Vivian auth** (a second, independent auth system — not npm): confirm the `vivian`
   MCP tools are reachable (e.g. call `list_knowledge`). If they are not available,
   call `authenticate`, have the user open the returned URL in a browser, then call
   `complete_authentication`. If the browser shows `redirect_mismatch`, STOP: Vivian's
   Cognito client does not allow the localhost callback port (the MCP client picks a
   dynamic port). That is a server-side config fix the user must resolve before
   releasing — do not proceed.
6. **Tests**: run `npm test`. Abort on any failure; show the failing output.
7. **Build**: run `npm run build`. Abort on any failure; show the failing output.

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

## GATE 2 — Reconcile the component knowledge doc (push DEFERRED to after publish)

> Vivian is an MCP server (`vivian` in `.mcp.json`) backed by an S3 + vector knowledge
> base. There is **no** dedicated "schema" or "submit" endpoint — the template and the
> component doc are ordinary knowledge documents. Real tools: `list_knowledge`,
> `read_knowledge`, `search_knowledge`, `remember_knowledge`, `update_knowledge`,
> `ask_vivian`. Auth is handled in preflight.

1. **Discover and fetch the template** — do not assume the key blindly. Locate the template
   doc via `list_knowledge` (find the entry whose key/title is the smart-component knowledge
   document template) or `search_knowledge("smart component knowledge document template")`,
   then `read_knowledge(<that key>)`. The current key is
   `knowledge/smart-component-knowledge-document-template.md` — use it as a hint, but verify
   the doc you read is actually the template (title contains "template", describes the required
   sections) before relying on it. Do NOT use `ask_vivian` for discovery — it returns
   synthesized prose, not a document key, and can over-escalate. Note any required
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

> **Do not push to Vivian here.** The actual `update_knowledge` call is deferred to
> Step 4, *after* `npm publish` succeeds — so Vivian never advertises a version that is
> not yet on npm. This gate only reconciles and approves the local file; Step 3 commits
> it. The approved content carries forward to Step 4.

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
| Files to publish | contents of `dist/` (per `files` field in package.json) |

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

**5. Push the reconciled knowledge to Vivian — only after the publish above is confirmed live.**
This is last because it is an external, hard-to-reverse side effect: Vivian should describe
the package only once that version is actually on npm.

- **Discover the component doc first** — do not assume the key blindly. Find it via
  `list_knowledge` or `search_knowledge` (convention: `knowledge/<component>-smart-component.md`;
  for this repo the current key is `knowledge/abb-6700-smart-component.md`, used as a
  hint — verify the doc you find is actually this component's knowledge doc).
- **If the doc exists → `update_knowledge(<that key>, <approved content from GATE 2>)`.**
- **If it genuinely does not exist (first-ever publish) → `remember_knowledge(...)` once** to
  create it. Only ever create when discovery confirms there is no existing doc — otherwise
  `remember_knowledge` produces a duplicate.
- Confirm it landed with `read_knowledge` or `search_knowledge` — NOT `ask_vivian` (Bedrock
  re-ingestion lags ~tens of seconds; `ask_vivian` may read a stale index and can over-escalate).

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
