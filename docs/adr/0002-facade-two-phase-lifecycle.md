# ADR 0002: Facade two-phase lifecycle — sync construction, explicit async load

**Status:** Accepted · 2026-07-08

## Context

`ABB6700Facade` needs to be usable in two settings that have different requirements:

1. **Domain-integration tests and headless host wiring**, where there is no Babylon scene and no GPU. Here the facade must be constructable and commandable without any 3D context.
2. **A live 3D slide**, where the facade must attach a Babylon view and render the arm.

Babylon (`@babylonjs/core` and `@babylonjs/loaders/glTF`) is heavy and assumes a rendering environment. If constructing — or even *importing* — the facade pulled in Babylon, every test and every headless consumer would pay that cost and risk environment errors.

## Decision

`ABB6700Facade` uses an explicit **two-phase lifecycle**:

1. **Construction is synchronous and Babylon-free.** `new ABB6700Facade(id, appObjects)` wires only the domain (via `createABB6700`). After construction the facade is fully usable for commands (`setPose`, `setJointAngle`, `getPose`), state (`getState`/`applyState`), and VM subscription (`onViewModel`). This is the surface PRD/domain-integration tests exercise.
2. **`load()` is explicit and asynchronous.** `await facade.load()` creates and attaches the Babylon view. It is required before the component renders in a scene.

Crucially, the Babylon view is brought in via a **dynamic `import()` inside `load()`**, not a static top-of-module import. This means importing `ABB6700Facade` (as a test or headless host does) pulls in **no Babylon code at all** — Babylon is loaded only when `load()` is actually called.

## Considered options

**Static import of the view + load in the constructor.** Rejected — constructing the facade would require a Babylon context and make headless/testable construction impossible; async work in a constructor is also an anti-pattern.

**Static import of the view, async `load()`.** Better, but importing the facade module would still eagerly pull in `@babylonjs/loaders/glTF` and `@babylonjs/core`, so a pure-node test importing the facade would load Babylon. Rejected in favor of the dynamic import.

**Auto-load on first command.** Rejected — hides the expensive async step, makes ordering non-deterministic, and couples every command path to Babylon.

## Consequences

- The facade module is import-safe in a pure-node environment; domain-integration tests can `import { ABB6700Facade }` and construct it with no Babylon mocks.
- Hosts must call `await load()` before expecting the arm to render — this is documented as the canonical two-step (construct, then load).
- The "attach the 3D view" behavior is inherently view-only and is marked `it.skip` in the facade PRD test (it requires a Babylon context to verify).
- `getState`/`applyState`/commands all work before `load()`, so a host can configure the starting pose and then load into the correct configuration.
