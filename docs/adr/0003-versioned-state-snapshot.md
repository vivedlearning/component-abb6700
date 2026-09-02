> ⚠️ Superseded by [ADR-0005](0005-best-effort-forward-compatible-apply-state.md) — see that ADR for the current decision on version handling. The snapshot shape decided here (`version` + six joint degrees, stabilizer excluded) is carried forward unchanged; only the reject-on-mismatch behavior is superseded.

# ADR 0003: Versioned activity-authored state snapshot

**Status:** Superseded by ADR-0005 · 2026-09-02

## Context

Hosts need to persist and restore the ABB 6700's authored configuration — the arm's pose — as part of saving a slide's state. This requires a serializable snapshot that is stable across component versions, so a snapshot saved by one version of the component can be reasoned about when read by another.

The arm's authorable configuration is exactly its six joint angles. The stabilizer linkage is derived from J2 (see `CalcStabilizerUC` / CONTEXT.md) and must **not** be part of the snapshot — persisting derived state would let a stale snapshot contradict the derivation.

## Decision

The facade exposes a versioned state snapshot:

- `ABB6700State = { version: number; j1..j6: number }` — the six joint angles **in degrees**, tagged with an integer `version`.
- `ABB_6700_STATE_VERSION = 1` is the current schema version.
- `getState()` returns the current pose as degrees at the current version.
- `applyState(state)` is **version-checked and best-effort**: if `state.version !== ABB_6700_STATE_VERSION`, the snapshot is **rejected** — the facade calls `appObjects.submitWarning(...)` and returns without mutating the arm, rather than applying a state it does not understand. A matching version applies the full pose.

Stabilizer state is deliberately excluded; it is recomputed from J2 on apply.

## Considered options

**Angles stored as `Angle` objects or radians in state.** Rejected — state must be plain, serialization-friendly data. Degrees are the human- and JSON-friendly unit and match the component's public angle conventions.

**Include stabilizer angle/extension in the snapshot.** Rejected — they are derived from J2; storing them invites drift where a restored snapshot's stabilizer disagrees with its J2.

**Best-effort *forward-merge* on version mismatch (apply known fields, default the rest), as the Pneumatic Panel does (its ADR-0008).** Considered but not adopted for v1: the ABB 6700 state is a single flat shape (six joints) with no optional/growable sections, so there is nothing to partially merge. Rejecting an unknown version and warning is the simpler, safer behavior. If the schema later grows optional fields, this ADR should be superseded by one adopting the forward-merge strategy.

**Silently ignore version and always apply.** Rejected — a future incompatible schema would be misapplied with no signal.

## Consequences

- Hosts get a small, stable, serializable snapshot (`version` + six degrees).
- Version mismatches fail loud-but-safe: a warning is submitted and the arm is left untouched.
- Bumping the schema shape requires incrementing `ABB_6700_STATE_VERSION`; a future migration/forward-compat need should be captured in a superseding ADR.
- `applyState` is safe before `load()`; the view reads entity state at load time.
