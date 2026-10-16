import { describe, it, expect, beforeEach } from "vitest";
import { Angle, makeAppObjectRepo } from "@vived/core";
import {
  ABB6700Entity,
  makeABB6700Entity,
  ABB_6700_DEFAULT_TRANSITION_DURATION_MS,
} from "../Entities/ABB6700Entity";
import type { ABB6700PathSegment } from "../Entities/ABB6700Path";
import type { ABB6700Pose } from "../UCs/SetPoseUC";
import {
  ABB6700PM,
  ABB6700PathVM,
  ABB6700VM,
  makeABB6700PM,
} from "./ABB6700PM";

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

    it("copies the entity transitionDurationMs into the VM", () => {
      entity.transitionDurationMs = 250;

      expect(viewObserver).toHaveBeenCalledOnce();
      const vm = viewObserver.mock.calls[0][0] as ABB6700VM;
      expect(vm.transitionDurationMs).toBe(250);
    });

    it("copies the entity snapCount into the VM", () => {
      entity.requestSnap();

      expect(viewObserver).toHaveBeenCalledOnce();
      const vm = viewObserver.mock.calls[0][0] as ABB6700VM;
      expect(vm.snapCount).toBe(1);
    });

    describe("path", () => {
      function poseOf(degrees: number): ABB6700Pose {
        return {
          j1: Angle.FromDegrees(degrees),
          j2: Angle.FromDegrees(degrees),
          j3: Angle.FromDegrees(degrees),
          j4: Angle.FromDegrees(degrees),
          j5: Angle.FromDegrees(degrees),
          j6: Angle.FromDegrees(degrees),
        };
      }

      const segments: ABB6700PathSegment[] = [
        { pose: poseOf(10), durationMs: 500, dwellMs: 200 },
        { pose: poseOf(20), durationMs: 800 },
      ];

      function lastVM(): ABB6700VM {
        const calls = viewObserver.mock.calls;
        return calls[calls.length - 1][0] as ABB6700VM;
      }

      it("is undefined when the entity has no path", () => {
        entity.requestSnap();

        expect(lastVM()).toHaveProperty("path", undefined);
      });

      it("is built from the entity path and the current segment", () => {
        entity.startPath(segments);

        expect(viewObserver).toHaveBeenCalledOnce();
        expect(lastVM().path).toEqual({
          playCount: 1,
          segmentIndex: 0,
          phase: "moving",
          durationMs: 500,
          dwellMs: 200,
          stopDurationMs: 0,
        });
      });

      it("reads the segment fields at segmentIndex, with dwellMs 0 when absent", () => {
        entity.path = {
          playCount: 4,
          segments,
          segmentIndex: 1,
          phase: "dwelling",
          stopDurationMs: 0,
        };

        expect(lastVM().path).toEqual({
          playCount: 4,
          segmentIndex: 1,
          phase: "dwelling",
          durationMs: 800,
          dwellMs: 0,
          stopDurationMs: 0,
        });
      });

      it("carries the stop duration while stopping", () => {
        entity.path = {
          playCount: 1,
          segments,
          segmentIndex: 0,
          phase: "stopping",
          stopDurationMs: 300,
        };

        expect(lastVM().path?.phase).toBe("stopping");
        expect(lastVM().path?.stopDurationMs).toBe(300);
      });

      it("returns to undefined when the entity path is cleared", () => {
        entity.startPath(segments);
        viewObserver.mockClear();

        entity.path = undefined;

        expect(viewObserver).toHaveBeenCalledOnce();
        expect(lastVM()).toHaveProperty("path", undefined);
      });

      it("does not emit again when the path is replaced by an equal-valued path", () => {
        entity.startPath(segments);
        viewObserver.mockClear();

        entity.path = {
          playCount: 1,
          segments,
          segmentIndex: 0,
          phase: "moving",
          stopDurationMs: 0,
        };

        expect(viewObserver).not.toHaveBeenCalled();
      });
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
        transitionDurationMs: ABB_6700_DEFAULT_TRANSITION_DURATION_MS,
        snapCount: 0,
        path: undefined,
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
        transitionDurationMs: ABB_6700_DEFAULT_TRANSITION_DURATION_MS,
        snapCount: 0,
        path: undefined,
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
        transitionDurationMs: ABB_6700_DEFAULT_TRANSITION_DURATION_MS,
        snapCount: 0,
        path: undefined,
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
        transitionDurationMs: ABB_6700_DEFAULT_TRANSITION_DURATION_MS,
        snapCount: 0,
        path: undefined,
      };

      expect(pm.vmsAreEqual(vm1, vm2)).toBe(false);
    });

    it("considers VMs with different transitionDurationMs as not equal", () => {
      const vm1: ABB6700VM = {
        j1: Angle.FromDegrees(0),
        j2: Angle.FromDegrees(0),
        j3: Angle.FromDegrees(0),
        j4: Angle.FromDegrees(0),
        j5: Angle.FromDegrees(0),
        j6: Angle.FromDegrees(0),
        stabilizerAngle: Angle.FromDegrees(0),
        stabilizerExtension: 0,
        transitionDurationMs: 1000,
        snapCount: 0,
        path: undefined,
      };
      const vm2: ABB6700VM = {
        ...vm1,
        transitionDurationMs: 250,
      };

      expect(pm.vmsAreEqual(vm1, vm2)).toBe(false);
    });

    it("considers VMs with different snapCount as not equal", () => {
      const vm1: ABB6700VM = {
        j1: Angle.FromDegrees(0),
        j2: Angle.FromDegrees(0),
        j3: Angle.FromDegrees(0),
        j4: Angle.FromDegrees(0),
        j5: Angle.FromDegrees(0),
        j6: Angle.FromDegrees(0),
        stabilizerAngle: Angle.FromDegrees(0),
        stabilizerExtension: 0,
        transitionDurationMs: ABB_6700_DEFAULT_TRANSITION_DURATION_MS,
        snapCount: 0,
        path: undefined,
      };
      const vm2: ABB6700VM = {
        ...vm1,
        snapCount: 1,
      };

      expect(pm.vmsAreEqual(vm1, vm2)).toBe(false);
    });

    describe("path", () => {
      const pathVM: ABB6700PathVM = {
        playCount: 1,
        segmentIndex: 0,
        phase: "moving",
        durationMs: 500,
        dwellMs: 200,
        stopDurationMs: 0,
      };
      const vmWithPath: ABB6700VM = {
        j1: Angle.FromDegrees(0),
        j2: Angle.FromDegrees(0),
        j3: Angle.FromDegrees(0),
        j4: Angle.FromDegrees(0),
        j5: Angle.FromDegrees(0),
        j6: Angle.FromDegrees(0),
        stabilizerAngle: Angle.FromDegrees(0),
        stabilizerExtension: 0,
        transitionDurationMs: ABB_6700_DEFAULT_TRANSITION_DURATION_MS,
        snapCount: 0,
        path: pathVM,
      };

      it("considers VMs with no path as equal", () => {
        const a: ABB6700VM = { ...vmWithPath, path: undefined };
        const b: ABB6700VM = { ...vmWithPath, path: undefined };

        expect(pm.vmsAreEqual(a, b)).toBe(true);
      });

      it("considers VMs with equal-valued path objects as equal", () => {
        const b: ABB6700VM = { ...vmWithPath, path: { ...pathVM } };

        expect(pm.vmsAreEqual(vmWithPath, b)).toBe(true);
      });

      it("considers a VM with a path and a VM without as not equal", () => {
        const withoutPath: ABB6700VM = { ...vmWithPath, path: undefined };

        expect(pm.vmsAreEqual(vmWithPath, withoutPath)).toBe(false);
        expect(pm.vmsAreEqual(withoutPath, vmWithPath)).toBe(false);
      });

      it.each<[string, Partial<ABB6700PathVM>]>([
        ["playCount", { playCount: 2 }],
        ["segmentIndex", { segmentIndex: 1 }],
        ["phase", { phase: "dwelling" }],
        ["durationMs", { durationMs: 600 }],
        ["dwellMs", { dwellMs: 300 }],
        ["stopDurationMs", { stopDurationMs: 100 }],
      ])("considers VMs with a different path %s as not equal", (_, change) => {
        const b: ABB6700VM = { ...vmWithPath, path: { ...pathVM, ...change } };

        expect(pm.vmsAreEqual(vmWithPath, b)).toBe(false);
      });
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
