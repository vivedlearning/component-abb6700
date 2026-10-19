# ABB 6700 — VIVED Smart Component

## Summary

The ABB 6700 is a 6-axis industrial robot arm smart component. It provides a fully rigged 3D model with 6 degrees of freedom (joints J1–J6) and an automatically-computed stabilizer linkage. Developers can set individual joint angles or full poses through simple controller functions; the rendered arm eases to each new pose over a configurable transition duration, or snaps straight there when a command asks for it. A host can also play a path, an ordered list of poses with host-given travel times and dwells (for example a weld program), get an event as the arm reaches each pose, and stop the path in flight so the arm slows to rest where it is. Use this component when your slide app needs an articulated robot arm for industrial simulation, robotics education, or manufacturing visualization.

- **Package**: `@vived/component-abb-6700`
- **Version**: 2.3.0
- **Interface version**: 1 (`SmartComponent` contract implemented by `ABB6700Facade`)
- **GitHub**: `vivedlearning/component-abb6700`

---

## Discovery

- **Category**: Robotics / Industrial Equipment
- **Tags**: robot arm, 6-DOF, articulated robot, industrial robot, ABB, manufacturing, joints, pose, kinematics, path playback, weld path, spot welding, dwell, stop in flight
- **Visual description**: An orange and grey 6-axis industrial robot arm (ABB IRB 6700 series). Approximately 1.5m reach. Mounted on a fixed base, with a visible stabilizer linkage between the base and the second joint. The end-of-arm has a tool mounting point (EOT) for attaching grippers, welders, or other tooling.
- **Multi-instance**: Yes — multiple robots can coexist in a single scene.

---

## Quick Start

### 1. Install

```bash
npm install @vived/component-abb-6700
```

**Peer dependencies** (must already be in your project):

- `@babylonjs/core ^9.0.0`
- `@babylonjs/loaders ^9.0.0`
- `@vived/core ^2.0.0`
- `@vived/app ^6.2.0`

### 2. Register the feature factory

During your domain setup, before calling `factoryRepo.setupDomain()`:

```typescript
import { makeAppObjectRepo, makeDomainFactoryRepo } from "@vived/core";
import { makeABB6700FeatureFactory } from "@vived/component-abb-6700";

const appObjects = makeAppObjectRepo();
const factoryRepo = makeDomainFactoryRepo(appObjects);

makeABB6700FeatureFactory(appObjects);
factoryRepo.setupDomain();
```

### 3. Create an instance through the facade (recommended)

```typescript
import { ABB6700Facade } from "@vived/component-abb-6700";

const robot = new ABB6700Facade("robot-1", appObjects);
await robot.load();
```

`ABB6700Facade` is the recommended Host integration surface. Its constructor is headless (domain only); `load()` attaches the Babylon view.

### 4. Create an instance and load the 3D model directly

```typescript
import { createBabylonABB6700 } from "@vived/component-abb-6700";

// Creates domain instance + Babylon view in one call
const appObject = await createBabylonABB6700("robot-1", appObjects);
```

### 5. Move the robot

```typescript
import { Angle } from "@vived/core";
import { setJointAngle, setPose } from "@vived/component-abb-6700";

// Set a single joint
setJointAngle("robot-1", "j2", Angle.FromDegrees(-45), appObjects);

// Set all joints at once
setPose(
  "robot-1",
  {
    j1: Angle.FromDegrees(30),
    j2: Angle.FromDegrees(-45),
    j3: Angle.FromDegrees(20),
    j4: Angle.FromDegrees(0),
    j5: Angle.FromDegrees(10),
    j6: Angle.FromDegrees(-15),
  },
  appObjects,
);
```

---

## Facade (host-facing surface)

`ABB6700Facade` is the canonical way a host drives an instance. It implements the structural **SmartComponent contract (v1)** and adds the ABB 6700's typed commands. Construct it synchronously, then `await load()` to attach the 3D view.

> The controllers and `createBabylonABB6700` remain supported public API (the facade is additive), but the facade is the recommended surface for host integration.

### Structural contract (v1)

Every facade has these eight members with this exact shape:

