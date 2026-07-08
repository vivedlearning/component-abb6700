# Product Requirements Documents (PRDs)

This folder holds the **PRDs** for this project — one per feature. A PRD captures *what* a
feature should do and *why it matters to the people who use it*: the problem, the shape of
the solution, and the user stories that define done.

PRDs are **long-lived, durable documents.** A PRD is not a one-time spec you write, build
against, and discard — it is the standing description of how a feature is meant to behave,
and it **evolves in place** as the product evolves. When behaviour changes, you edit the
PRD; it always reflects current intent.

## PRD vs. ADR

A PRD is one of two durable document types in this repo. Its sibling is the **ADR**
(Architecture Decision Record, in [`docs/adr/`](../adr/)).

| | **PRD** | **ADR** |
|---|---|---|
| **Answers** | What should this do, and how do we know it's done? | Why is it built this way, and what did we rule out? |
| **Content** | Problem statement, solution shape, user stories per persona | Context, the decision, options considered, consequences |
| **Lifecycle** | Living — edited in place; always reflects current intent | Immutable — frozen at the decision; superseded, never rewritten |
| **Current-truth marker** | Sibling `.test.ts` passes (zero todos = fully built) | `Status` line (`Accepted` / `Superseded by NNNN`) |
| **Naming** | `<slug>.md` + `<slug>.test.ts` | `NNNN-<slug>.md` |
| **When to write one** | A feature with user-observable behaviour worth speccing | A decision that's hard to reverse, surprising without context, and a real trade-off — all three |

The two are not competitors. A single feature often has **both**: the PRD states the
requirement; the ADR justifies the approach that meets it. The PRD tells you the
requirement; the ADR tells you why it's met this particular way.

## Lifecycle: a living document

- **Edit in place.** When intent changes, amend the PRD directly. It always shows current
  intent — never a changelog of what it used to say.
- **No revision history in the file.** The "what we used to want" trail is git's job, not a
  section in the document.
- **Significant decisions graduate to an ADR.** If what changed was a *hard-to-reverse,
  surprising, real-trade-off* decision, record that in an [ADR](../adr/) — don't bury it in
  the PRD. The PRD can evolve freely precisely because the ADR corpus carries the weight of
  explaining the significant turns.

## The PRD ↔ test contract

Every PRD has a co-located `<slug>.test.ts` that makes its stories verifiable. This is the
PRD's current-truth marker — the thing that keeps the living document honest.

- Each user story appears in the test file as **either** a single `it()` (one behaviour)
  **or** a `describe()` block grouping multiple `it()`s (happy path + edge cases).
- The **verbatim** story text is the `it()` name (single) or the `describe()` name
  (grouped). A story's acceptance sub-bullets become the individual `it()`s inside its
  `describe()`.
- `it.todo` = not built · `it()` = built · `it.skip` = view-only.
- **Zero todos anywhere (including inside `describe` blocks) + all green = the PRD is fully
  implemented.**
- When you edit a PRD, reconcile its test file in the **same change** — they move together.

For the full test scaffold (the `makeDomainForTesting()` harness, act/assert seams, and the
flat-vs-`describe` layout rules), see
[`docs/agents/prd-spec-tests.md`](../agents/prd-spec-tests.md).

## Template

```markdown
# feat: <Name>

## Problem Statement
<The problem, in terms of the people who feel it. Why it matters.>

## Solution
<The shape of the solution — enough to frame the stories. Not an implementation plan.>

## User Stories
### <Persona> — <grouping>
1. As a <persona>, I want <capability>, so that <outcome>.
   - <optional acceptance criteria as sub-bullets>
```

## Conventions

- **Files:** `docs/prd/<slug>.md` plus its sibling `docs/prd/<slug>.test.ts`. The slug is
  short kebab-case (e.g. `world-navigation`, `panel-hitbox-select`).
- **Stories:** `As a <persona>, I want <capability>, so that <outcome>.` Group by persona.
- **Requirements only.** No implementation or testing decisions in the PRD — those live in
  ADRs (decisions) or the plan/test files (mechanics).

## Tooling and workflow

Any new work starts at the **`vived-start`** router, which classifies the request and
dispatches to the right skill. A substantial feature is shaped first by **`vived-discovery`**
(an interview that updates `CONTEXT.md` + ADRs), which then hands off to `vived-prd`.

PRDs are written and updated by the local **`vived-prd`** skill, which also owns the
structure of the co-located test file. From there:

- **`vived-architect`** turns a PRD + its tests into a disposable `plans/<slug>.plan.md`.
- **`vived-ralph`** implements one slice per run until the tests are green.

A PRD is the **durable spec**; the GitHub Issues carved from it are **ephemeral work
items**. To change what the feature *should do*, amend the PRD — don't just file an issue.
