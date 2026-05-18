# Changelog

All notable changes to `@vived/component-ABB6700` will be documented in this file.

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
