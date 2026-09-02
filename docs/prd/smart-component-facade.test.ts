import { describe, it, expect, beforeEach, vi } from "vitest";
import { Angle, AppObjectRepo } from "@vived/core";
import { makeDomainForTesting } from "../../src/Domain/makeDomainForTesting";
import { ABB6700Facade, ABB_6700_STATE_VERSION } from "../../src/ABB6700Facade";
import { aBB6700PMAdapter } from "../../src/Domain/Adapters/aBB6700PMAdapter";
import type { ABB6700VM } from "../../src/Domain/PMs/ABB6700PM";
import { applyABB6700State } from "../../src/Domain/Controllers/applyABB6700State";
import type { ABB6700State } from "../../src/Domain/Entities/ABB6700State";

describe("PRD: smart-component-facade", () => {
  let appObjects: AppObjectRepo;
  let facade: ABB6700Facade;

  beforeEach(() => {
    ({ appObjects } = makeDomainForTesting());
    facade = new ABB6700Facade("arm-1", appObjects);
  });

  function readVM(): () => ABB6700VM | undefined {
    let vm: ABB6700VM | undefined;
    aBB6700PMAdapter.subscribe("arm-1", appObjects, (v) => {
      vm = v;
    });
    return () => vm;
  }

  describe("story-1: As a slide Activity, I want to construct an ABB 6700 facade synchronously, so that I can issue commands and read state before the 3D scene is ready.", () => {
    it("domain is fully wired immediately after construction: commands are callable and state is readable without calling `load()`", () => {
      facade.setJointAngle("j1", Angle.FromDegrees(30));

      expect(facade.getPose()?.j1.degrees).toBe(30);
      expect(facade.getState().j1).toBe(30);
    });

    it("construction does not require a Babylon context", () => {
      expect(() => new ABB6700Facade("arm-2", appObjects)).not.toThrow();
      expect(new ABB6700Facade("arm-3", appObjects).getState().version).toBe(
        ABB_6700_STATE_VERSION,
      );
    });
  });

  it.skip(
    "story-2: As a slide Activity, I want to call `load()` to attach the ABB 6700's 3D view to the scene, so that the arm renders when the scene is initialized.",
    // View-only — requires a Babylon context to verify view attachment and rendering
  );

  it("story-3: As a slide Activity, I want to call `destroy()` to tear down the component and release all resources, so that the arm is fully cleaned up when the activity ends.", () => {
    expect(appObjects.get("arm-1")).toBeDefined();

    facade.destroy();

    expect(appObjects.get("arm-1")).toBeUndefined();
  });

  it("story-4: As a slide Activity, I want to read the facade's `id`, so that I can identify the component instance by its string identifier.", () => {
    expect(facade.id).toBe("arm-1");
  });

  it("story-5: As an Activity author, I want `ABB6700Facade` to satisfy the SmartComponent structural convention, so that I can hold it as a uniform `SmartComponent` reference alongside instances of other smart components.", () => {
    expect(typeof facade.id).toBe("string");
    expect(typeof facade.interfaceVersion).toBe("number");
    expect(typeof facade.onEvent).toBe("function");
    expect(typeof facade.onViewModel).toBe("function");
    expect(typeof facade.load).toBe("function");
    expect(typeof facade.destroy).toBe("function");
    expect(typeof facade.getState).toBe("function");
    expect(typeof facade.applyState).toBe("function");
  });

  it("story-6: As a slide Activity, I want to call `facade.setJointAngle(joint, angle)` to rotate a single joint, so that I can command one axis of the arm without importing flat controllers.", () => {
    const vm = readVM();

    facade.setJointAngle("j2", Angle.FromDegrees(-15));

    expect(facade.getPose()?.j2.degrees).toBe(-15);
    expect(vm()?.j2.degrees).toBe(-15);
  });

  it("story-7: As a slide Activity, I want to call `facade.setPose(pose)` to move all six joints atomically, so that I can command the whole arm in one call.", () => {
    facade.setPose({
      j1: Angle.FromDegrees(1),
      j2: Angle.FromDegrees(2),
      j3: Angle.FromDegrees(3),
      j4: Angle.FromDegrees(4),
      j5: Angle.FromDegrees(5),
      j6: Angle.FromDegrees(6),
    });

    const pose = facade.getPose();
    expect(pose?.j1.degrees).toBe(1);
    expect(pose?.j2.degrees).toBe(2);
    expect(pose?.j3.degrees).toBe(3);
    expect(pose?.j4.degrees).toBe(4);
    expect(pose?.j5.degrees).toBe(5);
    expect(pose?.j6.degrees).toBe(6);
  });

  it("story-8: As a slide Activity, I want `facade.getState()` to return the six joint angles in degrees tagged with the current schema version, so that I can persist the arm's authored configuration.", () => {
    facade.setPose({
      j1: Angle.FromDegrees(10),
      j2: Angle.FromDegrees(20),
      j3: Angle.FromDegrees(30),
      j4: Angle.FromDegrees(40),
      j5: Angle.FromDegrees(50),
      j6: Angle.FromDegrees(60),
    });

    expect(facade.getState()).toEqual({
      version: ABB_6700_STATE_VERSION,
      j1: 10,
      j2: 20,
      j3: 30,
      j4: 40,
      j5: 50,
      j6: 60,
    });
  });

  describe("story-9: As a slide Activity, I want `facade.applyState(state)` to restore a saved snapshot, so that the arm comes up in the authored configuration.", () => {
    it("a snapshot whose version matches the current schema version sets all six joints", () => {
      facade.applyState({
        version: ABB_6700_STATE_VERSION,
        j1: 11,
        j2: 22,
        j3: 33,
        j4: 44,
        j5: 55,
        j6: 66,
      });

      expect(facade.getState()).toEqual({
        version: ABB_6700_STATE_VERSION,
        j1: 11,
        j2: 22,
        j3: 33,
        j4: 44,
        j5: 55,
        j6: 66,
      });
    });

    it.todo(
      "a snapshot whose version does not match is still applied — never rejected, never a no-op",
    );

    it.todo(
      "a snapshot missing a joint falls back to that joint's entity default rather than producing an invalid angle",
    );
  });

  describe("story-10: As a slide Activity, I want `facade.onViewModel(cb)` to deliver the current view model and every subsequent change, returning an unsubscribe function, so that my UI stays in sync with the arm.", () => {
    it("the subscriber receives an update when a joint changes", () => {
      const seen: number[] = [];
      facade.onViewModel((vm) => {
        seen.push(vm.j1.degrees);
      });

      facade.setJointAngle("j1", Angle.FromDegrees(25));

      expect(seen).toContain(25);
    });

    it("the returned unsubscribe function stops further updates", () => {
      const seen: number[] = [];
      const unsubscribe = facade.onViewModel((vm) => {
        seen.push(vm.j1.degrees);
      });

      facade.setJointAngle("j1", Angle.FromDegrees(25));
      unsubscribe();
      facade.setJointAngle("j1", Angle.FromDegrees(35));

      expect(seen).toContain(25);
      expect(seen).not.toContain(35);
    });
  });

  it("story-11: As a slide Activity, I want `facade.onEvent(...)` to return a valid unsubscribe function even though the ABB 6700 emits no events, so that the facade satisfies the SmartComponent contract uniformly.", () => {
    const unsubscribe = facade.onEvent("ignored", () => {});

    expect(unsubscribe).toEqual(expect.any(Function));
    expect(() => unsubscribe()).not.toThrow();
  });

  describe("story-12: As a consuming app's SerializedSystem, I want to call `getABB6700State(id, appObjects, version)` to snapshot an arm without constructing a facade, so that persistence stays a domain→domain concern and never imports a view-construction artifact.", () => {
    it.todo(
      "returns the six joint angles in degrees tagged with the requested version",
    );

    it.todo(
      "an id with no arm behind it resolves to the default state rather than throwing",
    );
  });

  describe("story-13: As a consuming app's SerializedSystem, I want to call `applyABB6700State(id, appObjects, state)` to restore a snapshot without constructing a facade, so that a saved arm configuration is applied through the domain seam.", () => {
    it("a snapshot whose version matches the current schema version sets all six joints", () => {
      const vm = readVM();

      applyABB6700State("arm-1", appObjects, {
        version: ABB_6700_STATE_VERSION,
        j1: 11,
        j2: 22,
        j3: 33,
        j4: 44,
        j5: 55,
        j6: 66,
      });

      expect(vm()?.j1.degrees).toBe(11);
      expect(vm()?.j2.degrees).toBe(22);
      expect(vm()?.j3.degrees).toBe(33);
      expect(vm()?.j4.degrees).toBe(44);
      expect(vm()?.j5.degrees).toBe(55);
      expect(vm()?.j6.degrees).toBe(66);
    });

    it("a snapshot whose version does not match is still applied — never rejected, never a no-op", () => {
      const vm = readVM();

      applyABB6700State("arm-1", appObjects, {
        version: ABB_6700_STATE_VERSION + 999,
        j1: 11,
        j2: 22,
        j3: 33,
        j4: 44,
        j5: 55,
        j6: 66,
      });

      expect(vm()?.j1.degrees).toBe(11);
      expect(vm()?.j2.degrees).toBe(22);
      expect(vm()?.j3.degrees).toBe(33);
      expect(vm()?.j4.degrees).toBe(44);
      expect(vm()?.j5.degrees).toBe(55);
      expect(vm()?.j6.degrees).toBe(66);
    });

    it("a snapshot missing a joint falls back to that joint's entity default rather than producing an invalid angle", () => {
      const vm = readVM();

      const snapshot = {
        version: ABB_6700_STATE_VERSION,
        j1: 11,
        j2: 22,
        j3: 33,
        j5: 55,
        j6: 66,
      } as unknown as ABB6700State;

      applyABB6700State("arm-1", appObjects, snapshot);

      expect(vm()?.j1.degrees).toBe(11);
      expect(vm()?.j2.degrees).toBe(22);
      expect(vm()?.j3.degrees).toBe(33);
      expect(vm()?.j4.degrees).toBe(0);
      expect(vm()?.j5.degrees).toBe(55);
      expect(vm()?.j6.degrees).toBe(66);
      expect(Number.isNaN(vm()?.j4.degrees)).toBe(false);
    });

    it("an id with no arm behind it submits a warning and leaves the domain untouched", () => {
      const warnSpy = vi.spyOn(appObjects, "submitWarning");
      const vm = readVM();

      applyABB6700State("no-arm-here", appObjects, {
        version: ABB_6700_STATE_VERSION,
        j1: 11,
        j2: 22,
        j3: 33,
        j4: 44,
        j5: 55,
        j6: 66,
      });

      expect(warnSpy).toHaveBeenCalled();
      expect(vm()?.j1.degrees).toBe(0);
      expect(vm()?.j2.degrees).toBe(0);
      expect(vm()?.j3.degrees).toBe(0);
      expect(vm()?.j4.degrees).toBe(0);
      expect(vm()?.j5.degrees).toBe(0);
      expect(vm()?.j6.degrees).toBe(0);
    });
  });

  describe("story-14: As a slide Activity, I want the facade and the standalone state controllers to be interchangeable for reading and writing state, so that I can mix the two seams without them diverging.", () => {
    it.todo(
      "state written through `facade.applyState` is readable through `getABB6700State`",
    );

    it.todo(
      "state written through `applyABB6700State` is readable through `facade.getState`",
    );
  });
});
