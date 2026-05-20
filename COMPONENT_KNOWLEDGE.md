# ABB 6700 — VIVED Smart Component

## Overview

The **ABB 6700** is a VIVED Smart Component (`@vived/component-abb-6700`) that represents a 6-DOF robot arm with rotational joints J1–J6 and a mechanically-coupled stabilizer linkage. Each joint angle is stored and managed independently, enabling precise robotic arm positioning in 3D scenes.

- **Package**: `@vived/component-abb-6700`
- **Version**: 1.1.0
- **GitHub**: `vivedlearning/component-abb6700`
- **Multi-instance**: Yes — multiple instances can coexist in a single scene.
- **Peer dependencies**: `@babylonjs/core ^9.0.0`, `@vived/core ^2.0.0`, `@vived/app ^6.2.0`

---

## Architecture

The component follows **VIVED Clean Architecture** with strict layer separation:

```
Controllers (thin boundary functions — exported from package)
    ↓ calls
Use Cases (SetJointAngleUC, SetPoseUC, CalcStabilizerUC)
    ↓ mutates
Entity (ABB6700Entity) ← source of truth (6 joint angles + stabilizer state)
    ↓ observed by
Presentation Manager (ABB6700PM → emits ABB6700VM)
    ↓ consumed by
Adapter (aBB6700PMAdapter) → View (ABB6700BabylonView)
```

All domain layers (Entities, UCs, PMs, Adapters) are **framework-agnostic** — no React or Babylon imports. Only the View layer imports Babylon.js. The View also imports `@vived/app` for asset loading.

---

## Key Types

```typescript
/** View Model emitted by the PM */
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

/** Pose: all 6 joint angles */
interface ABB6700Pose {
  j1: Angle;
  j2: Angle;
  j3: Angle;
  j4: Angle;
  j5: Angle;
  j6: Angle;
}

/** Joint identifier for single-joint operations */
type ABB6700Joint = "j1" | "j2" | "j3" | "j4" | "j5" | "j6";
```

---

## Entity State

The `ABB6700Entity` stores:

- **j1–j6** (`Angle`) — Rotational joint angles, each independently settable.
- **stabilizerAngle** (`Angle`) — Computed rotation of the stabilizer linkage (driven by `CalcStabilizerUC` when J2 changes).
- **stabilizerExtension** (`number`) — Computed prismatic extension of the stabilizer (driven by `CalcStabilizerUC` when J2 changes).

All angle properties use `MemoizedAngle` for change-detection efficiency.

---

## Use Cases

### SetJointAngleUC

Sets a single joint angle on an entity: `uc.setAngle(joint, angle)`.

### SetPoseUC

Sets all 6 joint angles atomically: `uc.setPose(pose)`.

### CalcStabilizerUC

Automatically observes the entity and recomputes `stabilizerAngle` and `stabilizerExtension` whenever J2 changes. Uses fixed/moving anchor geometry constants to model the physical stabilizer linkage between J1 and J2.

---

## Controllers

Thin boundary functions exported from the package for consumer convenience:

| Controller      | Signature                                     | Description                        |
| --------------- | --------------------------------------------- | ---------------------------------- |
| `createABB6700` | `(id, appObjects) → AppObject \| undefined`   | Create a new instance via the repo |
| `setJointAngle` | `(id, joint, angle, appObjects) → void`       | Set a single joint angle           |
| `setPose`       | `(id, pose, appObjects) → void`               | Set all 6 joints atomically        |
| `getPose`       | `(id, appObjects) → ABB6700Pose \| undefined` | Read current pose from entity      |

---

## Registration & Factory Setup

The component uses the **DomainFactory** pattern from `@vived/core`. To register:

```typescript
import { makeAppObjectRepo, makeDomainFactoryRepo } from "@vived/core";
import { makeABB6700FeatureFactory } from "@vived/component-abb-6700";

const appObjects = makeAppObjectRepo();
const factoryRepo = makeDomainFactoryRepo(appObjects);

// Register the feature
makeABB6700FeatureFactory(appObjects);

// Run all factories (setupEntities → setupUCs → setupPMs → finalSetup)
factoryRepo.setupDomain();
```

`makeABB6700FeatureFactory` creates a **singleton ABB6700Repo** on an AppObject named `"ABB6700s"` and calls `setupABB6700InstanceFactory` to register the per-instance entity factory. The factory wires up **per-instance** components automatically:

- `ABB6700Entity` — state (6 joint angles + stabilizer)
- `SetJointAngleUC` — single-joint mutation
- `SetPoseUC` — atomic pose mutation
- `CalcStabilizerUC` — stabilizer linkage computation (observes J2)
- `ABB6700PM` — view model projection
- `ABB6700BabylonView` — 3D rendering

---

## Creating Instances

