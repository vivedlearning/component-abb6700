# ABB 6700 — VIVED Smart Component

## Summary

The ABB 6700 is a 6-axis industrial robot arm smart component. It provides a fully rigged 3D model with 6 degrees of freedom (joints J1–J6) and an automatically-computed stabilizer linkage. Developers can set individual joint angles or full poses through simple controller functions. Use this component when your slide app needs an articulated robot arm for industrial simulation, robotics education, or manufacturing visualization.

- **Package**: `@vived/component-abb-6700`
- **Version**: 1.1.0
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
import { createABB6700, ABB6700BabylonView } from "@vived/component-abb-6700";

const appObject = createABB6700("robot-1", appObjects);
const view = ABB6700BabylonView.get(appObject);
await view.load(scene);
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

### Controllers

These are the primary functions for interacting with the component:

| Function        | Signature                                                                           | Description                 |
| --------------- | ----------------------------------------------------------------------------------- | --------------------------- |
| `createABB6700` | `(id: string, appObjects: AppObjectRepo) → AppObject \| undefined`                  | Create a new robot instance |
| `setJointAngle` | `(id: string, joint: ABB6700Joint, angle: Angle, appObjects: AppObjectRepo) → void` | Set a single joint angle    |
| `setPose`       | `(id: string, pose: ABB6700Pose, appObjects: AppObjectRepo) → void`                 | Set all 6 joints at once    |
| `getPose`       | `(id: string, appObjects: AppObjectRepo) → ABB6700Pose \| undefined`                | Read the current pose       |

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
| `8a448235-bed3-4f2b-b934-848c6fad43ed` | `abb_6700.glb` |

The GLB is loaded via the VIVED asset pipeline. An internal cache ensures multiple instances share the same loaded asset data.

### Exposed Transform Nodes

After calling `view.load(scene)`, the view exposes two transform nodes for scene integration:

| Property            | Description                                                                |
| ------------------- | -------------------------------------------------------------------------- |
| `eotTransformNode`  | End-of-Arm Tooling node — attach grippers, welders, or tools to the wrist. |
| `rootTransformNode` | Root node — position or parent the robot within your scene hierarchy.      |

Both return `undefined` before `load()` is called.

```typescript
const view = ABB6700BabylonView.get(appObject);

// Attach a gripper to the robot's wrist
gripperMesh.parent = view.eotTransformNode;

// Position the robot in the scene
view.rootTransformNode.position = new Vector3(2, 0, 0);
```

---

## Recipes

### Animate the robot to a target pose

```typescript
import { Angle } from "@vived/core";
import { setPose } from "@vived/component-abb-6700";

// In your animation loop or on a timer:
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

### Read the current pose

```typescript
import { getPose } from "@vived/component-abb-6700";

const pose = getPose("robot-1", appObjects);
if (pose) {
  console.log("J1:", pose.j1.degrees, "J2:", pose.j2.degrees);
}
```

### Subscribe to joint angle changes (custom UI)

```typescript
import { aBB6700PMAdapter } from "@vived/component-abb-6700";

const handler = (vm) => {
  document.getElementById("j1-display").textContent = vm.j1.degrees.toFixed(1);
};

aBB6700PMAdapter.subscribe("robot-1", appObjects, handler);

// Later, to clean up:
aBB6700PMAdapter.unsubscribe("robot-1", appObjects, handler);
```

### Create multiple robots in a scene

````typescript
import { createABB6700, ABB6700BabylonView } from "@vived/component-abb-6700";
import { Vector3 } from "@babylonjs/core";

for (let i = 0; i < 3; i++) {
  const ao = createABB6700(`robot-${i}`, appObjects);
  const view = ABB6700BabylonView.get(ao);
  await view.load(scene);

### Attach tooling to the end-of-arm

```typescript
import { createABB6700, ABB6700BabylonView } from "@vived/component-abb-6700";

const appObject = createABB6700("robot-1", appObjects);
const view = ABB6700BabylonView.get(appObject);
await view.load(scene);

// Parent any mesh or transform node to the EOT node.
// It will follow the robot's wrist as joints move.
gripperMesh.parent = view.eotTransformNode;

// Offset the tool from the wrist if needed
gripperMesh.position = new Vector3(0, 0, 0.1);
````

view.rootTransformNode.position = new Vector3(i \* 3, 0, 0);
}

```

---

## Constraints & Defaults

### Default state

All joints initialize to `0` degrees. The stabilizer angle and extension are computed automatically from J2 and also start at `0`.

### Stabilizer linkage

The stabilizer connecting J1 and J2 is computed automatically — developers do not need to set it. When J2 changes, the stabilizer angle and prismatic extension update to match the physical linkage geometry.

### Known limitations

- Joint angle limits are not currently enforced by the component. Any angle value is accepted.
- The stabilizer computation is driven only by J2; other joints do not affect it.
- The EOT node ID in the GLB must be `"eot"` (lowercase) for the view to detect it.

---

## Repository

| Field          | Value                             |
| -------------- | --------------------------------- |
| Package        | `@vived/component-abb-6700`       |
| GitHub         | `vivedlearning/component-abb6700` |
| Version        | 1.1.0                             |
| Multi-instance | Yes                               |

### Full export list

| Category    | Exports                                                                             |
| ----------- | ----------------------------------------------------------------------------------- |
| Controllers | `createABB6700`, `setJointAngle`, `setPose`, `getPose`                              |
| Types       | `ABB6700Pose`, `ABB6700Joint`, `ABB6700VM`                                          |
| View        | `ABB6700BabylonView`, `makeABB6700BabylonView`                                      |
| Adapter     | `aBB6700PMAdapter`                                                                  |
| Factory     | `ABB6700FeatureFactory`, `makeABB6700FeatureFactory`, `setupABB6700InstanceFactory` |
| Entities    | `ABB6700Entity`, `makeABB6700Entity`, `ABB6700Repo`, `makeABB6700Repo`              |
| Use Cases   | `SetJointAngleUC`, `makeSetJointAngleUC`, `SetPoseUC`, `makeSetPoseUC`              |
| PMs         | `ABB6700PM`, `makeABB6700PM`                                                        |
| Mocks       | `MockABB6700PM`, `MockSetJointAngleUC`, `MockSetPoseUC`                             |
```