| Member             | Signature                                                       | Notes                                                                                          |
| ------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`               | `readonly string`                                              | The instance identifier.                                                                       |
| `interfaceVersion` | `readonly number`                                             | `1`.                                                                                            |
| `onEvent`          | `(event: string, cb: (...args: never[]) => void) => () => void` | Subscribe to a named event; returns an unsubscribe fn. The ABB 6700 emits three path events (see *Events*). An unknown name returns a valid no-op unsubscribe fn. |
| `onViewModel`      | `(cb: (vm: ABB6700VM) => void) => () => void`                  | Subscribe to the reactive view model; returns an unsubscribe fn.                                |
| `load`             | `(variant?: string) => Promise<void>`                         | Attaches the Babylon view. The only async member.                                              |
| `destroy`          | `() => void`                                                  | Tears down the instance and releases resources.                                                |
| `getState`         | `() => ABB6700State`                                          | Snapshot the authored configuration.                                                           |
| `applyState`       | `(state: ABB6700State, options?: ABB6700TransitionOption) => void` | Restore a snapshot (best-effort forward-compatible). The optional `options` goes beyond contract v1's `applyState(state)` and stays structurally compatible with it. |

### Lifecycle (two-phase)

1. **Construction** (sync) — `new ABB6700Facade(id, appObjects)` wires the full domain idempotently (constructing for an existing `id` returns a handle to the existing instance, never a duplicate). No Babylon context is required, and importing or constructing the facade pulls in no Babylon code.
2. **Load** (async) — `await facade.load()` attaches the Babylon view. All commands, `getState`, and `applyState` work *before* `load()` is called.

### Command methods

| Method          | Signature                                          | Description                        |
| --------------- | -------------------------------------------------- | ---------------------------------- |
| `setPose`       | `(pose: ABB6700Pose, options?: ABB6700TransitionOption) => void` | Set all six joints atomically. |
| `setJointAngle` | `(joint: ABB6700Joint, angle: Angle, options?: ABB6700TransitionOption) => void` | Set a single joint. |
| `setTransitionDuration` | `(ms: number) => void`                     | Set how long the rendered arm takes to ease to each new pose. Default 1000; `0` disables transitions. |
| `playPath`      | `(segments: readonly ABB6700PathSegment[]) => void` | Play an ordered list of segments (a pose, `durationMs`, optional `dwellMs`) as one motion. **Beyond contract v1**; additive. |
| `stopPath`      | `(options?: ABB6700StopPathOptions) => void`       | Stop the path in flight: the arm slows to rest and the rest pose is committed. `{ durationMs }` sets the stop duration (default 400). **Beyond contract v1**; additive. |

Commands return `void`. Pose commands are never blocked. `setPose`, `setJointAngle` and `applyState` take an optional `{ transition: "none" | "transition" }` (see *Snap commands* below). `setTransitionDuration` rejects a negative or non-finite value with a warning and keeps the previous duration. To read state, use `getState()` or `onViewModel` — the facade has no separate pose accessor.

`playPath` and `stopPath` go beyond contract v1. They are additive, so the facade still satisfies the contract. `playPath` rejects the whole request with a warning, and changes nothing, if the segment list is empty, a segment is not an object with a `pose`, or any `durationMs` or `dwellMs` is negative or not finite. `stopPath` with no path in progress does nothing. Any pose command, or a new `playPath`, cancels a path in progress.

### Pose transitions

By default the rendered arm does not jump to a commanded pose; the Babylon view eases it there from wherever it currently is on screen (ease-in-out, arriving exactly on the target). The transition duration is per instance and can be set at any time, including before `load()`:

- A change applies to the next commanded pose; a transition already in flight keeps the duration it started with.
- A pose commanded mid-transition redirects from the angles on screen, for the full duration. The superseded target is never visited.
- No transition happens when the view first binds its nodes on load (it renders the current pose, including one commanded before load), after a remount, or when the duration is `0`.
- **Snap commands.** Pass `{ transition: "none" }` to `setPose`, `setJointAngle` or `applyState` (facade or controller) and the rendered arm lands on the commanded target at once, ending any transition in flight — even when the target has not changed. Leaving the option out, or passing `"transition"`, transitions as usual; any other value is treated as the default. Use it for direct manipulation such as a joint slider; a slide change should transition. The choice is per command, so there is no mode to switch back.
- Interpolation exists only in the view. `getState()` and the last VM delivered for a command always report the commanded target, so persistence and host UI never capture a mid-transition pose. The duration is not part of `ABB6700State`.

**Paths and the path stop.** A path is a list of segments: a pose, a travel time and an optional dwell. Each segment plays as a pose transition over its own travel time, so the transition duration does not apply to it. The segment's pose is committed to the VM and `getState()` as the segment starts, and the first segment starts from the angles on screen. The one case where motion writes a pose is a path stop (`stopPath`). The view slows the arm along its current segment from the speed it has on screen and brings it to rest within the stop duration (default 400 ms), never past the segment's pose. The pose it rests at is committed and the rest of the path is dropped. An arm in a dwell, or at the start of a segment, stops where it is. A path is not part of `ABB6700State`.

> **Migrating from 1.x:** `facade.getPose()` was removed in 2.0.0. Use `getState()` for the authored configuration, `onViewModel()` for live values, or the standalone `getPose` controller (see API Reference below) to read a pose without a facade.

### Events

The ABB 6700 emits three events, all about a path. Each is payload-free: the callback receives no arguments. Read the segment index from the view model's `path`.

| Event                | Fires when                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `pathSegmentReached` | The rendered arm arrives at a segment's pose. Once per segment, in order. `vm.path` names the segment, in its `"dwelling"` phase.        |
| `pathCompleted`      | The last segment has been reached and its dwell has ended. `pathSegmentReached` fires first for the last segment. `vm.path` is `undefined` and the last pose stays committed. |
| `pathStopped`        | A path stop has brought the arm to rest and the rest pose is committed. `vm.path` is `undefined`.                                        |

Subscribe with `facade.onEvent(name, cb)`. A host with no facade uses the subscription controllers instead: `onPathSegmentReached(id, appObjects, cb)`, `onPathCompleted(id, appObjects, cb)` and `onPathStopped(id, appObjects, cb)`. Each returns an unsubscribe function that stops further calls. For an id with no arm behind it, a controller submits a warning and returns a no-op unsubscribe function. An unknown event name passed to `onEvent` still returns a valid no-op unsubscribe function.

A callback that throws is reported through `submitError`: the other callbacks still run and the path carries on. A path cancelled by a pose command, or replaced by a new `playPath`, fires no event. A pose command issued from inside an `onViewModel` callback while the component commits a segment wins over that commit. After a stop request, neither `pathSegmentReached` nor `pathCompleted` fires. The events fire only while the arm's view renders (see *Known limitations*). Drive other UI from `onViewModel` / `getState`.

### Reactive view model (`ABB6700VM`)

`onViewModel(cb)` emits the current VM immediately, then on every change, and returns an unsubscribe function. Fields: `j1`–`j6` (`Angle`), `stabilizerAngle` (`Angle`), `stabilizerExtension` (`number`), `transitionDurationMs` (`number`), `snapCount` (`number`, incremented by each snap command; the view snaps when it changes), `path` (`ABB6700PathVM | undefined`, the path in progress). The VM carries the commanded joint angles, never the interpolated angles the view renders mid-transition, and is distinct from the saved `ABB6700State`. A single pose command can emit several VMs (joints are written one at a time and the stabilizer is derived after J2), so intermediate VMs may show a partial pose; the last VM delivered for the command carries the full target.

`path` (`ABB6700PathVM`) has `playCount` (which `playPath` this is; it increases with each call), `segmentIndex`, `phase`, `durationMs` (the current segment's travel time), `dwellMs` (the current segment's dwell; `0` when it has none) and `stopDurationMs` (the stop's duration while the phase is `"stopping"`, else `0`). `phase` is `"moving"` from the time a segment starts until the arm reaches its pose, `"dwelling"` from then until the dwell ends, and `"stopping"` from a stop request until the arm is at rest. While stopping, the committed pose stays the current segment's. `path` is `undefined` when no path is in progress: before the first path, after `pathCompleted` or `pathStopped`, and after a pose command cancels a path. During a path, no VM carries angles between two segment poses.

### State snapshot (`ABB6700State`)

`getState()` / `applyState()` capture the authored configuration: `version` plus the six joint angles **in degrees**. The state schema `version` starts at `1` (`ABB_6700_STATE_VERSION`). `applyState` is **best-effort forward-compatible** (ADR-0005, superseding ADR-0003) — a snapshot is always applied, whatever its `version`: never rejected, never a no-op. Each joint is resolved independently; a joint the snapshot omits falls back to that joint's entity default rather than producing an invalid angle. Derived stabilizer state is not stored; it is recomputed from J2 on apply.

The facade's `getState`/`applyState` are one-line delegations to the standalone `getABB6700State` / `applyABB6700State` controllers, which take and restore the same snapshot without a facade, so the two seams cannot drift.

### Variants & objectId interaction map

`load(variant?)` accepts an optional variant string; an omitted or unrecognized variant loads the default asset. Any GLB honoring the objectId interaction map can serve as a variant. The map: `joint_1`–`joint_6` (revolute joints), `stabilizer_joint_1` (stabilizer rotation), `stabilizer_joint_2` (stabilizer prismatic extension), `eot` (end-of-arm tooling mount).

---

## API Reference

### Public API (use these)

For Host integration, prefer `ABB6700Facade`. `createBabylonABB6700` remains the convenience entry point when you want a fully-wired `AppObject` plus Babylon view in one call.

| Function                    | Signature                                                                           | Description                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `ABB6700Facade`             | `new (id: string, appObjects: AppObjectRepo)`                                       | **Recommended Host seam.** Headless constructor; `load()` attaches Babylon.    |
| `createBabylonABB6700`      | `(id: string, appObjects: AppObjectRepo) → Promise<AppObject \| undefined>`         | **Primary entry point.** Create instance with full domain stack + Babylon view. |
| `createABB6700`             | `(id: string, appObjects: AppObjectRepo) → AppObject \| undefined`                  | Create domain-only instance (no view). Use when you will attach a custom view.  |
| `setJointAngle`             | `(id: string, joint: ABB6700Joint, angle: Angle, appObjects: AppObjectRepo, options?: ABB6700TransitionOption) → void` | Set a single joint angle. `{ transition: "none" }` snaps. |
| `setPose`                   | `(id: string, pose: ABB6700Pose, appObjects: AppObjectRepo, options?: ABB6700TransitionOption) → void` | Set all 6 joints at once. `{ transition: "none" }` snaps. |
| `setTransitionDuration`     | `(id: string, ms: number, appObjects: AppObjectRepo) → void`                        | Set the pose transition duration in ms (`0` disables). Rejects negative or non-finite values with a warning; an unknown id submits a warning. |
| `getPose`                   | `(id: string, appObjects: AppObjectRepo) → ABB6700Pose \| undefined`                | Read the current pose.                                                          |
| `getABB6700State`           | `(id: string, appObjects: AppObjectRepo, version: number) → ABB6700State`           | Snapshot the authored configuration without a facade. An unknown id submits a warning and resolves to the default state rather than throwing. |
| `applyABB6700State`         | `(id: string, appObjects: AppObjectRepo, state: ABB6700State, options?: ABB6700TransitionOption) → void` | Restore a saved snapshot without a facade. Best-effort forward-compatible (ADR-0005); an unknown id submits a warning and leaves the domain untouched. |
| `playPath`                  | `(id: string, segments: readonly ABB6700PathSegment[], appObjects: AppObjectRepo) → void` | Play a path without a facade. Rejects an empty list, a segment with no pose, or a negative or non-finite travel time or dwell, whole with a warning; an unknown id submits a warning. |
| `stopPath`                  | `(id: string, appObjects: AppObjectRepo, options?: ABB6700StopPathOptions) → void`  | Stop the path in flight. Does nothing with no path in progress; an unknown id submits a warning. |
| `onPathSegmentReached`      | `(id: string, appObjects: AppObjectRepo, cb: () => void) → () => void`              | Subscribe to the arm reaching a segment's pose. Returns an unsubscribe fn; an unknown id submits a warning and returns a no-op. |
| `onPathCompleted`           | `(id: string, appObjects: AppObjectRepo, cb: () => void) → () => void`              | Subscribe to a path completing (last segment reached, dwell ended). Returns an unsubscribe fn. |
| `onPathStopped`             | `(id: string, appObjects: AppObjectRepo, cb: () => void) → () => void`              | Subscribe to a stopped arm coming to rest. Returns an unsubscribe fn.           |
| `makeABB6700FeatureFactory` | `(appObjects: AppObjectRepo) → ABB6700FeatureFactory`                               | Register the feature factory during domain setup.                               |
| `aBB6700PMAdapter`          | `PmAdapter<ABB6700VM>`                                                              | Subscribe/unsubscribe to view model changes for custom UI.                      |

### Accessors (read after creation)

Static `.get()` helpers used to retrieve a view from an already-created instance.

| Accessor                            | Returns                           | Description                                                                                       |
| ----------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `ABB6700BabylonView.get(appObject)` | `ABB6700BabylonView \| undefined` | Retrieve the Babylon view to access `eotTransformNode`, `rootTransformNode`, `shadowCasters`, `nodesByObjectId`, and `highlightGroupsByObjectId`. |

### Internal / Advanced (do not call directly)

> **Warning:** These are exported for extensibility and testing only. They are created automatically by the composition entry point. Calling them directly without first creating the full domain stack will produce a partially-initialized object whose behavior silently does not work.

| Function                                  | Description                                                                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `makeABB6700BabylonView(appObject)`       | Creates the Babylon view only — no Entity, Use Cases, or PM. The robot will render but joints will not respond to controller calls. |
| `setupABB6700InstanceFactory(appObjects)` | Wires instance-level factories. Called automatically during `setupDomain()`.                                                        |

### Types

```typescript
/** All 6 joint angles */
interface ABB6700Pose {
  j1: Angle;
  j2: Angle;
  j3: Angle;
  j4: Angle;
  j5: Angle;
  j6: Angle;
}

