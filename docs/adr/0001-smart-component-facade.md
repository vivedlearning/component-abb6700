# ADR 0001: ABB6700Facade as the recommended host-facing surface

**Status:** Accepted · 2026-07-08

## Context

The ABB 6700's original public API was a set of flat controller functions (`createBabylonABB6700`, `setPose`, `setJointAngle`, `getPose`) plus the raw view and domain exports. A host integrating the component had to discover and call several functions and manage the AppObject/view wiring itself. There was no single object representing a component instance and no shared, typed contract that a host could hold uniformly across different smart components.

The VIVED reference component (Pneumatic Panel) had already established a **facade** as the canonical host seam (its ADR-0006), implementing a structural `SmartComponent` contract. The goal here was to bring the ABB 6700 to that same host-integration shape.

## Decision

The ABB 6700 exposes a single **facade class**, `ABB6700Facade`, as the recommended host-facing entry point. The facade:

- Implements the **SmartComponent** structural convention (`id`, `interfaceVersion`, `onEvent`, `onViewModel`, `load`, `destroy`, `getState`, `applyState`) so a host can hold it as a uniform reference alongside other smart components via structural typing — no shared package required.
- Wraps the existing control surface as typed methods (`setPose`, `setJointAngle`, `getPose`).
- Adds a serializable state API (`getState` / `applyState`) — see ADR-0003.

The `SmartComponent` interface is defined **locally** in this package (`src/SmartComponent.ts`), not imported from a shared library — it is a shape convention satisfied by TypeScript structural typing.

This change is **additive**. Unlike the Pneumatic Panel (which removed its flat `on*` controllers as a breaking change), the ABB 6700 retains its existing controller and `createBabylonABB6700` exports. The facade is documented as the recommended surface; the controllers remain supported for existing callers and as the mechanism the facade delegates to.

## Considered options

**Keep only flat controllers.** Rejected — no uniform per-instance object, no shared contract across components, and inconsistent with the reference component.

**Remove the flat controllers when adding the facade (as the Pneumatic Panel did).** Rejected for the ABB 6700 *at this time*: the controllers have existing consumers and the facade delivers its value additively. Collapsing to facade-only can be revisited in a future major version if the two-tiered surface proves confusing.

**Ship a shared `SmartComponent` package.** Rejected — the contract is small and stable; a per-project structural interface avoids a cross-repo dependency and version-coupling. This matches the reference component.

## Consequences

- Hosts have one import and one interaction object per ABB 6700 instance.
- The facade is the primary surface documented in `README.md` and `COMPONENT_KNOWLEDGE.md`; `createBabylonABB6700` is presented as the one-call convenience alternative.
- Both the facade and the flat controllers exist in the public API, so consumers can use either. This two-tiered surface is an accepted trade-off for keeping the change additive.
- The facade's construction/lifecycle is governed by ADR-0002; its state contract by ADR-0003; its presentation boundary by ADR-0004.
