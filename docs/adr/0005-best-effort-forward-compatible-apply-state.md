# ADR 0005: `applyState` is best-effort forward-compatible, never version-rejecting

**Status:** Accepted · 2026-09-02

Supersedes [ADR-0003](0003-versioned-state-snapshot.md).

## Context

[ADR-0003](0003-versioned-state-snapshot.md) decided that `applyState` rejects a snapshot whose `version` does not match `ABB_6700_STATE_VERSION`: it submits a warning and returns without touching the arm. That record explicitly weighed the forward-merge alternative the Pneumatic Panel adopted (its ADR-0008) and declined it, reasoning that the ABB 6700's state is "a single flat shape (six joints) with no optional/growable sections, so there is nothing to partially merge."

That reasoning was sound on its own terms and is not what changed. What changed is external:

- **Smart Component Facade Contract v1, rule 16** now requires that `applyState` be best-effort forward-compatible — it applies fields present in the saved state, falls back to entity defaults for absent fields, and *never throws or no-ops on version mismatch*. The contract binds every VIVED smart component, so a per-component exception is no longer available.
- **`demo_automation_cell` ADR 0012** makes the consuming app persist each component's full `ComponentState` snapshot verbatim and add **no guard of its own**, on the explicit basis that version handling is the component's responsibility. Under ADR-0003's behavior, the first schema bump would silently discard every authored arm pose across every slide in that app.

ADR-0003 anticipated its own supersession but named the wrong trigger — it expected the schema to grow optional fields. It did not; the contract moved underneath it.

There is also a latent defect ADR-0003 did not address: `applyState` had no per-field fallback, so an absent joint reached `Angle.FromDegrees(undefined)` and produced an invalid angle rather than a default.

## Decision

`applyState` — and the `applyABB6700State` controller it delegates to (see [ADR-0006](0006-facade-read-surface-and-state-controllers.md)) — is **best-effort forward-compatible**:

- A snapshot is **always applied**, whatever its `version`. Version mismatch is never a rejection and never a no-op.
- Each of the six joints is resolved **individually**. A joint present in the snapshot is applied; a joint absent from it falls back to that joint's entity default rather than being coerced from `undefined`.
- `version` remains on the wire and is still returned by `getState()`. It stays a *description* of the snapshot's provenance, not a gate on applying it.

Stabilizer state remains excluded from the snapshot — that part of ADR-0003 is carried forward unchanged and is not superseded.

## Considered options

**Keep rejecting on mismatch (ADR-0003's decision).** Rejected — it violates Contract v1 rule 16, and under `demo_automation_cell` ADR 0012 it turns the first schema bump into silent, total data loss for authored arm poses.

**Reject on mismatch, but require the consuming app to guard.** Rejected — it inverts the responsibility ADR 0012 assigns, and would need every consumer to reimplement the same guard. The component owns its schema, so the component owns compatibility.

**Apply on mismatch, but still submit a warning.** Not adopted as a requirement. A mismatch is an expected condition under forward-compatibility, not an anomaly, and a warning on every load of an older slide is noise. Nothing here forbids diagnostics, but the warning is not part of the contract.

**Migrate old snapshots through explicit per-version migration functions.** Rejected as premature — there is exactly one schema version. Per-field defaulting delivers the required forward-compatibility with no migration registry to maintain. If the schema ever changes shape incompatibly, a superseding ADR should introduce migrations.

## Consequences

- A snapshot written by any version of the component applies to any other, degrading field-by-field rather than all-or-nothing.
- `demo_automation_cell` can persist arm state verbatim per ADR 0012 with no guard, as that ADR assumes.
- The `Angle.FromDegrees(undefined)` hazard is closed by the per-field fallback.
- Silent-but-partial application replaces loud-but-total rejection. A snapshot carrying an unknown future field is dropped without complaint; the trade is deliberate, and it matches the reference component.
- This is a **behavior change to a public API** and lands in a major version (2.0.0) alongside [ADR-0006](0006-facade-read-surface-and-state-controllers.md).