/** Joint identifier */
type ABB6700Joint = "j1" | "j2" | "j3" | "j4" | "j5" | "j6";

/** Per-command rendering option (added in 2.2.0). Only "none" snaps. */
type ABB6700TransitionOption = {
  transition?: "none" | "transition";
};

/** Serializable facade state */
type ABB6700State = {
  version: number;
  j1: number;
  j2: number;
  j3: number;
  j4: number;
  j5: number;
  j6: number;
};

/** View model emitted by the PM adapter */
interface ABB6700VM {
  j1: Angle;
  j2: Angle;
  j3: Angle;
  j4: Angle;
  j5: Angle;
  j6: Angle;
  stabilizerAngle: Angle;
  stabilizerExtension: number;
  /** Pose transition duration the view uses, in ms (added in 2.1.0) */
  transitionDurationMs: number;
  /** Incremented by each snap command; the view snaps when it changes (added in 2.2.0) */
  snapCount: number;
  /** The path in progress, or undefined when none is. Required: VM literals must set it (added in 2.3.0) */
  path: ABB6700PathVM | undefined;
}

/** One step of a path: a pose, the travel time to it, an optional dwell at it (added in 2.3.0) */
interface ABB6700PathSegment {
  pose: ABB6700Pose;
  durationMs: number;
  dwellMs?: number;
}

