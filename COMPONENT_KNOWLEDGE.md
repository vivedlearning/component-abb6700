# ABB 6700 — VIVED Smart Component

## Summary

The ABB 6700 is a 6-axis industrial robot arm smart component. It provides a fully rigged 3D model with 6 degrees of freedom (joints J1–J6) and an automatically-computed stabilizer linkage. Developers can set individual joint angles or full poses through simple controller functions. Use this component when your slide app needs an articulated robot arm for industrial simulation, robotics education, or manufacturing visualization.

- **Package**: `@vived/component-abb-6700`
- **Version**: 1.4.0
- **Interface version**: 1 (`SmartComponent` contract implemented by `ABB6700Facade`)
- **GitHub**: `vivedlearning/component-abb6700`

---

## Discovery

- **Category**: Robotics / Industrial Equipment
- **Tags**: robot arm, 6-DOF, articulated robot, industrial robot, ABB, manufacturing, joints, pose, kinematics
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
| `onEvent`          | `(event: string, cb: (...args: never[]) => void) => () => void` | Subscribe to a named event; returns an unsubscribe fn. The ABB 6700 emits **no events** — this is a contract-complete no-op. |
| `onViewModel`      | `(cb: (vm: ABB6700VM) => void) => () => void`                  | Subscribe to the reactive view model; returns an unsubscribe fn.                                |
| `load`             | `(variant?: string) => Promise<void>`                         | Attaches the Babylon view. The only async member.                                              |
| `destroy`          | `() => void`                                                  | Tears down the instance and releases resources.                                                |
| `getState`         | `() => ABB6700State`                                          | Snapshot the authored configuration.                                                           |
| `applyState`       | `(state: ABB6700State) => void`                              | Restore a snapshot (best-effort forward-compatible).                                            |

### Lifecycle (two-phase)

1. **Construction** (sync) — `new ABB6700Facade(id, appObjects)` wires the full domain idempotently (constructing for an existing `id` returns a handle to the existing instance, never a duplicate). No Babylon context is required, and importing or constructing the facade pulls in no Babylon code.
2. **Load** (async) — `await facade.load()` attaches the Babylon view. All commands, `getState`, and `applyState` work *before* `load()` is called.

### Command methods

| Method          | Signature                                          | Description                        |
| --------------- | -------------------------------------------------- | ---------------------------------- |
| `setPose`       | `(pose: ABB6700Pose) => void`                      | Set all six joints atomically.     |
| `setJointAngle` | `(joint: ABB6700Joint, angle: Angle) => void`      | Set a single joint.                |

Commands return `void` — none can be blocked by a domain rule. To read state, use `getState()` or `onViewModel` — the facade has no separate pose accessor.

> **Migrating from 1.x:** `facade.getPose()` was removed in 2.0.0. Use `getState()` for the authored configuration, `onViewModel()` for live values, or the standalone `getPose` controller (see API Reference below) to read a pose without a facade.

### Events

The ABB 6700 emits no events. `onEvent` exists only to satisfy the contract and always returns a valid no-op unsubscribe function. Drive UI from `onViewModel` / `getState` instead.

### Reactive view model (`ABB6700VM`)

`onViewModel(cb)` emits the current VM immediately, then on every change, and returns an unsubscribe function. Fields: `j1`–`j6` (`Angle`), `stabilizerAngle` (`Angle`), `stabilizerExtension` (`number`). The VM is the live render picture — distinct from the saved `ABB6700State`.

### State snapshot (`ABB6700State`)

