# feat: SmartComponent Facade

## Problem Statement

The ABB 6700's public API is a set of flat controller functions (`createBabylonABB6700`, `setPose`, `setJointAngle`, `getPose`) plus raw domain and view exports. A host application must discover and call several functions and manage the AppObject/view wiring itself, and there is no single object representing a component instance nor a shared, typed contract a host can hold uniformly across smart components.

## Solution

Introduce `ABB6700Facade` — a single host-facing class that wraps the ABB 6700's commands, state snapshot, and lifecycle. The facade implements the SmartComponent structural convention (`id`, `interfaceVersion`, `onEvent`, `onViewModel`, `load`, `destroy`, `getState`, `applyState`), giving hosts a uniform integration surface that works the same way across every smart component. The facade's domain is wired synchronously at construction with no Babylon dependency (the Babylon view is dynamically imported at `load()`), so tests and headless hosts can exercise the full command and state surface without a 3D context. The ABB 6700 currently emits no events, so `onEvent` is a contract-complete no-op.

## User Stories

1. As a slide Activity, I want to construct an ABB 6700 facade synchronously, so that I can issue commands and read state before the 3D scene is ready.
   - domain is fully wired immediately after construction: commands are callable and state is readable without calling `load()`
   - construction does not require a Babylon context

2. As a slide Activity, I want to call `load()` to attach the ABB 6700's 3D view to the scene, so that the arm renders when the scene is initialized.

3. As a slide Activity, I want to call `destroy()` to tear down the component and release all resources, so that the arm is fully cleaned up when the activity ends.

4. As a slide Activity, I want to read the facade's `id`, so that I can identify the component instance by its string identifier.

5. As an Activity author, I want `ABB6700Facade` to satisfy the SmartComponent structural convention, so that I can hold it as a uniform `SmartComponent` reference alongside instances of other smart components.

6. As a slide Activity, I want to call `facade.setJointAngle(joint, angle)` to rotate a single joint, so that I can command one axis of the arm without importing flat controllers.

7. As a slide Activity, I want to call `facade.setPose(pose)` to move all six joints atomically, so that I can command the whole arm in one call.

8. As a slide Activity, I want to call `facade.getPose()` to read the current six joint angles, so that I can inspect the arm's configuration.

9. As a slide Activity, I want `facade.getState()` to return the six joint angles in degrees tagged with the current schema version, so that I can persist the arm's authored configuration.

10. As a slide Activity, I want `facade.applyState(state)` to restore a saved snapshot, so that the arm comes up in the authored configuration.
    - a snapshot whose version matches the current schema version sets all six joints
    - a snapshot whose version does not match is rejected and leaves the arm unchanged

11. As a slide Activity, I want `facade.onViewModel(cb)` to deliver the current view model and every subsequent change, returning an unsubscribe function, so that my UI stays in sync with the arm.
    - the subscriber receives an update when a joint changes
    - the returned unsubscribe function stops further updates

12. As a slide Activity, I want `facade.onEvent(...)` to return a valid unsubscribe function even though the ABB 6700 emits no events, so that the facade satisfies the SmartComponent contract uniformly.