type ABB6700PathPhase = "moving" | "dwelling" | "stopping";

/** The path in progress, as carried by the VM (added in 2.3.0) */
interface ABB6700PathVM {
  playCount: number;
  segmentIndex: number;
  phase: ABB6700PathPhase;
  /** The current segment's travel time */
  durationMs: number;
  /** The current segment's dwell; 0 when it has none */
  dwellMs: number;
  /** The stop's duration while phase is "stopping", else 0 */
  stopDurationMs: number;
}

/** Options for stopPath. Default duration: ABB_6700_DEFAULT_STOP_DURATION_MS (400) (added in 2.3.0) */
type ABB6700StopPathOptions = { durationMs?: number };

/** Payload-free events for ABB6700Facade.onEvent (empty before 2.3.0) */
type ABB6700Events = {
  pathSegmentReached: () => void;
  pathCompleted: () => void;
  pathStopped: () => void;
};
```

---

## 3D View

### Asset

| Asset ID                               | File           |
| -------------------------------------- | -------------- |
| `5306be7c-5786-4e20-83ee-fe82471c5651` | `abb_6700.glb` |

The GLB is loaded via the VIVED asset pipeline. A scene-scoped cache (`ABB6700AssetCache.ts`) ensures the instances in one Babylon scene share a single load, and that a remounted app — a new engine and scene in the same page — loads afresh instead of receiving a container bound to the previous, disposed scene.

### Exposed Transform Nodes

After the view is loaded, it exposes scene integration references:

| Property            | Description                                                                      |
| ------------------- | -------------------------------------------------------------------------------- |
| `eotTransformNode`  | End-of-Arm Tooling node — attach grippers, welders, or tools to the wrist.       |
| `rootTransformNode` | Root node — position or parent the robot within your scene hierarchy.            |
| `shadowCasters`     | All robot meshes (`AbstractMesh[]`) ready for `ShadowGenerator.addShadowCaster`. |

`eotTransformNode` and `rootTransformNode` return `undefined` before `load()` completes.
`shadowCasters` returns an empty array before meshes are bound.

### Host-side highlight integration

`ABB6700BabylonView` is presentation-free: it does not render hover/select/hint state and does not perform pointer detection. Instead it exposes the semantic data a Host needs:

- `ABB6700_WHOLE_ARM_HIGHLIGHT_GROUP = "abb_6700"` — maps to all visible robot meshes in `highlightGroupsByObjectId`
- `nodesByObjectId` — resolved nodes for `joint_1` through `joint_6`, `stabilizer_joint_1`, `stabilizer_joint_2`, and `eot`

The Host should own any `SelectionOutlineLayer`, highlighting, or picking logic.

```typescript
const view = ABB6700BabylonView.get(appObject);

