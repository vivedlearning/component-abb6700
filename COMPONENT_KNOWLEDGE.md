# ABB 6700 — VIVED Smart Component

## Summary

The ABB 6700 is a 6-axis industrial robot arm smart component. It provides a fully rigged 3D model with 6 degrees of freedom (joints J1–J6) and an automatically-computed stabilizer linkage. Developers can set individual joint angles or full poses through simple controller functions. Use this component when your slide app needs an articulated robot arm for industrial simulation, robotics education, or manufacturing visualization.

- **Package**: `@vived/component-abb-6700`
- **Version**: 1.3.1
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

### 3. Create an instance and load the 3D model

```typescript
import { createBabylonABB6700 } from "@vived/component-abb-6700";

// Creates domain instance + Babylon view in one call
const appObject = await createBabylonABB6700("robot-1", appObjects);
```

### 4. Move the robot

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

## API Reference

### Public API (use these)

These are the functions a consumer should call. `createBabylonABB6700` is **THE** designated way to instantiate the component — it creates the full domain stack and Babylon view together.

| Function                    | Signature                                                                           | Description                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `createBabylonABB6700`      | `(id: string, appObjects: AppObjectRepo) → Promise<AppObject \| undefined>`         | **Primary entry point.** Create instance with full domain stack + Babylon view. |
| `createABB6700`             | `(id: string, appObjects: AppObjectRepo) → AppObject \| undefined`                  | Create domain-only instance (no view). Use when you will attach a custom view.  |
| `setJointAngle`             | `(id: string, joint: ABB6700Joint, angle: Angle, appObjects: AppObjectRepo) → void` | Set a single joint angle.                                                       |
| `setPose`                   | `(id: string, pose: ABB6700Pose, appObjects: AppObjectRepo) → void`                 | Set all 6 joints at once.                                                       |
| `getPose`                   | `(id: string, appObjects: AppObjectRepo) → ABB6700Pose \| undefined`                | Read the current pose.                                                          |
| `makeABB6700FeatureFactory` | `(appObjects: AppObjectRepo) → ABB6700FeatureFactory`                               | Register the feature factory during domain setup.                               |
| `aBB6700PMAdapter`          | `PmAdapter<ABB6700VM>`                                                              | Subscribe/unsubscribe to view model changes for custom UI.                      |

### Accessors (read after creation)

Static `.get()` helpers used to retrieve a view from an already-created instance.

| Accessor                            | Returns                           | Description                                                                                       |
| ----------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `ABB6700BabylonView.get(appObject)` | `ABB6700BabylonView \| undefined` | Retrieve the Babylon view to access `eotTransformNode`, `rootTransformNode`, and `shadowCasters`. |

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

---

## Repository

| Field          | Value                             |
| -------------- | --------------------------------- |
| Package        | `@vived/component-abb-6700`       |
| GitHub         | `vivedlearning/component-abb6700` |
| Version        | 1.3.1                             |
| Multi-instance | Yes                               |

### Full export list

#### Public API (use these)

| Category    | Exports                                                |
| ----------- | ------------------------------------------------------ |
| Entry point | `createBabylonABB6700`                                 |
| Controllers | `createABB6700`, `setJointAngle`, `setPose`, `getPose` |
| Adapter     | `aBB6700PMAdapter`                                     |
| Factory     | `makeABB6700FeatureFactory`                            |

#### Accessors (read after creation)

| Category | Exports                                                            |
| -------- | ------------------------------------------------------------------ |
| View     | `ABB6700BabylonView` (`.get()`)                                    |
| Types    | `ABB6700Pose`, `ABB6700Joint`, `ABB6700VM`, `ABB6700EntityFactory` |

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
