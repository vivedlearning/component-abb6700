import { describe, it, expect, beforeEach, vi } from "vitest";
import { Angle, makeAppObjectRepo } from "@vived/core";
import {
  ABB6700Entity,
  makeABB6700Entity,
  ABB_6700_DEFAULT_TRANSITION_DURATION_MS,
} from "./ABB6700Entity";
import type { ABB6700PathProgress, ABB6700PathSegment } from "./ABB6700Path";
import type { ABB6700Pose } from "./ABB6700Pose";

describe("ABB6700Entity", () => {
  let appObjects: ReturnType<typeof makeAppObjectRepo>;

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
  });

  describe("Construction and Default State", () => {
    it("creates with correct default joint angles (0 degrees)", () => {
      const appObject = appObjects.getOrCreate("test-arm");
      const entity = makeABB6700Entity(appObject);

      expect(entity.j1.degrees).toBe(0);
      expect(entity.j2.degrees).toBe(0);
      expect(entity.j3.degrees).toBe(0);
      expect(entity.j4.degrees).toBe(0);
      expect(entity.j5.degrees).toBe(0);
      expect(entity.j6.degrees).toBe(0);
    });

    it("registers itself on the AppObject during construction", () => {
      const appObject = appObjects.getOrCreate("test-arm");
      const entity = makeABB6700Entity(appObject);

      const retrieved = appObject.getComponent(ABB6700Entity.type);
      expect(retrieved).toBe(entity);
    });
  });

  describe("Static Helper Methods", () => {
    describe("get()", () => {
      it("returns undefined when component doesn't exist", () => {
        const appObject = appObjects.getOrCreate("test-arm");
        const result = ABB6700Entity.get(appObject);
        expect(result).toBeUndefined();
      });

      it("returns the component when it exists", () => {
        const appObject = appObjects.getOrCreate("test-arm");
        const entity = makeABB6700Entity(appObject);
        const result = ABB6700Entity.get(appObject);
        expect(result).toBe(entity);
      });
    });

    describe("getById()", () => {
      it("returns undefined when AppObject doesn't exist", () => {
        const result = ABB6700Entity.getById("nonexistent", appObjects);
        expect(result).toBeUndefined();
      });

      it("returns undefined when AppObject exists but component doesn't", () => {
        appObjects.getOrCreate("test-arm");
        const result = ABB6700Entity.getById("test-arm", appObjects);
        expect(result).toBeUndefined();
      });

      it("returns the component when both AppObject and component exist", () => {
        const appObject = appObjects.getOrCreate("test-arm");
        const entity = makeABB6700Entity(appObject);
        const result = ABB6700Entity.getById("test-arm", appObjects);
        expect(result).toBe(entity);
      });
    });

    describe("addIfMissing()", () => {
      it("creates new component when none exists", () => {
        const appObject = appObjects.getOrCreate("test-arm");
        const entity = ABB6700Entity.addIfMissing(appObject);

        expect(entity.j1.degrees).toBe(0);
        expect(ABB6700Entity.get(appObject)).toBe(entity);
      });

      it("returns existing component when it already exists", () => {
        const appObject = appObjects.getOrCreate("test-arm");
        const originalEntity = makeABB6700Entity(appObject);
        const retrievedEntity = ABB6700Entity.addIfMissing(appObject);

        expect(retrievedEntity).toBe(originalEntity);
      });
    });
  });

  describe("Joint Angle Getters and Setters", () => {
    let entity: ABB6700Entity;

    beforeEach(() => {
      const appObject = appObjects.getOrCreate("test-arm");
      entity = makeABB6700Entity(appObject);
    });

    it("can set and get j1 angle", () => {
      entity.j1 = Angle.FromDegrees(45);
      expect(entity.j1.degrees).toBe(45);
    });

    it("can set and get j2 angle", () => {
      entity.j2 = Angle.FromDegrees(90);
      expect(entity.j2.degrees).toBe(90);
    });

    it("can set and get j3 angle", () => {
      entity.j3 = Angle.FromDegrees(-30);
      expect(entity.j3.degrees).toBe(-30);
    });

    it("can set and get j4 angle", () => {
      entity.j4 = Angle.FromDegrees(180);
      expect(entity.j4.degrees).toBe(180);
    });

    it("can set and get j5 angle", () => {
      entity.j5 = Angle.FromDegrees(60);
      expect(entity.j5.degrees).toBe(60);
    });

    it("can set and get j6 angle", () => {
      entity.j6 = Angle.FromDegrees(-90);
      expect(entity.j6.degrees).toBe(-90);
    });

    it("joints are independent of each other", () => {
      entity.j1 = Angle.FromDegrees(10);
      entity.j2 = Angle.FromDegrees(20);
      entity.j3 = Angle.FromDegrees(30);
      entity.j4 = Angle.FromDegrees(40);
      entity.j5 = Angle.FromDegrees(50);
      entity.j6 = Angle.FromDegrees(60);

      expect(entity.j1.degrees).toBe(10);
      expect(entity.j2.degrees).toBe(20);
      expect(entity.j3.degrees).toBe(30);
      expect(entity.j4.degrees).toBe(40);
      expect(entity.j5.degrees).toBe(50);
      expect(entity.j6.degrees).toBe(60);
    });
  });

  describe("Change Notifications", () => {
    let entity: ABB6700Entity;

    beforeEach(() => {
      const appObject = appObjects.getOrCreate("test-arm");
      entity = makeABB6700Entity(appObject);
    });

    it("notifies observers when j1 changes", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.j1 = Angle.FromDegrees(45);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("notifies observers when j2 changes", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.j2 = Angle.FromDegrees(45);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("notifies observers when j3 changes", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.j3 = Angle.FromDegrees(45);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("notifies observers when j4 changes", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.j4 = Angle.FromDegrees(45);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("notifies observers when j5 changes", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.j5 = Angle.FromDegrees(45);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("notifies observers when j6 changes", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.j6 = Angle.FromDegrees(45);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("does not notify observers when setting the same value", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.j1 = Angle.FromDegrees(0); // Same as default
      expect(observer).not.toHaveBeenCalled();
    });

    it("allows observer removal", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.removeChangeObserver(observer);
      entity.j1 = Angle.FromDegrees(45);
      expect(observer).not.toHaveBeenCalled();
    });
  });

  describe("Multiple Arms Independence", () => {
    it("maintains independent state for multiple arms", () => {
      const appObject1 = appObjects.getOrCreate("arm-1");
      const appObject2 = appObjects.getOrCreate("arm-2");

      const entity1 = makeABB6700Entity(appObject1);
      const entity2 = makeABB6700Entity(appObject2);

      entity1.j1 = Angle.FromDegrees(45);

      expect(entity2.j1.degrees).toBe(0);
    });
  });

  describe("Stabilizer Computation", () => {
    let entity: ABB6700Entity;

    beforeEach(() => {
      const appObject = appObjects.getOrCreate("test-arm");
      entity = makeABB6700Entity(appObject);
    });

    it("defaults to zero angle and extension", () => {
      expect(entity.stabilizerAngle.radians).toBe(0);
      expect(entity.stabilizerExtension).toBe(0);
    });

    it("can set and get stabilizerAngle", () => {
      entity.stabilizerAngle = Angle.FromDegrees(15);
      expect(entity.stabilizerAngle.degrees).toBe(15);
    });

    it("can set and get stabilizerExtension", () => {
      entity.stabilizerExtension = 0.05;
      expect(entity.stabilizerExtension).toBe(0.05);
    });
  });

  describe("Transition Duration", () => {
    let entity: ABB6700Entity;

    beforeEach(() => {
      const appObject = appObjects.getOrCreate("test-arm");
      entity = makeABB6700Entity(appObject);
    });

    it("defaults to ABB_6700_DEFAULT_TRANSITION_DURATION_MS", () => {
      expect(entity.transitionDurationMs).toBe(
        ABB_6700_DEFAULT_TRANSITION_DURATION_MS,
      );
    });

    it("can set and get transitionDurationMs", () => {
      entity.transitionDurationMs = 250;
      expect(entity.transitionDurationMs).toBe(250);
    });

    it("notifies observers when transitionDurationMs changes", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.transitionDurationMs = 250;
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("does not notify observers when setting the same value", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.transitionDurationMs = ABB_6700_DEFAULT_TRANSITION_DURATION_MS;
      expect(observer).not.toHaveBeenCalled();
    });
  });

  describe("Snap Count", () => {
    let entity: ABB6700Entity;

    beforeEach(() => {
      const appObject = appObjects.getOrCreate("test-arm");
      entity = makeABB6700Entity(appObject);
    });

    it("defaults to 0", () => {
      expect(entity.snapCount).toBe(0);
    });

    it("requestSnap increments the count", () => {
      entity.requestSnap();
      expect(entity.snapCount).toBe(1);

      entity.requestSnap();
      expect(entity.snapCount).toBe(2);
    });

    it("requestSnap notifies observers", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.requestSnap();
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("requestSnap notifies observers even when called again with no other change", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.requestSnap();
      entity.requestSnap();
      expect(observer).toHaveBeenCalledTimes(2);
    });
  });

  describe("Path", () => {
    let entity: ABB6700Entity;

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

    function makeSegments(): ABB6700PathSegment[] {
      return [
        { pose: poseOf(10), durationMs: 500, dwellMs: 200 },
        { pose: poseOf(20), durationMs: 800 },
      ];
    }

    function makeProgress(): ABB6700PathProgress {
      return {
        playCount: 0,
        segments: makeSegments(),
        segmentIndex: 0,
        phase: "moving",
        stopDurationMs: 0,
      };
    }

    beforeEach(() => {
      const appObject = appObjects.getOrCreate("test-arm");
      entity = makeABB6700Entity(appObject);
    });

    it("defaults to undefined", () => {
      expect(entity.path).toBeUndefined();
    });

    it("can set and get path", () => {
      const progress = makeProgress();
      entity.path = progress;
      expect(entity.path).toBe(progress);
    });

    it("notifies observers when path is set to a new reference", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.path = makeProgress();
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("notifies observers when path is replaced by an equal-valued object", () => {
      entity.path = makeProgress();
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.path = makeProgress();
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("does not notify observers when setting the same reference", () => {
      const progress = makeProgress();
      entity.path = progress;
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.path = progress;
      expect(observer).not.toHaveBeenCalled();
    });

    it("notifies observers when path is cleared", () => {
      entity.path = makeProgress();
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.path = undefined;
      expect(entity.path).toBeUndefined();
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("does not notify observers when clearing an already-undefined path", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.path = undefined;
      expect(observer).not.toHaveBeenCalled();
    });

    describe("startPath()", () => {
      it("starts at the first segment, moving, with no stop duration", () => {
        const segments = makeSegments();
        entity.startPath(segments);

        expect(entity.path).toEqual({
          playCount: 1,
          segments,
          segmentIndex: 0,
          phase: "moving",
          stopDurationMs: 0,
        });
      });

      it("notifies observers once", () => {
        const observer = vi.fn();
        entity.addChangeObserver(observer);
        entity.startPath(makeSegments());
        expect(observer).toHaveBeenCalledTimes(1);
      });

      it("does not write the joints", () => {
        entity.startPath(makeSegments());

        expect(entity.j1.degrees).toBe(0);
        expect(entity.j2.degrees).toBe(0);
        expect(entity.j3.degrees).toBe(0);
        expect(entity.j4.degrees).toBe(0);
        expect(entity.j5.degrees).toBe(0);
        expect(entity.j6.degrees).toBe(0);
      });

      it("keeps a copy of the segment list", () => {
        const segments = makeSegments();
        entity.startPath(segments);
        segments.pop();

        expect(entity.path?.segments).toHaveLength(2);
        expect(entity.path?.segments).not.toBe(segments);
      });

      it("keeps a copy of each segment and its pose", () => {
        const segments = makeSegments();
        const firstDuration = segments[0].durationMs;
        const firstJ1 = segments[0].pose.j1;
        entity.startPath(segments);

        segments[0].durationMs = NaN;
        segments[0].dwellMs = 999;
        segments[0].pose.j1 = Angle.FromDegrees(99);

        expect(entity.path?.segments[0].durationMs).toBe(firstDuration);
        expect(entity.path?.segments[0].dwellMs).not.toBe(999);
        expect(entity.path?.segments[0].pose.j1).toBe(firstJ1);
      });

      it("increments the play count on every call and never resets it", () => {
        const playCount = () => entity.path?.playCount;

        entity.startPath(makeSegments());
        expect(playCount()).toBe(1);

        entity.startPath(makeSegments());
        expect(playCount()).toBe(2);

        entity.path = undefined;
        entity.startPath(makeSegments());
        expect(playCount()).toBe(3);
      });

      it("replaces a path already in progress", () => {
        entity.startPath(makeSegments());
        entity.path = { ...makeProgress(), segmentIndex: 1, phase: "dwelling" };

        entity.startPath(makeSegments());

        expect(entity.path?.segmentIndex).toBe(0);
        expect(entity.path?.phase).toBe("moving");
      });
    });
  });
});