// Attach a gripper to the robot's wrist
gripperMesh.parent = view.eotTransformNode;

// Position the robot in the scene
view.rootTransformNode.position = new Vector3(2, 0, 0);
```

---

## Recipes

### Set a target pose

```typescript
import { Angle } from "@vived/core";
import { setPose } from "@vived/component-abb-6700";

const targetPose = {
  j1: Angle.FromDegrees(90),
  j2: Angle.FromDegrees(-30),
  j3: Angle.FromDegrees(15),
  j4: Angle.FromDegrees(0),
  j5: Angle.FromDegrees(45),
  j6: Angle.FromDegrees(0),
};

setPose("robot-1", targetPose, appObjects);
```

### Tune or disable pose transitions

```typescript
const facade = new ABB6700Facade("robot-1", appObjects);

// Slower, more deliberate motion between slides
facade.setTransitionDuration(2000);

// Never transition this arm at all
facade.setTransitionDuration(0);
```

The duration is per instance and is not saved in `ABB6700State`, so set it wherever the host configures the arm. For a one-off instant move, use a snap command instead of toggling the duration.

### Snap while dragging a joint slider

```typescript
// Direct manipulation: each drag tick lands exactly where the slider is
facade.setJointAngle("j2", Angle.FromDegrees(sliderValue), { transition: "none" });

// A slide change still transitions
facade.applyState(slideState);

