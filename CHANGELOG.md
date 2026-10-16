# Changelog

All notable changes to `@vived/component-ABB6700` will be documented in this file.

## [Unreleased]

### Added

- **Path playback.** `playPath(segments)` on `ABB6700Facade`, and the standalone
  `playPath(id, segments, appObjects)` controller, play an ordered list of segments
  as one motion. A segment is a pose, a travel time (`durationMs`) and an optional
  dwell (`dwellMs`). The component honours the travel times and dwells as given, and
  the transition duration does not apply to a segment. Each segment's pose is
  committed to the view model and `getState()` as that segment starts, so no view
  model carries angles between two segment poses. The first segment starts from the
  angles on screen. A segment with a travel time of zero snaps to its pose. A segment
  whose pose equals the one before it still takes its travel time. `playPath`
  rejects the whole request with a warning, and changes nothing, if the list is
  empty or any travel time or dwell is negative or not finite. The angles in a pose
  are not checked, as with `setPose`.
- **`path` on the view model.** `ABB6700VM.path` (`ABB6700PathVM`) reports the path
  in progress: `playCount`, `segmentIndex`, `phase` (`"moving"`, `"dwelling"` or
  `"stopping"`), the current segment's `durationMs` and `dwellMs`, and
  `stopDurationMs`. It is `undefined` when no path is in progress.
- **Path events.** Three payload-free events: `pathSegmentReached` (the arm has
  arrived at a segment's pose), `pathCompleted` (the last segment has been reached
  and its dwell has ended) and `pathStopped` (a path stop has brought the arm to
  rest). Subscribe with `facade.onEvent(name, cb)`, or with the standalone
  `onPathSegmentReached`, `onPathCompleted` and `onPathStopped` controllers, which
  take `(id, appObjects, cb)`. Each returns a function that stops further calls.
  The callbacks receive no arguments. Inside `pathSegmentReached`, `vm.path` names
  the segment reached, in its `"dwelling"` phase, so a host can fire its weld gun
  for the dwell. For the last segment, `pathSegmentReached` fires before
  `pathCompleted`.
- **Path stop.** `stopPath(options?)` on the facade, and the standalone
  `stopPath(id, appObjects, options?)` controller, stop a path in flight. The
  rendered arm slows along its current segment from the speed it has on screen. It
  comes to rest within the stop duration, never passes the segment's pose and never
  starts another segment. The rest of the path is dropped. The pose the arm rests at
  is committed to the view model and `getState()`, and then `pathStopped` fires. The
  stop duration is `400` ms by default (`ABB_6700_DEFAULT_STOP_DURATION_MS`). Pass
  `{ durationMs }` to change it. A negative or non-finite duration is replaced by the
  default with a warning, and the stop still happens. A duration of `0` stops the arm
  where it is. With no path in progress, `stopPath` changes nothing and fires no
  event. A second stop request while the arm is stopping changes nothing.
- **Path rendering in the Babylon view.** The view that ships with this release
  renders paths and path stops. It eases each segment over its travel time, arrives
  exactly on the segment's pose, holds still for the dwell, and keeps the stabilizer
  linkage attached throughout. After a late `load()` or a remount during a path, the
  arm appears directly on the committed pose and the path plays on from there.
- **New exports.** `ABB_6700_DEFAULT_STOP_DURATION_MS` (`400`); the types
  `ABB6700StopPathOptions`, `ABB6700PathSegment`, `ABB6700PathPhase`,
  `ABB6700PathVM` and `ABB6700PathProgress`; `PlayPathUC` and `StopPathUC` (with
  `makePlayPathUC` and `makeStopPathUC`); and `MockPlayPathUC` and `MockStopPathUC`
  for consumer tests.

### Heads up for hosts

- **Public types gain required members.** `ABB6700VM` has a new required `path`
  field, and the exported abstract `ABB6700Entity` gains abstract `path` and
  `startPath()` members. Hosts that only read view models or drive the arm through
  the facade or controllers are unaffected. Code that *builds* `ABB6700VM` literals
  must add `path: undefined` to compile. Code that subclasses `ABB6700Entity` must
  implement the new members. This is the same kind of change as `snapCount` in 2.2.0.
- **`ABB6700Events` is no longer empty.** It now lists `pathSegmentReached`,
  `pathCompleted` and `pathStopped`. An unknown event name still returns a no-op
  unsubscribe function.
- **`playPath`, `stopPath` and the events go beyond SmartComponent contract v1.**
  They are additive, so the facade still satisfies the contract.
- **A path advances only while the arm's Babylon view renders** (ADR-0007). Before
  `load()`, a path waits on its first segment: that segment's pose is committed and
  no event fires. Once the view attaches, that segment counts as reached and the
  path plays on. A stop completes when the view brings the arm to rest, so a stop
  with no rendering view stays in its `"stopping"` phase until the view loads and
  renders. Paths pause while a tab is hidden, because the render loop does. A
  headless host that waits on `pathCompleted` or `pathStopped` should use
  `MockPlayPathUC` and `MockStopPathUC` in its tests.