Each instance is identified by a unique string ID. Create instances via the controller or directly via the repo:

```typescript
import { createABB6700 } from "@vived/component-abb-6700";

// Via controller (recommended)
const appObject = createABB6700("my-instance-1", appObjects);

// Or directly via repo
import { ABB6700Repo } from "@vived/component-abb-6700";
const repo = ABB6700Repo.get(appObjects);
const entity = repo.createABB6700Entity("my-instance-1");
```

---

## Subscribing to View Updates (PM Adapter)

The **aBB6700PMAdapter** provides a framework-agnostic subscription interface for receiving `ABB6700VM` updates:

```typescript
import { aBB6700PMAdapter } from "@vived/component-abb-6700";

// Subscribe
aBB6700PMAdapter.subscribe("my-instance-1", appObjects, (vm) => {
  console.log("J1:", vm.j1.degrees, "J2:", vm.j2.degrees);
});

// Unsubscribe
aBB6700PMAdapter.unsubscribe("my-instance-1", appObjects, handler);
```

The adapter's `defaultVM` contains all joints at `Angle.FromDegrees(0)`, `stabilizerAngle` at `Angle.FromDegrees(0)`, and `stabilizerExtension` at `0`.

---

## 3D View (Babylon.js)

The `ABB6700BabylonView` loads the GLB asset and updates joint rotations + stabilizer linkage based on VM changes. The view subscribes to the PM adapter automatically in its constructor.

### Asset

| Name    | Asset ID                               | File           |
| ------- | -------------------------------------- | -------------- |
| default | `8a448235-bed3-4f2b-b934-848c6fad43ed` | `abb_6700.glb` |

### View Lifecycle

The instance factory creates the view automatically. To load the 3D asset:

```typescript
const view = ABB6700BabylonView.get(appObject);
await view.load(scene); // Loads GLB via VIVED asset pipeline, binds meshes
```

The `load()` method uses an internal `AssetContainer` cache — multiple instances share the same loaded GLB data.

### Accessing Transform Nodes

After `load()` completes, the view exposes two key transform nodes for scene integration:

```typescript
const view = ABB6700BabylonView.get(appObject);

// End-of-Arm Tooling — attach grippers, welders, etc. to the robot's wrist
const eot: TransformNode | undefined = view.eotTransformNode;

// Root transform — position/parent the robot in the scene hierarchy
const root: TransformNode | undefined = view.rootTransformNode;
```

- **`eotTransformNode`** — The transform node identified by meshId `"eot"` (lowercase) in the GLB. Returns `undefined` before `load()` is called or if the GLB does not contain an EOT node.
- **`rootTransformNode`** — The top-level root transform node of the instantiated model. Returns `undefined` before `load()` is called.

---

## Public API Exports

| Layer       | Exports                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Entities    | `ABB6700Entity`, `makeABB6700Entity`, `ABB6700Repo`, `makeABB6700Repo`, type `ABB6700EntityFactory`        |
| Use Cases   | `SetJointAngleUC`, `makeSetJointAngleUC`, `SetPoseUC`, `makeSetPoseUC`, type `ABB6700Joint`, `ABB6700Pose` |
| PMs         | `ABB6700PM`, `makeABB6700PM`, type `ABB6700VM`                                                             |
| Adapters    | `aBB6700PMAdapter`                                                                                         |
| Views       | `ABB6700BabylonView`, `makeABB6700BabylonView` (getters: `eotTransformNode`, `rootTransformNode`)          |
| Factory     | `ABB6700FeatureFactory`, `makeABB6700FeatureFactory`, `setupABB6700InstanceFactory`                        |
| Controllers | `createABB6700`, `setJointAngle`, `setPose`, `getPose`                                                     |
| Mocks       | `MockABB6700PM`, `MockSetJointAngleUC`, `MockSetPoseUC`                                                    |

---

## Adding to a Slide App — Integration Checklist

1. **Install the package**: `npm install @vived/component-abb-6700`
2. **Register the feature factory** during domain setup (before `factoryRepo.setupDomain()`).
3. **Create instances** via `createABB6700(id, appObjects)`.
4. **Load the 3D asset** by calling `view.load(scene)` on the created instance's `ABB6700BabylonView`.
5. **Control joint angles** via `setJointAngle(id, joint, angle, appObjects)` or `setPose(id, pose, appObjects)`.
6. **Read current pose** via `getPose(id, appObjects)`.
7. **Subscribe to VM updates** via `aBB6700PMAdapter` if custom UI is needed.

---

## Build & Distribution

```bash
npm run build        # Vite library build + TypeScript declarations
npm run test         # Run all tests
npm run dev          # Open Babylon.js playground
npm run dev:watch    # Rebuild on file changes
npm run lint         # ESLint check
npm run upload-asset # Upload .glb to VIVED Asset System
```