// Restore a slide instantly, e.g. when an editor opens it
facade.applyState(slideState, { transition: "none" });
```

The option is per command: nothing needs resetting after the drag ends. The standalone `setPose`, `setJointAngle` and `applyABB6700State` controllers take the same trailing option.

### Play a weld program as a path

A host with no facade plays its weld program as a path, through the flat controllers. Fire the weld gun in the `pathSegmentReached` callback: the arm then holds still for the segment's 1000 ms dwell.

```typescript
import { Angle } from "@vived/core";
import {
  aBB6700PMAdapter,
  onPathCompleted,
  onPathSegmentReached,
  playPath,
  type ABB6700PathSegment,
  type ABB6700Pose,
  type ABB6700VM,
} from "@vived/component-abb-6700";

const pose = (j1: number, j2: number, j3: number): ABB6700Pose => ({
  j1: Angle.FromDegrees(j1),
  j2: Angle.FromDegrees(j2),
  j3: Angle.FromDegrees(j3),
  j4: Angle.FromDegrees(0),
  j5: Angle.FromDegrees(0),
  j6: Angle.FromDegrees(0),
});

// Segment 0 approaches, segments 1 and 2 are weld spots, segment 3 retracts
const segments: ABB6700PathSegment[] = [
  { pose: pose(10, -30, 20), durationMs: 900 },
  { pose: pose(30, -45, 25), durationMs: 1200, dwellMs: 1000 },
  { pose: pose(33, -45, 25), durationMs: 400, dwellMs: 1000 },
  { pose: pose(0, 0, 0), durationMs: 1500 },
];
const weldSegments = [1, 2];

// The events carry no payload, so keep the latest view model and read the segment from it
let latest: ABB6700VM | undefined;
const keepLatest = (vm: ABB6700VM) => {
  latest = vm;
};
aBB6700PMAdapter.subscribe("robot-1", appObjects, keepLatest);

const offReached = onPathSegmentReached("robot-1", appObjects, () => {
  // vm.path names the segment reached, in its "dwelling" phase
  if (weldSegments.includes(latest?.path?.segmentIndex ?? -1)) {
    fireWeldGun(1000); // the host's own tooling
  }
});

const offCompleted = onPathCompleted("robot-1", appObjects, () => {
  offReached();
  offCompleted();
  aBB6700PMAdapter.unsubscribe("robot-1", appObjects, keepLatest);
  startNextStep(); // the host's own sequencer
});

playPath("robot-1", segments, appObjects);
```

A host that plays one path at a time can skip the view model and count callbacks instead: the first call is segment 0, the second is segment 1, and so on.

With the facade, the same path is a few lines:

```typescript
const robot = new ABB6700Facade("robot-1", appObjects);
await robot.load(); // a path advances only while the view renders

let latest: ABB6700VM | undefined;
robot.onViewModel((vm) => {
  latest = vm;
});
robot.onEvent("pathSegmentReached", () => {
  if (weldSegments.includes(latest?.path?.segmentIndex ?? -1)) fireWeldGun(1000);
});
robot.onEvent("pathCompleted", startNextStep);
robot.playPath(segments);
```

`playPath` commits the first segment's pose at once, and each later segment's pose as that segment starts, so `getState()` follows the path. A path requested before `load()` waits on its first segment and plays once the view loads. A new `playPath`, or any pose command, cancels the path in progress with no event.

### Stop a path in flight

```typescript
import {
  ABB_6700_STATE_VERSION,
  getABB6700State,
  onPathStopped,
  stopPath,
} from "@vived/component-abb-6700";

// Subscribe first, then ask for the stop
const offStopped = onPathStopped("robot-1", appObjects, () => {
  offStopped();
  // The rest pose is committed before this fires
  const rest = getABB6700State("robot-1", appObjects, ABB_6700_STATE_VERSION);
  recordStoppedAt(rest); // the host's own handling; rest.j1 … rest.j6 are in degrees
});

stopPath("robot-1", appObjects, { durationMs: 250 }); // omit the options for the default 400 ms
```

With the facade:

```typescript
const offStopped = robot.onEvent("pathStopped", () => {
  offStopped();
  recordStoppedAt(robot.getState());
});
robot.stopPath({ durationMs: 250 });
```

From the stop request until the arm is at rest, `vm.path.phase` is `"stopping"` and the committed pose is still the current segment's. When `pathStopped` fires, the rest pose is committed and `vm.path` is `undefined`. With no path in progress, `stopPath` does nothing and `pathStopped` does not fire, so do not wait for it. A second `stopPath` while the arm is stopping changes nothing.

A host that needs the default stop time, for example to time its own display to the stop, imports `ABB_6700_DEFAULT_STOP_DURATION_MS` (`400`) instead of hard-coding the number.

`stopPath` always slows the arm mid-motion. "Finish the current segment, then stop" is the host's to do: the component does not queue segments, so the host plays its weld program as short paths and simply does not play the next one.

### Persist and restore authored state (facade)

```typescript
import { ABB6700Facade } from "@vived/component-abb-6700";