### Changed

- **Pose commands cancel a path.** `setPose`, `setJointAngle` and `applyState`
  (facade or controller, with or without the snap option) cancel a path in
  progress, and so does a new `playPath`. A cancelled path fires no event, and the
  view model reports no path in progress. A pose command during a stop ends the
  stop: the commanded pose wins and `pathStopped` does not fire.

### Unchanged on purpose

- **`ABB6700State` and its schema version `1`.** A path is never persisted. A
  snapshot taken mid-path holds the pose committed last.
- **Pose commands, the snap option and `setTransitionDuration`** behave as in 2.2.0
  when no path is in progress.
- **The transition duration does not affect a path.** Changing it during a path does
  not change the path's timing. The new duration applies to the next pose command
  after the path.

## [2.2.0] — 2026-09-23

### Added

- **Per-command snap option.** `setPose`, `setJointAngle` and `applyState` on
  `ABB6700Facade`, and the standalone `setPose`, `setJointAngle` and
  `applyABB6700State` controllers, accept an optional
  `{ transition: "none" | "transition" }`. `"none"` snaps the rendered arm straight
  to the commanded target and ends any transition in flight, even when the target
  has not changed. Leaving the option out, or passing `"transition"`, transitions
  exactly as in 2.1.0; any other value is treated as the default. Use it for direct
  manipulation, such as an authoring joint slider that previously trailed behind
  the drag, while slide changes keep transitioning. The choice is per command, so
  there is no mode to switch back. `ABB6700TransitionOption` is exported.

### Heads up for hosts

- **Two public types gain required members.** `ABB6700VM` has a new required
  `snapCount` field, and the exported abstract `ABB6700Entity` gains abstract
  `snapCount` and `requestSnap()` members. Hosts that only read view models or
  drive the arm through the facade or controllers are unaffected. Code that
  *builds* `ABB6700VM` literals, or subclasses `ABB6700Entity`, must add them to
  compile. This is the same kind of change as `transitionDurationMs` in 2.1.0.
- **`applyState(state, options?)`** goes beyond the SmartComponent contract v1's
  documented `applyState(state)`. The extra parameter is optional, so the facade
  still satisfies the contract.

### Changed

- **"Transition", not "animation".** The component's docs and API now call eased
  pose changes *transitions*; "animate" and "animation" are reserved for keyframed
  model animations the component may support later. The option's default value is
  `"transition"`.

### Unchanged on purpose

- **The snap affects rendering only.** A snap command commits the same target to
  the view model and `getState()` as the same command without it, leaves the
  transition duration alone, and adds nothing to `ABB6700State`, whose schema
  version stays `1`.

## [2.1.0] — 2026-09-23

### Heads up for hosts

- **Arms now move between poses instead of snapping.** With no host change, every
  commanded pose (a slide change, `setPose`, `setJointAngle`, `applyState`) now eases
  the rendered arm from where it is on screen to the target over 1 second. To keep
  the old instant behaviour, call `facade.setTransitionDuration(0)` (or the
  `setTransitionDuration` controller) after creating the arm.
- **`ABB6700VM` has a new required field, `transitionDurationMs`.** Hosts that only
  read view models are unaffected. Code that *builds* `ABB6700VM` literals, usually
  consumer tests driving a view through the exported mocks, must add the field to
  compile.

### Added

- **Pose transitions.** `ABB6700BabylonView` eases each commanded pose from the
  currently rendered joint angles to the target with an ease-in-out curve, arriving
  exactly on the commanded angles. A pose commanded mid-transition redirects from the
  on-screen angles for the full duration. The view renders directly, with no
  transition, when it first binds on load, after a remount, and at a zero duration. The stabilizer linkage is recomputed every frame
  from the interpolated J2, so it stays attached throughout.
- **Transition duration.** `setTransitionDuration(ms)` on the facade and as a
  standalone controller (`setTransitionDuration(id, ms, appObjects)`), backed by the
  new `SetTransitionDurationUC`. Default `1000` ms
  (`ABB_6700_DEFAULT_TRANSITION_DURATION_MS`), per instance, settable before
  `load()`. `0` disables transitions; a negative or non-finite value is rejected with
  a warning and the previous duration kept. A change applies to the next pose; a
  transition in flight keeps its duration. `MockSetTransitionDurationUC` is exported
  for consumer tests.

### Unchanged on purpose

- **State and view model report the target, never a mid-transition pose.** The
  interpolation lives only in the Babylon view. `getState()` and the last VM
  delivered for a command always carry the commanded angles, and the duration is not
  part of `ABB6700State` (it is pacing, not authored configuration), so the state
  schema version stays `1`.

