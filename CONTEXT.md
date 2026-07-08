# ABB 6700 — Domain Glossary

## ABB 6700

A 6-axis industrial robot arm smart component. Provides a fully rigged 3D model with six degrees of freedom (joints J1–J6) plus an automatically-computed stabilizer linkage. The component owns geometry, joint kinematics, and the semantic identity of its parts; it does **not** own interaction-state presentation (see **presentation-free contract**).

**Package:** `@vived/component-abb-6700`
**GLB root objectId prefix:** `joint_1` … `joint_6`, `stabilizer_joint_1`, `stabilizer_joint_2`, `eot`

---

## Joint (J1–J6)

One of the six independently-controllable rotational axes of the arm, numbered `j1` through `j6` from base to wrist. Each joint has an angle stored on `ABB6700Entity` as a `MemoizedAngle` (default 0°). Setting a joint rotates the corresponding GLB node about its local Z axis.

**Type:** `ABB6700Joint = "j1" | "j2" | "j3" | "j4" | "j5" | "j6"`

_Avoid_: referring to joints as "axes" in the API surface — the code uses "joint" consistently. "Axis" is fine in prose describing the physical robot.

---

## Pose

The complete set of all six joint angles applied atomically. A pose is the unit of "move the whole arm at once."

**Type:** `ABB6700Pose` — `{ j1: Angle; j2: Angle; …; j6: Angle }` (all six required)

Set via `setPose` (controller) or `ABB6700Facade.setPose`. Read via `getPose` / `ABB6700Facade.getPose`, which returns `undefined` before the instance exists.

_Avoid_: partial poses — a pose always carries all six joints. To move one joint, use `setJointAngle`.

---

## Stabilizer linkage

The four-bar linkage that visually connects J1 and J2 on the physical robot. Its geometry is **computed automatically** from J2 by `CalcStabilizerUC` — developers never set it directly. The UC observes entity changes and, when J2 changes, derives two values:

- `stabilizerAngle` — the rotation of the stabilizer's rotational member (`stabilizer_joint_1`)
- `stabilizerExtension` — the prismatic extension of `stabilizer_joint_2`

Only J2 drives the stabilizer; the other joints do not affect it.

_Avoid_: exposing a stabilizer setter or persisting stabilizer state — it is derived, not authored. `ABB6700State` deliberately omits it.

---

## EOT (End Of Tooling)

The transform node at the robot's wrist where tooling (grippers, welders, etc.) is mounted. Exposed by the view as `eotTransformNode` so a host can parent tooling to it.

**GLB objectId:** `eot` (lowercase). If the node is missing from the GLB, `eotTransformNode` returns `undefined`.

_Avoid_: spelling it "EOAT" or "end effector" in the API — the code and GLB use `eot`.

---

## ABB6700Entity

The per-instance source of truth. Holds `j1`–`j6` (each a `MemoizedAngle`, default 0°), plus the derived `stabilizerAngle` (`MemoizedAngle`) and `stabilizerExtension` (`number`). Setters fire `notifyOnChange`; the PM observes it and emits an immutable VM.

---

## ABB6700VM

The immutable view model emitted by `ABB6700PM`. Carries the six joint `Angle`s plus the derived stabilizer angle and extension. Redundant emissions are suppressed via `vmsAreEqual` (degree-level comparison). Views and hosts subscribe through `aBB6700PMAdapter`.

_Avoid_: reading entity fields directly from a view — bind to the VM.

---

## SmartComponent

The structural interface convention that all smart-component facades implement — **Smart Component Facade Contract v1**, eight mandatory members:

- `readonly id: string`
- `readonly interfaceVersion: number` (1)
- `onEvent(event, cb): () => void` — subscribe to a named event; returns an unsubscribe function
- `onViewModel(cb): () => void` — subscribe to the reactive view model; returns an unsubscribe function
- `load(variant?): Promise<void>` — attach the 3D view and complete async setup
- `destroy(): void` — tear down the instance and release resources
- `getState(): ABB6700State` — snapshot the activity-authored configuration
- `applyState(state): void` — restore a snapshot (versioned, best-effort)