const robot = new ABB6700Facade("robot-1", appObjects);

// Snapshot the authored configuration (version + six joint angles, in degrees)
const saved = robot.getState();

// ...later, or in a fresh session after re-creating the facade...
robot.applyState(saved); // safe to call before load()
```

Both methods delegate to the standalone `getABB6700State` / `applyABB6700State` controllers, which take and restore the same snapshot without a facade.

### Mount the robot in a host scene

```typescript
import {
  createBabylonABB6700,
  ABB6700BabylonView,
} from "@vived/component-abb-6700";
import { Vector3 } from "@babylonjs/core";

const appObject = await createBabylonABB6700("robot-1", appObjects);
const view = ABB6700BabylonView.get(appObject);

// Parent the robot's root to a scene node (e.g. a workstation platform)
view.rootTransformNode.parent = workstationNode;

// Offset within the parent
view.rootTransformNode.position = new Vector3(0, 0.5, 0);
```

### Subscribe to joint angle changes

```typescript
import { aBB6700PMAdapter } from "@vived/component-abb-6700";

const handler = (vm) => {
  document.getElementById("j1-display").textContent = vm.j1.degrees.toFixed(1);
};

aBB6700PMAdapter.subscribe("robot-1", appObjects, handler);

// Later, to clean up:
aBB6700PMAdapter.unsubscribe("robot-1", appObjects, handler);
```

### Attach tooling to the end-of-arm

```typescript
import {
  createBabylonABB6700,
  ABB6700BabylonView,
} from "@vived/component-abb-6700";
import { Vector3 } from "@babylonjs/core";

const appObject = await createBabylonABB6700("robot-1", appObjects);
const view = ABB6700BabylonView.get(appObject);

// Parent any mesh or transform node to the EOT node.
// It will follow the robot's wrist as joints move.
gripperMesh.parent = view.eotTransformNode;

// Offset the tool from the wrist if needed
gripperMesh.position = new Vector3(0, 0, 0.1);
```

### Add robot meshes as shadow casters

```typescript
import {
  createBabylonABB6700,
  ABB6700BabylonView,
} from "@vived/component-abb-6700";

const appObject = await createBabylonABB6700("robot-1", appObjects);
const view = ABB6700BabylonView.get(appObject);

