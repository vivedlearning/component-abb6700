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

Set via `setPose` (controller) or `ABB6700Facade.setPose`. Read via the standalone `getPose` controller, which returns `undefined` before the instance exists; `ABB6700Facade` has no pose accessor of its own — use `getState()` for authored configuration or `onViewModel` for the live pose (see ADR-0006).

_Avoid_: partial poses — a pose always carries all six joints. To move one joint, use `setJointAngle`.

---

## Stabilizer linkage

The four-bar linkage that visually connects J1 and J2 on the physical robot. Its geometry is **computed automatically** from J2 by `CalcStabilizerUC` — developers never set it directly. The UC observes entity changes and, when J2 changes, derives two values:

- `stabilizerAngle` — the rotation of the stabilizer's rotational member (`stabilizer_joint_1`)
- `stabilizerExtension` — the prismatic extension of `stabilizer_joint_2`

Only J2 drives the stabilizer; the other joints do not affect it.

The math lives in the pure function `calcStabilizer(j2)`, exported from `CalcStabilizerUC.ts`. The UC calls it when J2 changes; the Babylon view calls it every frame with the interpolated J2 during a **pose transition**, so the linkage stays attached mid-motion.

_Avoid_: exposing a stabilizer setter or persisting stabilizer state — it is derived, not authored. `ABB6700State` deliberately omits it.

---

## EOT (End Of Tooling)

The transform node at the robot's wrist where tooling (grippers, welders, etc.) is mounted. Exposed by the view as `eotTransformNode` so a host can parent tooling to it.

**GLB objectId:** `eot` (lowercase). If the node is missing from the GLB, `eotTransformNode` returns `undefined`.

_Avoid_: spelling it "EOAT" or "end effector" in the API — the code and GLB use `eot`.

---

## ABB6700Entity

The per-instance source of truth. Holds `j1`–`j6` (each a `MemoizedAngle`, default 0°), the derived `stabilizerAngle` (`MemoizedAngle`) and `stabilizerExtension` (`number`), the `transitionDurationMs` (`number`, default 1000) the view uses for **pose transitions**, and `snapCount` (`number`, starts at 0), which a snap command increments. Setters fire `notifyOnChange`; the PM observes it and emits an immutable VM.

---

## ABB6700VM

The immutable view model emitted by `ABB6700PM`. Carries the six joint `Angle`s, the derived stabilizer angle and extension, `transitionDurationMs`, and `snapCount`. No VM ever carries interpolated angles. A single pose command can emit several VMs (the joints are written one at a time, and the stabilizer is derived after J2), so intermediate VMs may show a partial pose; the last VM delivered for the command carries the full commanded **target**. Redundant emissions are suppressed via `vmsAreEqual` (degree-level comparison). Views and hosts subscribe through `aBB6700PMAdapter`.

_Avoid_: reading entity fields directly from a view — bind to the VM.

---

## Pose transition

The eased motion of the rendered arm from the pose currently on screen to a newly commanded pose. It exists **only in the Babylon view**: once the command returns, the entity, the last VM delivered, and `getState()` all hold the commanded target, so persistence and host UI never see a mid-transition pose. Intermediate VMs emitted during the command can show a partial pose, but never interpolated angles.

- **Transition duration** — `transitionDurationMs` on the entity, default 1000 ms (`ABB_6700_DEFAULT_TRANSITION_DURATION_MS`). Set per instance with `setTransitionDuration` (controller) or `ABB6700Facade.setTransitionDuration`, at any time, including before `load()`. Zero disables transitions. A negative or non-finite value is rejected with a warning and the previous value is kept. A change applies to the next commanded pose; a transition already in flight keeps its duration.
- **Easing** — ease-in-out (smoothstep). The final frame writes the target exactly.
- **Redirect** — a pose commanded mid-transition starts a new transition from the angles on screen, for the full duration. The superseded target is never visited.
- **Snap** — no transition when the view first binds its nodes on load (it renders the current pose, including one commanded before load), after a remount or rebind, or when the duration is zero. The first pose commanded after the view has bound transitions normally.
- **Snap command** — a caller can ask for a snap per command by passing `{ transition: "none" }` to `setPose`, `setJointAngle` or `applyState` (facade or controller). The rendered arm lands on the commanded target at once, ending any transition in flight, even when the target has not changed. Leaving the option out, or passing `"transition"`, transitions as usual. The domain signals it by incrementing `snapCount` after writing the joints, and the view snaps whenever the count changes. It affects rendering only: the committed target, `getState()` and the transition duration are the same either way. Use it for direct manipulation such as dragging a joint slider; a slide change should transition.

The transition duration is pacing, not **activity-authored configuration**: `ABB6700State` does not carry it.

_Avoid_: calling it "animation", "animate" or "lerp" — in the API, in option values, or in prose about pose transitions. **"Animation" is reserved for actual model animations** (keyframed clips a model may carry), which the component may support later. Also avoid interpolating in the domain or PM — the VM must keep reporting the target — and avoid toggling the transition duration to get a one-off snap; use a snap command.

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
- `applyState(state): void` — restore a snapshot (best-effort forward-compatible)

Not sourced from a shared package. Enforced by convention and TypeScript structural typing — any object with this shape satisfies the contract. A host may define this interface locally; any conforming facade satisfies it.

_Avoid_: calling this a "base class" or "interface package" — it is a shape convention, not a nominal type.

---

## ABB6700Facade

The single host-facing entry point for the ABB 6700 smart component. Implements the SmartComponent convention and adds component-specific typed commands (`setPose`, `setJointAngle`, `setTransitionDuration`). Its read surface is `getState()` (authored configuration) and `onViewModel()` (live values) — no separate pose accessor (see ADR-0006).

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
- `applyState(state: ABB6700State)` — applies a saved snapshot by setting the full pose. **Best-effort forward-compatible** (see ADR-0005, superseding ADR-0003): the snapshot is always applied, whatever its `version` — never rejected, never a no-op. Each joint is resolved independently; a joint the snapshot omits falls back to that joint's entity default rather than producing an invalid angle.

`applyState` is safe to call before `load()`; the Babylon view reads entity state at load time and comes up in the correct configuration.

---

## State controllers (`getABB6700State` / `applyABB6700State`)

The domain-only serialization seam: standalone controllers, exported directly from the package, that read and restore the same state-snapshot contract as `getState` / `applyState` without constructing a facade. `ABB6700Facade.getState` / `.applyState` are one-line delegations to these controllers, so the two seams cannot drift apart.

- `getABB6700State(id, appObjects, version)` — returns the six joint angles tagged with `version`. An id with no arm behind it submits a warning and resolves to the entity-default snapshot rather than throwing.
- `applyABB6700State(id, appObjects, state)` — same best-effort forward-compatible behavior as `applyState`. An id with no arm behind it submits a warning and leaves the domain untouched.

Exists so a consuming app's domain-layer `SerializedSystem` can persist and restore an arm without importing `ABB6700Facade`, which owns `load()`'s Babylon view construction (see ADR-0006).

_Avoid_: routing persistence through the facade in a domain-only serializer — use these controllers instead.

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