`getState()` / `applyState()` capture the authored configuration: `version` plus the six joint angles **in degrees**. The state schema `version` starts at `1` (`ABB_6700_STATE_VERSION`). `applyState` is **best-effort forward-compatible** (ADR-0005, superseding ADR-0003) — a snapshot is always applied, whatever its `version`: never rejected, never a no-op. Each joint is resolved independently; a joint the snapshot omits falls back to that joint's entity default rather than producing an invalid angle. Derived stabilizer state is not stored; it is recomputed from J2 on apply.

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
| `setJointAngle`             | `(id: string, joint: ABB6700Joint, angle: Angle, appObjects: AppObjectRepo) → void` | Set a single joint angle.                                                       |
| `setPose`                   | `(id: string, pose: ABB6700Pose, appObjects: AppObjectRepo) → void`                 | Set all 6 joints at once.                                                       |
| `getPose`                   | `(id: string, appObjects: AppObjectRepo) → ABB6700Pose \| undefined`                | Read the current pose.                                                          |
| `getABB6700State`           | `(id: string, appObjects: AppObjectRepo, version: number) → ABB6700State`           | Snapshot the authored configuration without a facade. An unknown id resolves to the default state rather than throwing. |
| `applyABB6700State`         | `(id: string, appObjects: AppObjectRepo, state: ABB6700State) → void`               | Restore a saved snapshot without a facade. Best-effort forward-compatible (ADR-0005); an unknown id submits a warning and leaves the domain untouched. |
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
}
```

---

## 3D View

### Asset

| Asset ID                               | File           |
| -------------------------------------- | -------------- |
| `5306be7c-5786-4e20-83ee-fe82471c5651` | `abb_6700.glb` |

The GLB is loaded via the VIVED asset pipeline. An internal cache ensures multiple instances share the same loaded asset data.

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

### Persist and restore authored state (facade)

```typescript
import { ABB6700Facade } from "@vived/component-abb-6700";

const robot = new ABB6700Facade("robot-1", appObjects);

// Snapshot the authored configuration (version + six joint angles, in degrees)
const saved = robot.getState();

// ...later, or in a fresh session after re-creating the facade...
robot.applyState(saved); // safe to call before load()
```

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

---

## Constraints & Defaults

### Default state

All joints initialize to `0` degrees. The stabilizer angle and extension are computed automatically from J2 and also start at `0`.

### Automatic behaviors

The stabilizer connecting J1 and J2 is computed automatically — developers do not need to set it. When J2 changes, the stabilizer angle and prismatic extension update to match the physical linkage geometry.

### Known limitations

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
| Version              | 1.4.0                             |
| Interface version    | 1                                 |
| State schema version | 1 (`ABB6700State.version`)        |
| Multi-instance       | Yes                               |

### Full export list

#### Public API (use these)

| Category    | Exports                                                |
| ----------- | ------------------------------------------------------ |
| Entry point | `ABB6700Facade`, `createBabylonABB6700`                |
| Controllers | `createABB6700`, `setJointAngle`, `setPose`, `getPose`, `getABB6700State`, `applyABB6700State` |
| Adapter     | `aBB6700PMAdapter`                                     |
| Factory     | `makeABB6700FeatureFactory`                            |

#### Accessors (read after creation)

| Category | Exports                                                            |
| -------- | ------------------------------------------------------------------ |
| View     | `ABB6700BabylonView` (`.get()`), `ABB6700_WHOLE_ARM_HIGHLIGHT_GROUP`               |
| Types    | `ABB6700Pose`, `ABB6700Joint`, `ABB6700VM`, `ABB6700State`, `ABB6700EntityFactory`, `SmartComponent` |

#### Internal / Advanced (extensibility/testing only — not for normal use)

| Category     | Exports                                                                |
| ------------ | ---------------------------------------------------------------------- |
| View factory | `makeABB6700BabylonView`                                               |
| Factory      | `ABB6700FeatureFactory`, `setupABB6700InstanceFactory`                 |
| Entities     | `ABB6700Entity`, `makeABB6700Entity`, `ABB6700Repo`, `makeABB6700Repo` |
| Use Cases    | `SetJointAngleUC`, `makeSetJointAngleUC`, `SetPoseUC`, `makeSetPoseUC` |
| PMs          | `ABB6700PM`, `makeABB6700PM`                                           |
| Mocks        | `MockABB6700PM`, `MockSetJointAngleUC`, `MockSetPoseUC`                |
| Config       | `componentConfig`                                                      |
