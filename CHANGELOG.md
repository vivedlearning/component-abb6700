# Changelog

All notable changes to `@vived/component-ABB6700` will be documented in this file.

## [1.3.1] — 2026-06-03

### Changed

- **EOAT transform orientation in GLB** — Flipped the EOAT transform rotation in the ABB 6700 model so end-of-arm tooling alignment matches expected orientation.
- **Asset reference updated** — Component now uses asset ID `5306be7c-5786-4e20-83ee-fe82471c5651` for `abb_6700.glb`.

## [1.3.0] — 2026-05-26

### Added

- **Shadow caster access** — `ABB6700BabylonView.shadowCasters` exposes all `AbstractMesh` instances so host apps can register them with a Babylon `ShadowGenerator`.

### Changed

- **GLB metadata property renamed** — Node resolution now reads `gltf.extras.objectId` (previously `meshId`) when matching joint nodes.
- **Babylon loader API migrated** — Replaced deprecated `SceneLoader.LoadAssetContainerAsync(...)` with module-level `LoadAssetContainerAsync(...)` for Babylon.js v9 compatibility and better tree-shaking.

## [1.2.0] — 2026-05-22

### Added

- **`createBabylonABB6700` bridge function** — New recommended entry point that creates a domain instance and loads the Babylon view in a single async call. Exported from the package root.

### Changed

- **`ABB6700BabylonView.load()` no longer requires a `scene` parameter** — The view now resolves the scene internally via `BabylonEntity`, simplifying the consumer API.
- **`makeABB6700BabylonView` is now async** — Returns `Promise<ABB6700BabylonView>` and automatically calls `load()`, so consumers no longer need to load separately.
- **Domain factory no longer creates the Babylon view** — `setupABB6700InstanceFactory` creates only domain-layer components (Entity, UCs, PM). The view is created separately via `createBabylonABB6700()`, keeping the domain factory framework-agnostic.

### Removed

- **Deprecated `setupView()` method** — Removed from `ABB6700BabylonView` (subscription was already handled in the constructor).

## [1.1.0] — 2026-05-20

### Added

- **EOT TransformNode access** — `ABB6700BabylonView.eotTransformNode` exposes the End-of-Arm Tooling transform node (objectId `"eot"` in the GLB) so the Slide app can attach tooling to the robot's wrist.
- **Root TransformNode access** — `ABB6700BabylonView.rootTransformNode` exposes the root transform node so the Slide app can position the robot in the scene and parent it within the scene hierarchy.

## [0.1.0] — 2026-05-18

### Added

- **ABB6700Entity** — Core entity managing per-instance state for 6 joint angles (J1–J6) using MemoizedAngle.
- **ABB6700Repo** — Singleton repository for creating, deleting, and looking up ABB 6700 instances. Supports multi-instance scenes.
- **ABB6700PM** — Presentation Manager emitting `ABB6700VM` snapshots with change suppression for redundant updates.
- **aBB6700PMAdapter** — Framework-agnostic PM adapter for subscribing to view model updates.
- **ABB6700BabylonView** — Babylon.js view that subscribes to the PM and applies joint rotations to meshes.
- **ABB6700FeatureFactory** — Domain factory following the four-phase setup pattern; wires per-instance Entity + PM automatically.
- **Controllers** — Internal boundary function: `createABB6700`.
- **Full test coverage** — Unit tests for all layers plus integration test validating end-to-end flow.
- **Dev playground** — Vite-powered Babylon.js playground for local development.
- **Asset upload script** — CLI for uploading GLB assets to the VIVED Asset System.
