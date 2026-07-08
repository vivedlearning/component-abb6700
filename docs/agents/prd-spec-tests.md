# PRD spec tests — the standard scaffold

PRD tests in `docs/prd/<slug>.test.ts` are **domain-integration tests**. They wire the
full production domain, act on it the way the outside world does, and assert the way the
outside world observes it. They never reach inside the domain.

This document is the single source of truth for the `beforeEach` scaffold. The
`vived-prd`, `vived-architect`, and `vived-ralph` skills all defer to it.

## Core rules

1. **Set up the domain with `makeDomainForTesting()` — nothing else.**
   Do not call `makeAppObjectRepo()`, build a `DomainFactoryRepo`, or create entities by
   hand. The harness wires everything exactly as production does.
2. **Act through a Controller or an inbound Dispatch.**
   - A **Controller** translates a UI intent into the domain (e.g. `someController(...)`).
   - An **inbound Dispatch** simulates the Host sending a Request: `domain.appHandler({ type, version, payload })`.
3. **Assert through an Adapter's view model or an outbound Dispatch.**
   - **Adapter / VM:** subscribe a mock view to a PM adapter and assert the view model it
     receives once the PM observes the entity change.
   - **Outbound Dispatch:** assert the Request the app sent the Host, captured in
     `domain.hostDispatches`.
4. **Never reach into domain internals.** Do not import or spy on Entities, Use Cases, or
   PMs to assert behaviour. The only exception is a **framework-implemented Use Case** (an
   abstract UC in `src/Domain/**` whose only concrete subclass lives under
   `src/Frameworks/**`, e.g. Babylon pointer UCs). Those have no implementation in a test,
   so register a reusable test double from the feature's `Mocks/` folder in `beforeEach`.
5. **A serialized system is tested only through a state Dispatch — never by calling its
   serializer.** Calling a `SerializedSystem`'s `applySystemState` / `getSystemState`
   directly is a forbidden shortcut (a serializer is a Use Case — rule 4): it bypasses the
   `StateMachineEntity`, including its **apply-default-for-any-absent-system** branch, which
   is exactly where serialization defects hide. Act through `appHandler` with a
   `SET_APP_STATE` Request whose `finalState` carries — or deliberately omits — the system.
   See *Serialized systems* below.

## The harness

`makeDomainForTesting()` (in `src/Domain/makeDomainForTesting.ts`) returns:

| Field            | Use                                                                  |
| ---------------- | -------------------------------------------------------------------- |
| `appObjects`     | Resolve controllers and adapters from the live repo.                 |
| `appHandler`     | Dispatch a Request INTO the app, as the Host would. *(full-app projects)* |
| `hostDispatches` | Array of every Request the app dispatched OUT to the Host, in order. *(full-app projects)* |

> **Smart component projects** return only `appObjects` — there is no `appHandler` or
> `hostDispatches`. Act through the component's Controllers; assert through its PM Adapter.

## Standard `beforeEach`

```ts
import { describe, it, beforeEach, expect, vi } from "vitest";
import {
  makeDomainForTesting,
  DomainForTesting
} from "../../src/Domain/makeDomainForTesting";

describe("PRD: <slug>", () => {
  let domain: DomainForTesting;

  beforeEach(() => {
    domain = makeDomainForTesting();

    // For any framework-implemented UC a story touches, register its reusable
    // test double here so the domain has a concrete implementation under test:
    //
    //   const appObject = domain.appObjects.getOrCreate("<FeatureName>");
    //   appObject.addComponent(new MockSomeFrameworkUC(appObject));
  });

  // --- Story stubs ---
  // it.todo = not yet implemented · it() = done · it.skip = view-only
  // Story text must be verbatim from the PRD.

  // Single-criterion story → flat it.todo:
  it.todo("story-1: <verbatim story text from PRD>");

  // Multi-criterion story → describe block, one it.todo per acceptance criterion:
  describe("story-2: <verbatim story text from PRD>", () => {
    it.todo("<ac-name>: <verbatim acceptance-criterion text from PRD>");
    it.todo("<ac-name>: <verbatim acceptance-criterion text from PRD>");
  });
});
```

