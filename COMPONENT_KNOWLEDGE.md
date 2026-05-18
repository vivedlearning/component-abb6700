# ABB 6700 — VIVED Smart Component

## Overview

The **ABB 6700** is a VIVED Smart Component (`@vived/component-ABB6700`) that represents a 6-DOF robot arm with rotational joints J1–J6. Each joint angle is stored and managed independently, enabling precise robotic arm positioning in 3D scenes.

- **Package**: `@vived/component-ABB6700`
- **Version**: 0.1.0
- **Multi-instance**: Yes — multiple instances can coexist in a single scene.
- **Peer dependencies**: `@babylonjs/core ^9.0.0`, `@vived/core ^2.0.0`

---

## Architecture

The component follows **VIVED Clean Architecture** with strict layer separation:

```
Controllers (thin boundary functions — NOT exported from package)
    ↓ calls
Entity (ABB6700Entity) ← source of truth (6 joint angles)
    ↓ observed by
Presentation Manager (ABB6700PM → emits ABB6700VM)
    ↓ consumed by
Adapter (aBB6700PMAdapter) → View (ABB6700BabylonView)
```

All domain layers (Entities, PMs, Adapters) are **framework-agnostic** — no React or Babylon imports. Only the View layer imports Babylon.js.

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
}
```

---

## Registration & Factory Setup

The component uses the **DomainFactory** pattern from `@vived/core`. To register:

```typescript
import { makeAppObjectRepo, makeDomainFactoryRepo } from "@vived/core";
import { makeABB6700FeatureFactory } from "@vived/component-ABB6700";

const appObjects = makeAppObjectRepo();
const factoryRepo = makeDomainFactoryRepo(appObjects);

// Register the feature
makeABB6700FeatureFactory(appObjects);

// Run all factories (setupEntities → setupUCs → setupPMs → finalSetup)
factoryRepo.setupDomain();
```

`makeABB6700FeatureFactory` creates a **singleton ABB6700Repo** on an AppObject named `"ABB6700s"`. The repo's internal entity factory wires up **per-instance** components automatically:

- `ABB6700Entity` — state (6 joint angles)
- `ABB6700PM` — view model projection

---

## Creating Instances

Each instance is identified by a unique string ID. Create instances via the repo:

```typescript
import { ABB6700Repo } from "@vived/component-ABB6700";

const repo = ABB6700Repo.get(appObjects);
const entity = repo.createABB6700Entity("my-instance-1");
```

---

## Subscribing to View Updates (PM Adapter)

The **aBB6700PMAdapter** provides a framework-agnostic subscription interface for receiving `ABB6700VM` updates:

```typescript
import { aBB6700PMAdapter } from "@vived/component-ABB6700";

// Subscribe
aBB6700PMAdapter.subscribe("my-instance-1", appObjects, (vm) => {
  console.log("J1:", vm.j1.degrees, "J2:", vm.j2.degrees);
});

// Unsubscribe
aBB6700PMAdapter.unsubscribe("my-instance-1", appObjects, handler);
```

The adapter's `defaultVM` contains all joints at `Angle.FromDegrees(0)`.

---

## 3D View (Babylon.js)

The `ABB6700BabylonView` binds to loaded GLB meshes and updates joint rotations based on VM changes.

### Asset

| Name    | Asset ID | File          |
| ------- | -------- | ------------- |
| default | (TBD)    | `ABB6700.glb` |

### View Setup

```typescript
import { makeABB6700BabylonView } from "@vived/component-ABB6700";

// Create view on the same AppObject as the entity
const view = makeABB6700BabylonView(appObject);
await view.setupView(); // Subscribe to PM
view.bindMeshes(loadedMeshes); // Bind GLB meshes
```

---

## Adding to a Slide App — Integration Checklist

1. **Install the package**: `npm install @vived/component-ABB6700`
2. **Register the feature factory** during domain setup (before `factoryRepo.setupDomain()`).
3. **Create instances** with unique IDs when building a slide's scene.
4. **Load the 3D asset** (GLB) via the VIVED asset pipeline.
5. **Create the Babylon view** and call `bindMeshes()` with the loaded meshes.
6. **Control joint angles** by setting `entity.j1` through `entity.j6` with `Angle.FromDegrees()`.
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
