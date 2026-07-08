# ADR 0004: ABB 6700 adopts the presentation-free Smart Component contract

**Status:** Accepted · 2026-07-08

## Context

The VIVED Smart Component contract (as settled by the consuming apps and the reference Pneumatic Panel component, its ADR-0009) divides responsibility as follows: the **component** owns geometry, domain logic/state, and the semantic identity of its parts; the **Host** owns all interaction-state presentation — hover outline, hint glow, tooltip — and all pointer detection.

Under this contract a component must not render its own selection/hover feedback or run its own picking, because the Host already does so and arbitrates across every component in the scene. A component that also did this would produce conflicting visuals and a second, unused detection path.

The ABB 6700 has never shipped self-rendered interaction feedback, so adopting the contract is a clean adoption rather than a removal. What it needs is to **expose the semantic data the Host requires** to drive its own highlighting.

## Decision

The ABB 6700 adopts the presentation-free Smart Component contract:

- `ABB6700BabylonView` exposes `highlightGroupsByObjectId: ReadonlyMap<string, AbstractMesh[]>` — a map from a host-facing group key to the meshes the Host should treat as one highlightable unit. The exported key `ABB6700_WHOLE_ARM_HIGHLIGHT_GROUP = "abb_6700"` maps to every visible robot mesh, so the Host can outline the whole arm.
- `ABB6700BabylonView` exposes `nodesByObjectId: ReadonlyMap<string, Node>` — resolved nodes for `joint_1`…`joint_6`, `stabilizer_joint_1`, `stabilizer_joint_2`, and `eot`.
- The component renders **no** hover/select/hint feedback and performs **no** pointer detection. The Host owns any `SelectionOutlineLayer`, `HighlightLayer`, `ActionManager`, and picking.
- A guard test (`src/presentation-free.test.ts`) fails the build if `ActionManager`, `HighlightLayer`, `SelectionOutlineLayer`, `onPointer`, or `scene.pick` appear anywhere in `src/`.

## Considered options

**Render selection/hover outlines inside the component (via `HighlightLayer`).** Rejected — the Host already renders and arbitrates interaction feedback; a component-drawn outline would conflict in color/width and take no part in that arbitration.

**Detect hover/clicks inside the component (via `ActionManager`) and emit domain events.** Rejected — the Host must detect pointer input anyway to drive its own highlight and tooltip; a duplicate detection path in the component is noise with no consumer. This is why the facade's event catalog is currently empty (see CONTEXT.md → ABB6700Events).

**Expose only raw meshes and let the Host group them.** Rejected — the component owns the semantic identity of its parts, so it is the right place to define the "whole arm" group and the objectId→node map. Handing the Host a semantic map keeps grouping logic out of every consumer.

## Consequences

- `ABB6700BabylonView` gains `highlightGroupsByObjectId` and `nodesByObjectId`; the whole-arm key is exported as `ABB6700_WHOLE_ARM_HIGHLIGHT_GROUP`.
- The component owns no picking or highlight rendering; hosts integrate via the two lookup maps.
- The guard test locks in the contract — any future pointer/highlight code in `src/` fails CI.
- The facade exposes no interaction events, consistent with the Host owning interaction detection.