## Story layout: flat vs. `describe` block

A story maps to the test file in one of three ways, mirroring the acceptance criteria in the
PRD:

| Story shape                       | Test layout                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| Single acceptance criterion       | Flat `it.todo("story-N: <verbatim story text>")`                                            |
| Multiple acceptance criteria      | `describe("story-N: <verbatim story text>", () => { it.todo("<ac-name>: <verbatim AC>") })` |
| View-only (purely visual/pointer) | `it.skip("story-N: <verbatim story text>") // View-only — <reason>`                         |

A multi-criterion story lets one story cover its happy path **and** its edge cases — each
acceptance criterion becomes its own `it` inside the story's `describe` block. The acceptance
criteria are the verbatim sub-bullets under that story in the PRD.

`vived-prd` owns this structure and reconciles it whenever stories or acceptance criteria are
added, changed, or removed. See [`docs/prd/README.md`](../prd/README.md) for the PRD ↔ test
contract.

## Asserting via an Adapter (the common case)

A Controller acts; a PM observes the entity change; the adapter pushes a new VM to the
mock view.

```ts
it("story-N: ...", () => {
  let vm: SomeVM | undefined;
  someSingletonPmAdapter.subscribe(domain.appObjects, (v) => (vm = v));

  someController(domain.appObjects); // ACT — a Controller

  expect(vm?.someField).toBe(expectedValue); // ASSERT — the VM the view received
});
```

## Asserting via an outbound Dispatch

*(Full-app projects only — `domain.hostDispatches` is not present in smart component projects.)*

```ts
it("story-N: ...", () => {
  someController(domain.appObjects); // ACT

  const sent = domain.hostDispatches.find((r) => r.type === "SOME_REQUEST");
  expect(sent?.payload).toEqual(expectedPayload); // ASSERT — Request sent to Host
});
```

## Acting via an inbound Dispatch (Host → app)

*(Full-app projects only — `domain.appHandler` is not present in smart component projects.)*

```ts
it("story-N: ...", () => {
  domain.appHandler({ type: "SOME_HOST_REQUEST", version: 1, payload: {...} }); // ACT

  expect(vm?.someField).toBe(expectedValue); // ASSERT via adapter as above
});
```

## Serialized systems (per-Slide persisted state)

*(Full-app projects using `@vived/app`'s `StateMachineEntity` only.)*

A feature that persists per-Slide state implements a `SerializedSystem` (registered with the
`StateMachineEntity`). The Host applies a Slide's state by sending a `SET_APP_STATE` Request;
the state machine then calls `applySystemState` on each system **present** in `finalState.systems`,
and `applyDefaultState` on every registered system that is **absent**. Both paths are
load-bearing — and the absent path is a frequent source of defects.

**Test the round-trip, not the serializer.** Act through `appHandler` with a `SET_APP_STATE`
Request, assert through the resulting Adapter VM:

```ts
it("story-N: dispatching a Slide state applies that system's persisted value", () => {
  domain.appHandler({
    type: "SET_APP_STATE",
    version: 3,
    payload: {
      finalState: {
        version: 2,
        systems: [
          { seriliziationVersion: 1, name: "<system-name>", state: { /* the persisted shape */ } }
        ]
      },
      hideNavigation: false,
      hasNextSlide: false,
      hasPreviousSlide: false
    }
  });

  expect(vm?.someField).toBe(expectedValue); // ASSERT via the Adapter VM
});
```

Cover **both** paths:

- **present** — `finalState` includes the system → its persisted value is applied.
- **absent** — `finalState` omits the system → `applyDefaultState` resolves to the safe default.

Do **not** import the serializer and call `applySystemState` / `getSystemState` directly (rule 5).

The file must compile clean and run with **zero failures** — every unimplemented story (or
acceptance criterion) stays `it.todo`, including those nested inside a `describe` block. Zero
todos *anywhere* + all green = the PRD is fully implemented.
