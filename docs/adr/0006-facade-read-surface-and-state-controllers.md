# ADR 0006: State controllers are the serialization seam; the facade's read surface narrows to `getState` / `onViewModel`

**Status:** Accepted · 2026-09-02

Amends the facade-surface decision in [ADR-0001](0001-smart-component-facade.md), which listed `getPose` among the facade's typed methods. ADR-0001 otherwise stands.

## Context

Two pressures arrived together, both from the same conformance audit of `demo_automation_cell` (2026-09-02).

**Serialization needs a domain-only seam.** `ABB6700Facade` owns `load()` and its dynamic Babylon import — it is a view-construction artifact. `demo_automation_cell` ADR 0012 routes each component's persisted `ComponentState` through the component's **state controllers** precisely so that a domain `SerializedSystem` use case never has to import such an artifact. The ABB 6700 exported `getPose`, `setPose` and `setJointAngle` as controllers but no state controllers, so its state was reachable *only* through the facade. It was one of only two components that could not follow the rule, and the app's Authoring Mode makes all four robot arms author-configurable — arm state is about to be persisted per slide.

**The facade had two ways to ask the same question.** `getPose()` was the only read accessor on any of the seven shipped facades. `getState()` already returns all six joint angles synchronously, and `onViewModel()` streams them live along with the derived stabilizer values. `getPose` was also exported as a standalone controller, so the facade method added no capability. It appeared in zero places under `demo_automation_cell/src`.

For the record: `getPose` on the facade was **not** a Contract v1 rule 12 violation. Rule 12 ("commands never return domain data") binds commands; a read accessor is a legitimate Tier-3 member. It read as a violation to the auditor only because `components/abb-6700.md` filed it under *Command methods*. That was ruled on 2026-09-02 and captured in canon as vivedlearning/vivian-knowledge#87. `getPose` was legal — it was redundant.

## Decisions

**1. Standalone state controllers are the serialization seam.**

```ts
getABB6700State(id: string, appObjects: AppObjectRepo, version: number): ABB6700State
applyABB6700State(id: string, appObjects: AppObjectRepo, state: ABB6700State): void
```

Both are exported from `index.ts`, matching the shape already shipped by `@vived/component-abb-controller`, `-electrical-cabinet`, `-pneumatic-panel` and `-stacklight`. A consuming app's domain persists and restores an arm through these, never through the facade.

**2. `ABB6700Facade.getState` / `applyState` are one-line delegations** to those controllers, per the facade recipe's rule 7. The facade holds no state logic of its own, so the two seams cannot drift.

**3. `getPose` is removed from `ABB6700Facade`.** The facade's sanctioned read surface is `getState()` for authored configuration and `onViewModel()` for everything live. The standalone `getPose` **controller** export is retained for callers that genuinely need a pose read.

## Considered options

**Put the state controllers behind the facade only.** Rejected — this is the status quo that `demo_automation_cell` ADR 0012 cannot use, and the reason this ADR exists.

**Keep `getPose` on the facade.** Rejected. It is legal but redundant, and each additional accessor is a second way to ask a question `getState` and `onViewModel` already answer — exactly what the single-source-of-truth rules exist to prevent. It is also the sole read accessor across seven facades, so keeping it preserves an inconsistency rather than a capability.

**Remove the standalone `getPose` controller too.** Rejected — the controller is the sanctioned way to read a pose without a facade, it has no redundant sibling at the controller tier, and removing it would take away capability rather than duplication.

**Deprecate `getPose` on the facade for one minor version before removing it.** Rejected — [ADR-0005](0005-best-effort-forward-compatible-apply-state.md) already forces a major version in the same release, so the deprecation cycle would buy no compatibility that the major bump does not already signal.

## Consequences

- A consuming app's domain layer can persist an arm with no reference to the facade, satisfying `demo_automation_cell` ADR 0012.
- The seven shipped facades become uniform: no read accessors on any of them.
- **Breaking.** Any caller of `facade.getPose()` must move to `facade.getState()`, `onViewModel()`, or the standalone `getPose` controller. Ships in 2.0.0 with [ADR-0005](0005-best-effort-forward-compatible-apply-state.md).
- ADR-0001's list of facade methods is now historical on the `getPose` point. Its core decision — the facade as the recommended host-facing surface implementing the SmartComponent convention — is unaffected.
- `CONTEXT.md` glossary entries for *Pose*, *ABB6700Facade* and *getState / applyState* are updated in the same change, as is `COMPONENT_KNOWLEDGE.md`, which additionally moves `getPose` out of its *Command methods* table.