## [2.0.1] — 2026-09-21

### Fixed

- **Arms rendered nothing after the app was remounted.** The Babylon view cached
  its loaded `AssetContainer` in a class-static map keyed by asset ID alone. A Host
  mounts the app more than once per page life, and each mount is a new engine and
  scene while the module (and the cache) lives on — so the second scene's arms
  instantiated from a container bound to the first, disposed scene. The clones
  landed in the dead scene: the transform hierarchy existed (tooling on the EOT
  socket still showed, correctly placed) but no arm geometry drew. The cache is now
  scene-scoped and in-flight-deduplicated (`ABB6700AssetCache.ts`), the same shape
  every other VIVED smart component already uses. The four arms of one cell now
  share one GLB load instead of four parallel ones.

## [2.0.0] — 2026-09-02

### BREAKING CHANGES

- **`ABB6700Facade.getPose()` is removed.** Use `getState()` for the authored
  configuration, `onViewModel()` for live values, or the standalone `getPose`
  controller — which is still exported and unchanged. The facade's read surface is
  now `getState()` + `onViewModel()` only, matching every other VIVED smart
  component facade. See ADR-0006.
- **`applyState` no longer rejects a version mismatch.** It was version-checked in
  1.4.0 and returned without applying; it is now best-effort forward-compatible and
  always applies the snapshot. If you relied on a mismatched snapshot being ignored,
  that guard is gone — version handling is the component's responsibility now. See
  ADR-0005, which supersedes ADR-0003.

### Added

- **Standalone state controllers** — `getABB6700State(id, appObjects, version)` and
  `applyABB6700State(id, appObjects, state)`, exported from the package root. These
  let a consuming app's domain layer persist and restore an arm without constructing
  a facade, so serialization stays a domain→domain concern and never pulls in the
  facade's Babylon view construction. Same shape as the controllers already shipped
  by `-abb-controller`, `-electrical-cabinet`, `-pneumatic-panel` and `-stacklight`.

### Changed

- **`getState` / `applyState` are one-line delegations** to the new controllers, so
  the facade holds no state logic and the two seams cannot drift apart.
- **`applyState` resolves each joint independently.** A joint absent from the
  snapshot falls back to that joint's entity default instead of the whole snapshot
  being discarded.
- **Packaging** — the package is marked `UNLICENSED` with a root `LICENSE`
  (proprietary, internal use only), ships `COMPONENT_KNOWLEDGE.md` and
  `CHANGELOG.md` alongside `dist/` via the `files` allowlist, and declares
  `publishConfig.access: "public"`.

### Fixed

- **Invalid angle from a partial snapshot.** `applyState` previously passed an
  absent joint straight to `Angle.FromDegrees(undefined)`, producing a `NaN` angle.
  Joint values are now guarded for finiteness, which also covers `null` and
  non-numeric values from corrupt storage.

### Removed

- `ABB6700Facade.getPose()` — see BREAKING CHANGES.

## [1.4.0] — 2026-07-08

### Added

- **`ABB6700Facade` Smart Component seam** — Headless facade implementing the `SmartComponent` contract (`id`, `interfaceVersion`, `onEvent`, `onViewModel`, `load`, `destroy`, `getState`, `applyState`) plus the existing `setPose` / `setJointAngle` / `getPose` commands. This is the recommended host-integration surface: construction is headless (domain only) and `load()` attaches the Babylon view.
- **Serializable facade state** — `getState()` / `applyState()` with the `ABB6700State` type (six joint angles in degrees) and `ABB_6700_STATE_VERSION`. `applyState` is version-checked and rejects unsupported versions.
- **Host-side highlight lookups** — `ABB6700BabylonView` now exposes `nodesByObjectId` and `highlightGroupsByObjectId`, plus the exported whole-arm highlight group key `ABB6700_WHOLE_ARM_HIGHLIGHT_GROUP` (`"abb_6700"`).
- **Presentation-free contract** — A guard test keeps pointer detection and interaction-state rendering out of `src/`; hosts own all picking and highlighting.

### Changed

- **`@babylonjs/loaders` is now a peer dependency.** Babylon core, Babylon loaders, and `@vived/app` are externalized from the library bundle instead of being bundled into it, shrinking `dist/` from ~4.7 MB to ~20 KB. When upgrading, ensure `@babylonjs/loaders` (^9.0.0) is installed alongside the existing `@babylonjs/core` peer.
- **Facade loads the Babylon view lazily** — the view is brought in via a dynamic `import()` inside `load()`, so importing or constructing the facade pulls in no Babylon code (fully headless two-phase lifecycle).
- **Repository restructured** — source reorganized into `src/Domain/` and `src/Frameworks/Babylon/`, with added VIVED documentation and process scaffolding (`CONTEXT.md`, ADRs, PRD + spec test, contributor architecture doc). No public API change from the restructure.

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
