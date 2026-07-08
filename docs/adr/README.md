# Architecture Decision Records (ADRs)

This folder holds the **ADRs** for this project. An ADR captures *why* a significant
technical choice was made: the context, the decision, the options that were rejected, and
the consequences that follow.

ADRs are **long-lived, durable records.** The corpus is permanent and grows over time. But
unlike a PRD, an individual ADR is **immutable** — it is frozen at the moment of decision
and never rewritten. The architecture "evolves" not by editing old records but by
**accretion**: a new ADR supersedes an old one. "Current architecture" is the set of ADRs
that have not been superseded.

## ADR vs. PRD

An ADR is one of two durable document types in this repo. Its sibling is the **PRD**
(Product Requirements Document, in [`docs/prd/`](../prd/)).

| | **PRD** | **ADR** |
|---|---|---|
| **Answers** | What should this do, and how do we know it's done? | Why is it built this way, and what did we rule out? |
| **Content** | Problem statement, solution shape, user stories per persona | Context, the decision, options considered, consequences |
| **Lifecycle** | Living — edited in place; always reflects current intent | Immutable — frozen at the decision; superseded, never rewritten |
| **Current-truth marker** | Sibling `.test.ts` passes (zero todos = fully built) | `Status` line (`Accepted` / `Superseded by NNNN`) |
| **Naming** | `<slug>.md` + `<slug>.test.ts` | `NNNN-<slug>.md` |
| **When to write one** | A feature with user-observable behaviour worth speccing | A decision that's hard to reverse, surprising without context, and a real trade-off — all three |

The two are not competitors. A single feature often has **both**: the PRD states the
requirement; the ADR justifies the approach that meets it. The PRD tells you *what* and *how
you know it's done*; the ADR tells you *why it's built this particular way*.

## When to write an ADR

Write one only when a decision clears **all three** bars:

1. **Hard to reverse** — the cost of changing your mind later is meaningful.
2. **Surprising without context** — a future reader will wonder "why did they do it this
   way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one
   for specific reasons.

If any bar is missing, skip the ADR. Most features get a PRD and **no** ADR — an ADR appears
only when a decision genuinely earns one. This keeps the corpus small and high-signal.

## Lifecycle: immutable, superseded by accretion

- **Frozen once accepted.** Do not rewrite the Context, Decision, Considered options, or
  Consequences of an existing ADR. The value of the record is *what we decided, and when*.
- **The `Status` line is the only thing you edit in place.** Annotating the record's status
  is not "evolving the decision."
- **Supersede, don't overwrite.** When a decision changes, write a *new* ADR and mark the old
  one `Superseded by ADR-NNNN`.
- **Make supersession loud.** A superseded ADR gets a banner at the very top so no reader is
  stranded on stale truth:

  > ⚠️ Superseded by ADR-0007 — see that ADR for the current decision.

- **Adding "see also / superseded-by / revised-by" links is allowed**; rewriting decision
  prose is not.

## Template

```markdown
# <Title — the decision as a short statement>

**Status:** Accepted · YYYY-MM-DD

<!-- If superseded, replace the status line and add a banner at the very top: -->
<!-- **Status:** Superseded by ADR-0007 · YYYY-MM-DD -->
<!-- > ⚠️ Superseded by ADR-0007 — see that ADR for the current decision. -->

<One or two paragraphs of context: the forces at play, the problem, what's at stake.>

## Decision
<What we decided, stated plainly. Use `## Decisions` if one ADR bundles several linked calls.>

## Considered options
<Each alternative and why it was rejected.>

## Consequences
<What follows — benefits, costs, and follow-on work.>
```

## Conventions

- **Files:** `docs/adr/NNNN-<slug>.md`, numbered sequentially (`0001-`, `0002-`, …). The
  number is permanent; never renumber.
- **Status values:** `Proposed` · `Accepted` · `Deprecated` · `Superseded by ADR-NNNN`.
- **Date** every status line (absolute, `YYYY-MM-DD`).

## Authoring

ADRs are authored by hand following the template above when a decision clears the three-part
bar. There is no local skill that owns ADRs — the `vived-architect` skill writes disposable
`plans/`, not durable records. A `grill-with-docs` session can help draft one as a decision
crystallises.
