# @vived/component-ABB6700

ABB 6700 — VIVED Smart Component

A reusable 3D robot arm component for VIVED slide apps. Provides domain logic (entities, presentation managers) and a Babylon.js view for a 6-DOF robot arm with independently controllable joint angles (J1–J6).

## Installation

```bash
npm install @vived/component-ABB6700
```

Peer dependencies:

- `@babylonjs/core ^9.0.0`
- `@vived/core ^2.0.0`

## Usage

```ts
import {
  makeABB6700FeatureFactory,
  ABB6700Repo,
  ABB6700Entity,
  makeABB6700BabylonView,
} from "@vived/component-ABB6700";
import { Angle, makeAppObjectRepo, makeDomainFactoryRepo } from "@vived/core";

// Setup
const appObjects = makeAppObjectRepo();
const domainFactoryRepo = makeDomainFactoryRepo(appObjects);
makeABB6700FeatureFactory(appObjects);
domainFactoryRepo.setupDomain();

// Create an instance
const repo = ABB6700Repo.get(appObjects)!;
repo.createABB6700Entity("arm-1");

// Create and bind the Babylon.js view
const ao = appObjects.getOrCreate("arm-1");
const view = makeABB6700BabylonView(ao);
await view.setupView();
view.bindMeshes(loadedMeshes); // meshes from your GLB loader

// Control joints
const entity = ABB6700Entity.getById("arm-1", appObjects)!;
entity.j1 = Angle.FromDegrees(45);
entity.j2 = Angle.FromDegrees(90);
```

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
npm run upload-asset -- create public/ABB6700.glb

# Update an existing asset with a new version of the file
npm run upload-asset -- update <asset-uuid> public/ABB6700.glb
```

### After uploading

After creating a new asset, add the returned asset ID to `src/component.config.ts`:

```ts
assets: [
  { name: "default", id: "<asset-id>", file: "ABB6700.glb" },
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
ASSET_ID=$(npm run upload-asset -- create public/ABB6700.glb 2>/dev/null)
```