for (const mesh of view.shadowCasters) {
  shadowGenerator.addShadowCaster(mesh);
}
```

---

## Common Mistakes

### ❌ Calling `makeABB6700BabylonView` directly instead of `createBabylonABB6700`

```typescript
// ❌ WRONG — creates only the view, no domain stack
const appObject = appObjects.getOrCreate("robot-1");
await makeABB6700BabylonView(appObject);
// The robot renders but setJointAngle / setPose silently do nothing
```

```typescript
// ✅ CORRECT — creates the full domain stack + view
const appObject = await createBabylonABB6700("robot-1", appObjects);
```

### ❌ Guessing AppObject IDs to grab an existing instance

```typescript
// ❌ WRONG — constructing an ID to find a pre-existing AppObject
const ao = appObjects.get("robot-1");
const view = ABB6700BabylonView.get(ao);
// If the component wasn't created through the entry point, the domain stack is missing
```

```typescript
// ✅ CORRECT — always create through the entry point, then use the returned AppObject
const ao = await createBabylonABB6700("robot-1", appObjects);
const view = ABB6700BabylonView.get(ao);
```

### ❌ Accessing view internals instead of using the `.get()` accessor

```typescript
// ❌ WRONG — reaching into internals
const view = appObject.getComponent("ABB6700BabylonView");
```

```typescript
// ✅ CORRECT — use the static accessor
const view = ABB6700BabylonView.get(appObject);
```

### ❌ Reading the segment from the event callback's arguments

```typescript
// ❌ WRONG — the path events are payload-free; the callback receives no arguments
robot.onEvent("pathSegmentReached", (segmentIndex: number) => {
  fireWeldGun(segmentIndex); // segmentIndex is undefined
});
```

```typescript
// ✅ CORRECT — read where the path is from the latest view model
let latest: ABB6700VM | undefined;
robot.onViewModel((vm) => {
  latest = vm;
});
robot.onEvent("pathSegmentReached", () => {
  fireWeldGun(latest?.path?.segmentIndex);
});
```

---

## Constraints & Defaults

### Default state

All joints initialize to `0` degrees. The stabilizer angle and extension are computed automatically from J2 and also start at `0`. The pose transition duration defaults to `1000` ms (`ABB_6700_DEFAULT_TRANSITION_DURATION_MS`). No path is in progress, and a path stop takes `400` ms unless the request says otherwise (`ABB_6700_DEFAULT_STOP_DURATION_MS`).

### Automatic behaviors

The stabilizer connecting J1 and J2 is computed automatically — developers do not need to set it. When J2 changes, the stabilizer angle and prismatic extension update to match the physical linkage geometry.

The rendered arm eases to each newly commanded pose over the transition duration, unless the command asks for a snap (see *Pose transitions*). The stabilizer is recomputed every frame from the interpolated J2, so the linkage stays attached mid-motion.

While a path plays, the Babylon view is the clock (ADR-0007). It renders each segment over its travel time, counts the dwell, and tells the domain when the arm arrives and when a dwell ends. The domain then commits the next segment's pose and fires the events. The stabilizer is recomputed every frame during a segment and during a path stop.

### Known limitations

- A path advances only while the arm's view renders. Before `load()`, in a hidden tab, or while the scene's render loop is stopped, a path waits on its current segment. Its pose is committed, so the VM and `getState()` are correct, but `pathSegmentReached` and `pathCompleted` do not fire until the view renders. Before `load()` a path waits on its first segment. When the view attaches, the arm appears on that pose, the segment counts as reached, and the path plays on.
- A path stop completes only when the view brings the arm to rest. With no rendering view, `vm.path.phase` stays `"stopping"` and `pathStopped` does not fire until the view loads and renders. A pose command ends the stop.
- `playPath` checks travel times and dwells, not the angles in a segment's pose. As with `setPose`, any angle is accepted.
- Joint angle limits are not currently enforced by the component. Any angle value is accepted.
- The stabilizer computation is driven only by J2; other joints do not affect it.
- The EOT node ID in the GLB must be `"eot"` (lowercase) for the view to detect it. If missing, `eotTransformNode` returns `undefined`.
- The component intentionally owns no pointer detection or highlight rendering; Hosts should use `highlightGroupsByObjectId` and `nodesByObjectId` instead.

---

## Repository

| Field          | Value                             |
| -------------- | --------------------------------- |
| Package              | `@vived/component-abb-6700`       |
| GitHub               | `vivedlearning/component-abb6700` |
| Version              | 2.3.0                             |
| Interface version    | 1                                 |
| State schema version | 1 (`ABB6700State.version`)        |
| Multi-instance       | Yes                               |

### Full export list

#### Public API (use these)

| Category    | Exports                                                |
| ----------- | ------------------------------------------------------ |
| Entry point | `ABB6700Facade`, `createBabylonABB6700`                |
| Controllers | `createABB6700`, `setJointAngle`, `setPose`, `setTransitionDuration`, `getPose`, `getABB6700State`, `applyABB6700State`, `playPath`, `stopPath`, `onPathSegmentReached`, `onPathCompleted`, `onPathStopped` |
| Adapter     | `aBB6700PMAdapter`                                     |
| Factory     | `makeABB6700FeatureFactory`                            |

#### Accessors (read after creation)

| Category | Exports                                                            |
| -------- | ------------------------------------------------------------------ |
| View     | `ABB6700BabylonView` (`.get()`), `ABB6700_WHOLE_ARM_HIGHLIGHT_GROUP`               |
| Types    | `ABB6700Pose`, `ABB6700Joint`, `ABB6700TransitionOption`, `ABB6700VM`, `ABB6700PathVM`, `ABB6700PathSegment`, `ABB6700PathPhase`, `ABB6700StopPathOptions`, `ABB6700State`, `ABB6700Events`, `ABB6700EntityFactory`, `SmartComponent` |
| Constants | `ABB_6700_STATE_VERSION`, `ABB_6700_DEFAULT_TRANSITION_DURATION_MS`, `ABB_6700_DEFAULT_STOP_DURATION_MS` |

#### Internal / Advanced (extensibility/testing only — not for normal use)

| Category     | Exports                                                                |
| ------------ | ---------------------------------------------------------------------- |
| View factory | `makeABB6700BabylonView`                                               |
| Factory      | `ABB6700FeatureFactory`, `setupABB6700InstanceFactory`                 |
| Entities     | `ABB6700Entity`, `makeABB6700Entity`, `ABB6700Repo`, `makeABB6700Repo`, `ABB6700PathProgress` (type) |
| Use Cases    | `SetJointAngleUC`, `makeSetJointAngleUC`, `SetPoseUC`, `makeSetPoseUC`, `SetTransitionDurationUC`, `makeSetTransitionDurationUC`, `PlayPathUC`, `makePlayPathUC`, `StopPathUC`, `makeStopPathUC` |
| PMs          | `ABB6700PM`, `makeABB6700PM`                                           |
| Mocks        | `MockABB6700PM`, `MockSetJointAngleUC`, `MockSetPoseUC`, `MockSetTransitionDurationUC`, `MockPlayPathUC`, `MockStopPathUC` |
| Config       | `componentConfig`                                                      |
