import { describe, it, expect, beforeEach } from "vitest";
import { Angle, makeAppObjectRepo } from "@vived/core";
import { ABB6700Entity, makeABB6700Entity } from "../Entities/ABB6700Entity";
import { ABB6700PM, ABB6700VM, makeABB6700PM } from "./ABB6700PM";

describe("ABB6700PM", () => {
  let appObjects: ReturnType<typeof makeAppObjectRepo>;

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
  });

  describe("Construction and Initialization", () => {
    it("creates PM with correct type registration", () => {
      const appObject = appObjects.getOrCreate("test-arm");
      makeABB6700Entity(appObject);
      const pm = makeABB6700PM(appObject);

      expect(pm).toBeDefined();
      expect(pm.appObject.id).toBe("test-arm");

      const retrieved = appObject.getComponent(ABB6700PM.type);
      expect(retrieved).toBe(pm);
    });

    it("generates initial view model when entity exists", () => {
      const appObject = appObjects.getOrCreate("test-arm");
      makeABB6700Entity(appObject);

      const viewObserver = vi.fn();
      const pm = makeABB6700PM(appObject);
      pm.addView(viewObserver);

      expect(viewObserver).toHaveBeenCalledTimes(1);

      const initialVM = viewObserver.mock.calls[0][0] as ABB6700VM;
      expect(initialVM.j1.degrees).toBe(0);
      expect(initialVM.j2.degrees).toBe(0);
      expect(initialVM.j3.degrees).toBe(0);
      expect(initialVM.j4.degrees).toBe(0);
      expect(initialVM.j5.degrees).toBe(0);
      expect(initialVM.j6.degrees).toBe(0);
    });

    it("handles missing entity gracefully during construction", () => {
      const appObject = appObjects.getOrCreate("test-arm");

      expect(() => makeABB6700PM(appObject)).not.toThrow();

      const pm = makeABB6700PM(appObject);
      const viewObserver = vi.fn();
      pm.addView(viewObserver);

      expect(viewObserver).not.toHaveBeenCalled();
    });
  });

  describe("Static Helper Methods", () => {
    describe("get()", () => {
      it("returns undefined when component doesn't exist", () => {
        const appObject = appObjects.getOrCreate("test-arm");
        const result = ABB6700PM.get(appObject);
        expect(result).toBeUndefined();
      });

      it("returns the component when it exists", () => {
        const appObject = appObjects.getOrCreate("test-arm");
        makeABB6700Entity(appObject);
        const pm = makeABB6700PM(appObject);
        const result = ABB6700PM.get(appObject);
        expect(result).toBe(pm);
      });
    });

    describe("getById()", () => {
      it("returns undefined when AppObject doesn't exist", () => {
        const result = ABB6700PM.getById("nonexistent", appObjects);
        expect(result).toBeUndefined();
      });

      it("returns the component when both AppObject and component exist", () => {
        const appObject = appObjects.getOrCreate("test-arm");
        makeABB6700Entity(appObject);
        const pm = makeABB6700PM(appObject);
        const result = ABB6700PM.getById("test-arm", appObjects);
        expect(result).toBe(pm);
      });
    });
  });

  describe("View Model Generation", () => {
    let pm: ABB6700PM;
    let entity: ABB6700Entity;
    let viewObserver: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      const appObject = appObjects.getOrCreate("test-arm");
      entity = makeABB6700Entity(appObject);
      pm = makeABB6700PM(appObject);
      viewObserver = vi.fn();
      pm.addView(viewObserver);
      viewObserver.mockClear();
    });

    it("generates correct VM when j1 changes", () => {
      entity.j1 = Angle.FromDegrees(45);

      expect(viewObserver).toHaveBeenCalledOnce();
      const vm = viewObserver.mock.calls[0][0] as ABB6700VM;
      expect(vm.j1.degrees).toBe(45);
    });

    it("generates correct VM when all joints change", () => {
      entity.j1 = Angle.FromDegrees(10);
      entity.j2 = Angle.FromDegrees(20);
      entity.j3 = Angle.FromDegrees(30);
      entity.j4 = Angle.FromDegrees(40);
      entity.j5 = Angle.FromDegrees(50);
      entity.j6 = Angle.FromDegrees(60);

      const lastVM = viewObserver.mock.calls[
        viewObserver.mock.calls.length - 1
      ][0] as ABB6700VM;
      expect(lastVM.j1.degrees).toBe(10);
      expect(lastVM.j2.degrees).toBe(20);
      expect(lastVM.j3.degrees).toBe(30);
      expect(lastVM.j4.degrees).toBe(40);
      expect(lastVM.j5.degrees).toBe(50);
      expect(lastVM.j6.degrees).toBe(60);
    });
  });

  describe("VM Comparison Logic", () => {
    let pm: ABB6700PM;

    beforeEach(() => {
      const appObject = appObjects.getOrCreate("test-arm");
      makeABB6700Entity(appObject);
      pm = makeABB6700PM(appObject);
    });

    it("considers identical VMs as equal", () => {
      const vm1: ABB6700VM = {
        j1: Angle.FromDegrees(10),
        j2: Angle.FromDegrees(20),
        j3: Angle.FromDegrees(30),
        j4: Angle.FromDegrees(40),
        j5: Angle.FromDegrees(50),
        j6: Angle.FromDegrees(60),
        stabilizerAngle: Angle.FromDegrees(5),
        stabilizerExtension: 0.01,
      };
      const vm2: ABB6700VM = {
        j1: Angle.FromDegrees(10),
        j2: Angle.FromDegrees(20),
        j3: Angle.FromDegrees(30),
        j4: Angle.FromDegrees(40),
        j5: Angle.FromDegrees(50),
        j6: Angle.FromDegrees(60),
        stabilizerAngle: Angle.FromDegrees(5),
        stabilizerExtension: 0.01,
      };

      expect(pm.vmsAreEqual(vm1, vm2)).toBe(true);
    });

    it("considers VMs with different j1 as not equal", () => {
      const vm1: ABB6700VM = {
        j1: Angle.FromDegrees(10),
        j2: Angle.FromDegrees(0),
        j3: Angle.FromDegrees(0),
        j4: Angle.FromDegrees(0),
        j5: Angle.FromDegrees(0),
        j6: Angle.FromDegrees(0),
        stabilizerAngle: Angle.FromDegrees(0),
        stabilizerExtension: 0,
      };
      const vm2: ABB6700VM = {
        j1: Angle.FromDegrees(20),
        j2: Angle.FromDegrees(0),
        j3: Angle.FromDegrees(0),
        j4: Angle.FromDegrees(0),
        j5: Angle.FromDegrees(0),
        j6: Angle.FromDegrees(0),
        stabilizerAngle: Angle.FromDegrees(0),
        stabilizerExtension: 0,
      };

      expect(pm.vmsAreEqual(vm1, vm2)).toBe(false);
    });
  });

  describe("Lifecycle Management", () => {
    it("removes entity observer during disposal", () => {
      const appObject = appObjects.getOrCreate("test-arm");
      const entity = makeABB6700Entity(appObject);
      const pm = makeABB6700PM(appObject);
      const removeObserverSpy = vi.spyOn(entity, "removeChangeObserver");

      pm.dispose();

      expect(removeObserverSpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it("handles disposal gracefully when entity is missing", () => {
      const appObject = appObjects.getOrCreate("no-entity-arm");
      const pm = makeABB6700PM(appObject);

      expect(() => pm.dispose()).not.toThrow();
    });

    it("stops emitting view updates after disposal", () => {
      const appObject = appObjects.getOrCreate("test-arm");
      const entity = makeABB6700Entity(appObject);
      const pm = makeABB6700PM(appObject);
      const viewObserver = vi.fn();
      pm.addView(viewObserver);
      viewObserver.mockClear();

      pm.dispose();
      entity.j1 = Angle.FromDegrees(45);

      expect(viewObserver).not.toHaveBeenCalled();
    });
  });
});
