# @vived/component-ABB6700

ABB 6700 — VIVED Smart Component

A reusable 3D robot arm component for VIVED slide apps. Provides domain logic (entities, presentation managers) and a Babylon.js view for a 6-DOF robot arm with independently controllable joint angles (J1–J6).

## Installation

```bash
npm install @vived/component-abb-6700
```

Peer dependencies:

- `@babylonjs/core ^9.0.0`
- `@babylonjs/loaders ^9.0.0`
- `@vived/app ^6.2.0`
- `@vived/core ^2.0.0`

## Usage

`ABB6700Facade` is the recommended Host integration surface. Its constructor
is headless (domain only); `load()` attaches the Babylon view.

```ts
import { ABB6700Facade } from "@vived/component-abb-6700";
import { Angle, makeAppObjectRepo, makeDomainFactoryRepo } from "@vived/core";
import { makeABB6700FeatureFactory } from "@vived/component-abb-6700";

// Register the component's domain factory once per app
const appObjects = makeAppObjectRepo();
const domainFactoryRepo = makeDomainFactoryRepo(appObjects);
makeABB6700FeatureFactory(appObjects);
domainFactoryRepo.setupDomain();

// Create an instance and attach the 3D view
const robot = new ABB6700Facade("arm-1", appObjects);
await robot.load();

// Control joints
robot.setJointAngle("j1", Angle.FromDegrees(45));
robot.setPose({
  j1: Angle.FromDegrees(45),
  j2: Angle.FromDegrees(90),
  j3: Angle.FromDegrees(0),
  j4: Angle.FromDegrees(0),
  j5: Angle.FromDegrees(0),
  j6: Angle.FromDegrees(0),
});

// Serializable state (six joints, in degrees)
const snapshot = robot.getState();
robot.applyState(snapshot);
```

If you need a fully-wired `AppObject` plus Babylon view in one call without the
facade, use `createBabylonABB6700`:

```ts
import { createBabylonABB6700 } from "@vived/component-abb-6700";

const appObject = await createBabylonABB6700("arm-1", appObjects);
```

See `COMPONENT_KNOWLEDGE.md` for the full API reference, recipes, and the
host-owned highlight/pointer integration contract.

## Development

```bash
npm install
npm run dev              # Vite dev server with 3D playground
npm run dev:watch        # Watch mode library rebuild
npm run test             # Run unit tests
npm run lint             # ESLint
npm run build            # Production build
```

## Asset Upload Script

A reusable CLI script for uploading asset files (GLB models, textures, etc.) to the VIVED Asset System.

### Prerequisites

- Node.js 18+
- A VIVED account with API access

### Commands

**Create a new asset:**

```bash
npm run upload-asset -- create <filePath>
```

Uploads the file and creates a new asset record. Prints the new asset ID to stdout.

**Update an existing asset's file:**

```bash
npm run upload-asset -- update <assetId> <filePath>
```

Uploads the file and updates the asset record to point to the new file.

### Examples

```bash
# Upload the ABB6700 GLB as a new asset
npm run upload-asset -- create public/abb_6700.glb

# Update an existing asset with a new version of the file
npm run upload-asset -- update <asset-uuid> public/abb_6700.glb
```

### After uploading

After creating a new asset, add the returned asset ID to `src/component.config.ts`:

```ts
assets: [
  { id: "<asset-id>", file: "abb_6700.glb" },
],
```

### How it works

1. Reads the owner ID from `package.json` `name` field
2. Derives the asset name from the filename (e.g. `ABB6700.glb` → `ABB6700`)
3. Prompts interactively for VIVED credentials (email + password)
4. Authenticates via AWS Cognito
5. Uploads the file to VIVED storage via a signed URL
6. Creates or updates the asset metadata record via the VIVED API

Progress and status messages are printed to stderr. The asset ID (on create) is printed to stdout, making it easy to capture in scripts:

```bash
ASSET_ID=$(npm run upload-asset -- create public/abb_6700.glb 2>/dev/null)
```