Not sourced from a shared package. Enforced by convention and TypeScript structural typing — any object with this shape satisfies the contract. A host may define this interface locally; any conforming facade satisfies it.

_Avoid_: calling this a "base class" or "interface package" — it is a shape convention, not a nominal type.

---

## ABB6700Facade

The single host-facing entry point for the ABB 6700 smart component. Implements the SmartComponent convention and adds component-specific typed commands (`setPose`, `setJointAngle`, `getPose`).

Two-phase lifecycle (see ADR-0002):

1. **Construction** (sync) — `new ABB6700Facade(id, appObjects)`. Wires the domain; the facade is immediately usable for commands and state. No Babylon context required, and importing the facade module pulls in no Babylon code (the view is dynamically imported at `load()`).
2. **Load** (async) — `await facade.load()`. Creates and attaches the Babylon view. Required before the component renders in a 3D scene.

The recommended host integration surface. `createBabylonABB6700` remains a convenience entry point that wires domain + view in one call.

_Avoid_: calling flat controllers (`setPose`, `createBabylonABB6700`, …) from host code when a facade will do — use the facade.

---

## ABB6700Events

The typed event catalog for `ABB6700Facade.onEvent()`. The ABB 6700 currently emits **no events** (`Record<never, never>`) — its behavior is command-and-view-model only. `onEvent` is implemented as a contract-complete no-op that returns a valid unsubscribe function, so the facade still satisfies the SmartComponent shape.

_Avoid_: adding domain events without a real host consumer — the component stays command/VM-driven until an event has a caller.

---

## ABB6700State

A strongly typed snapshot of the activity-authored configuration for an `ABB6700Facade` instance. Returned by `getState()` and accepted by `applyState()`.

| Field | Type | Description |
|---|---|---|
| `version` | `number` | Integer schema version, starting at `1` (`ABB_6700_STATE_VERSION`). |
| `j1`–`j6` | `number` | The six joint angles, **in degrees**. |

Persists only the six joints. Stabilizer state is derived and deliberately excluded.

_Avoid_: storing angles as `Angle` objects or radians in state — state is plain degrees for serialization. Do not store student interaction history — state captures activity-authored configuration only.

---

## getState / applyState

The two facade methods that expose the state snapshot contract:

- `getState(): ABB6700State` — returns the current six joint angles as degrees, tagged with the current version.
- `applyState(state: ABB6700State)` — applies a saved snapshot by setting the full pose. Best-effort and versioned (see ADR-0003): a state whose `version` does not match `ABB_6700_STATE_VERSION` is rejected with a submitted warning rather than applied.

`applyState` is safe to call before `load()`; the Babylon view reads entity state at load time and comes up in the correct configuration.

---

## presentation-free contract

The contract by which the component owns geometry, kinematics, and the semantic identity of its parts, but the **Host** owns all interaction-state presentation: hover outline, hint glow, tooltip, and pointer detection (see ADR-0004).

The component exposes the semantic data the Host needs instead of rendering interaction feedback itself:

- `highlightGroupsByObjectId` — maps a host-facing group key to the `AbstractMesh[]` the Host should treat as one highlightable unit.
- `nodesByObjectId` — resolved Babylon nodes indexed by objectId (`joint_1`…`joint_6`, `stabilizer_joint_1/2`, `eot`).

A guard test (`src/presentation-free.test.ts`) fails the build if `ActionManager`, `HighlightLayer`, `SelectionOutlineLayer`, `onPointer`, or `scene.pick` appear anywhere in `src/`.

_Avoid_: adding `ActionManager`, picking, highlight layers, or selection-outline rendering to the component — those belong to the Host.

---

## ABB6700_WHOLE_ARM_HIGHLIGHT_GROUP

The exported highlight-group key (`"abb_6700"`) whose entry in `highlightGroupsByObjectId` maps to **all visible robot meshes**, so a Host can outline the entire arm as one unit.

_Avoid_: hard-coding the string `"abb_6700"` in host code — import the constant.

---

## activity-authored configuration

The set of component field values an activity author explicitly configures as the starting state for a student interaction. Distinct from student interaction state (what a student does during a session). `ABB6700State` captures activity-authored configuration only.

_Avoid_: conflating activity-authored configuration with student progress or interaction history.
