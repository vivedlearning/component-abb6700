import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  Angle,
  AppObject,
  AppObjectRepo,
  makeAppObjectRepo,
} from "@vived/core";
import { makeABB6700Entity, ABB6700Entity } from "../Entities/ABB6700Entity";
import type { ABB6700PathSegment } from "../Entities/ABB6700Path";
import { PlayPathUC, makePlayPathUC } from "./PlayPathUC";
import type { ABB6700Pose } from "./SetPoseUC";

const makePose = (degrees: number): ABB6700Pose => ({
  j1: Angle.FromDegrees(degrees),
  j2: Angle.FromDegrees(degrees + 1),
  j3: Angle.FromDegrees(degrees + 2),
  j4: Angle.FromDegrees(degrees + 3),
  j5: Angle.FromDegrees(degrees + 4),
  j6: Angle.FromDegrees(degrees + 5),
});

const makeSegment = (degrees: number, dwellMs?: number): ABB6700PathSegment =>
  dwellMs === undefined
    ? { pose: makePose(degrees), durationMs: 500 }
    : { pose: makePose(degrees), durationMs: 500, dwellMs };

const makeSegments = (): ABB6700PathSegment[] => [
  makeSegment(10, 100),
  makeSegment(20, 100),
  makeSegment(30, 100),
];

const jointsOf = (degrees: number) => [
  degrees,
  degrees + 1,
  degrees + 2,
  degrees + 3,
  degrees + 4,
  degrees + 5,
];

describe("PlayPathUC", () => {
  let appObjects: AppObjectRepo;
  let appObject: AppObject;
  let entity: ABB6700Entity;
  let uc: PlayPathUC;

  const joints = () => [
    entity.j1.degrees,
    entity.j2.degrees,
    entity.j3.degrees,
    entity.j4.degrees,
    entity.j5.degrees,
    entity.j6.degrees,
  ];

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("test-arm");
    entity = makeABB6700Entity(appObject);
    uc = makePlayPathUC(appObject);
  });

  it("can retrieve via static get", () => {
    expect(PlayPathUC.get(appObject)).toBe(uc);
  });

  it("can retrieve via static getById", () => {
    expect(PlayPathUC.getById("test-arm", appObjects)).toBe(uc);
  });

  it("returns undefined for getById when not found", () => {
    expect(PlayPathUC.getById("missing", appObjects)).toBeUndefined();
  });

  describe("playPath", () => {
    it("writes the first segment's pose to the joints", () => {
      uc.playPath(makeSegments());

      expect(joints()).toEqual(jointsOf(10));
    });

    it("starts the path at the first segment, moving, on a copy of the segments", () => {
      const segments = makeSegments();
      uc.playPath(segments);

      expect(entity.path).toMatchObject({
        segmentIndex: 0,
        phase: "moving",
        segments,
      });
      expect(entity.path?.segments).not.toBe(segments);
    });

    it("records the path before it writes the first pose", () => {
      const jointsWhenPathAppeared: number[][] = [];
      entity.addChangeObserver(() => {
        if (entity.path && jointsWhenPathAppeared.length === 0)
          jointsWhenPathAppeared.push(joints());
      });

      uc.playPath(makeSegments());

      expect(jointsWhenPathAppeared).toEqual([[0, 0, 0, 0, 0, 0]]);
      expect(joints()).toEqual(jointsOf(10));
    });

    it("stops writing when an observer issues a command during the writes", () => {
      uc.playPath(makeSegments());
      let tookOver = false;
      entity.addChangeObserver(() => {
        if (tookOver || entity.j1.degrees !== 70) return;
        // A pose command from a VM subscriber: cancel, then write its pose.
        tookOver = true;
        entity.path = undefined;
        entity.j1 = Angle.FromDegrees(50);
        entity.j2 = Angle.FromDegrees(50);
        entity.j3 = Angle.FromDegrees(50);
        entity.j4 = Angle.FromDegrees(50);
        entity.j5 = Angle.FromDegrees(50);
        entity.j6 = Angle.FromDegrees(50);
      });

      uc.playPath([makeSegment(70)]);

      expect(tookOver).toBe(true);
      expect(entity.path).toBeUndefined();
      expect(joints()).toEqual([50, 50, 50, 50, 50, 50]);
    });

    it("yields to a command an observer issues as the path starts, before any write", () => {
      let tookOver = false;
      entity.addChangeObserver(() => {
        if (tookOver || !entity.path) return;
        // A pose command from a VM subscriber the moment the path appears.
        tookOver = true;
        entity.path = undefined;
        entity.j1 = Angle.FromDegrees(50);
        entity.j2 = Angle.FromDegrees(50);
        entity.j3 = Angle.FromDegrees(50);
        entity.j4 = Angle.FromDegrees(50);
        entity.j5 = Angle.FromDegrees(50);
        entity.j6 = Angle.FromDegrees(50);
      });

      uc.playPath([makeSegment(70)]);

      expect(tookOver).toBe(true);
      expect(entity.path).toBeUndefined();
      expect(joints()).toEqual([50, 50, 50, 50, 50, 50]);
    });

    it("writes the first pose from the path's own copy of the segments", () => {
      const segments = [makeSegment(70)];
      let edited = false;
      entity.addChangeObserver(() => {
        if (edited || !entity.path) return;
        // The caller's list is edited while the path is being started.
        edited = true;
        segments[0].pose.j1 = Angle.FromDegrees(99);
      });

      uc.playPath(segments);

      expect(edited).toBe(true);
      expect(joints()).toEqual(jointsOf(70));
    });

    it("increments the play count on each call", () => {
      uc.playPath(makeSegments());
      expect(entity.path?.playCount).toBe(1);

      uc.playPath(makeSegments());
      expect(entity.path?.playCount).toBe(2);
    });

    it("accepts a zero travel time and a zero or absent dwell", () => {
      const warnSpy = vi.spyOn(appObjects, "submitWarning");

      uc.playPath([
        { pose: makePose(10), durationMs: 0, dwellMs: 0 },
        { pose: makePose(20), durationMs: 0 },
      ]);

      expect(warnSpy).not.toHaveBeenCalled();
      expect(entity.path).toBeDefined();
    });

    describe("a malformed list", () => {
      const pose = makePose(50);
      const bad: [string, ABB6700PathSegment[]][] = [
        ["is empty", []],
        ["has a negative travel time", [{ pose, durationMs: -1 }]],
        ["has a NaN travel time", [{ pose, durationMs: NaN }]],
        ["has an infinite travel time", [{ pose, durationMs: Infinity }]],
        ["has a negative dwell", [{ pose, durationMs: 1, dwellMs: -1 }]],
        ["has a NaN dwell", [{ pose, durationMs: 1, dwellMs: NaN }]],
        ["has an infinite dwell", [{ pose, durationMs: 1, dwellMs: Infinity }]],
        // Shapes TypeScript rules out but untyped data can carry.
        ["has a null segment", [null as unknown as ABB6700PathSegment]],
        [
          "has a later segment with no pose",
          [
            makeSegment(10),
            { durationMs: 1 } as unknown as ABB6700PathSegment,
          ],
        ],
      ];

      it.each(bad)("is rejected with a warning when it %s", (_name, list) => {
        const warnSpy = vi.spyOn(appObjects, "submitWarning");

        uc.playPath(list);

        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(entity.path).toBeUndefined();
        expect(joints()).toEqual([0, 0, 0, 0, 0, 0]);
      });

      it("is rejected whole when only a later segment is bad", () => {
        const warnSpy = vi.spyOn(appObjects, "submitWarning");

        uc.playPath([makeSegment(10), { pose, durationMs: -1 }]);

        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(entity.path).toBeUndefined();
        expect(joints()).toEqual([0, 0, 0, 0, 0, 0]);
      });

      it("leaves a path in progress untouched", () => {
        uc.playPath(makeSegments());
        const inProgress = entity.path;

        uc.playPath([]);

        expect(entity.path).toBe(inProgress);
        expect(joints()).toEqual(jointsOf(10));
      });
    });
  });

  describe("segmentReached", () => {
    beforeEach(() => {
      uc.playPath(makeSegments());
    });

    it("moves the path to dwelling and notifies the callbacks after the change", () => {
      const phasesSeen: (string | undefined)[] = [];
      uc.subscribeOnSegmentReached(() => {
        phasesSeen.push(entity.path?.phase);
      });

      uc.segmentReached(1, 0);

      expect(entity.path).toMatchObject({ segmentIndex: 0, phase: "dwelling" });
      expect(phasesSeen).toEqual(["dwelling"]);
    });

    it("ignores a stale play count", () => {
      const cb = vi.fn();
      uc.subscribeOnSegmentReached(cb);
      uc.playPath(makeSegments());

      uc.segmentReached(1, 0);

      expect(entity.path).toMatchObject({ playCount: 2, phase: "moving" });
      expect(cb).not.toHaveBeenCalled();
    });

    it("ignores a segment index other than the current one", () => {
      const cb = vi.fn();
      uc.subscribeOnSegmentReached(cb);

      uc.segmentReached(1, 1);

      expect(entity.path).toMatchObject({ segmentIndex: 0, phase: "moving" });
      expect(cb).not.toHaveBeenCalled();
    });

    it("ignores a report while the segment is already dwelling", () => {
      const cb = vi.fn();
      uc.subscribeOnSegmentReached(cb);
      uc.segmentReached(1, 0);

      uc.segmentReached(1, 0);

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("ignores a report when no path is in progress", () => {
      const cb = vi.fn();
      uc.subscribeOnSegmentReached(cb);
      entity.path = undefined;

      uc.segmentReached(1, 0);

      expect(entity.path).toBeUndefined();
      expect(cb).not.toHaveBeenCalled();
    });

    it("does not advance a segment that has a dwell", () => {
      uc.segmentReached(1, 0);

      expect(entity.path).toMatchObject({ segmentIndex: 0, phase: "dwelling" });
      expect(joints()).toEqual(jointsOf(10));
    });

    describe("a segment with no dwell", () => {
      it.each([
        ["absent", undefined],
        ["zero", 0],
      ])("advances at once when its dwell is %s", (_name, dwellMs) => {
        uc.playPath([
          { pose: makePose(10), durationMs: 500, dwellMs },
          makeSegment(20, 100),
        ]);
        const cb = vi.fn();
        uc.subscribeOnSegmentReached(cb);

        uc.segmentReached(2, 0);

        expect(cb).toHaveBeenCalledTimes(1);
        expect(entity.path).toMatchObject({ segmentIndex: 1, phase: "moving" });
        expect(joints()).toEqual(jointsOf(20));
      });

      it("fires pathSegmentReached before pathCompleted on a last segment", () => {
        uc.playPath([makeSegment(10)]);
        const order: string[] = [];
        uc.subscribeOnSegmentReached(() => {
          order.push(`reached:${entity.path?.phase}`);
        });
        uc.subscribeOnCompleted(() => {
          order.push(`completed:${entity.path?.phase}`);
        });

        uc.segmentReached(2, 0);

        expect(order).toEqual(["reached:dwelling", "completed:undefined"]);
      });

      it("does not advance a path that a callback replaced", () => {
        uc.playPath([makeSegment(10), makeSegment(20)]);
        const replacement = [makeSegment(40, 100), makeSegment(50, 100)];
        uc.subscribeOnSegmentReached(() => uc.playPath(replacement));

        uc.segmentReached(2, 0);

        expect(entity.path).toMatchObject({
          playCount: 3,
          segmentIndex: 0,
          phase: "moving",
        });
        expect(joints()).toEqual(jointsOf(40));
      });

      it("does not advance a path that a callback cancelled", () => {
        uc.playPath([makeSegment(10), makeSegment(20)]);
        const completed = vi.fn();
        uc.subscribeOnCompleted(completed);
        uc.subscribeOnSegmentReached(() => {
          entity.path = undefined;
        });

        uc.segmentReached(2, 0);

        expect(entity.path).toBeUndefined();
        expect(joints()).toEqual(jointsOf(10));
        expect(completed).not.toHaveBeenCalled();
      });

      it("reports a callback that throws, still notifies the others, and advances", () => {
        uc.playPath([makeSegment(10), makeSegment(20)]);
        const errorSpy = vi.spyOn(appObjects, "submitError");
        const other = vi.fn();
        uc.subscribeOnSegmentReached(() => {
          throw new Error("weld gun missing");
        });
        uc.subscribeOnSegmentReached(other);

        expect(() => uc.segmentReached(2, 0)).not.toThrow();

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(other).toHaveBeenCalledTimes(1);
        expect(entity.path).toMatchObject({ segmentIndex: 1, phase: "moving" });
      });
    });
  });

  describe("dwellEnded", () => {
    beforeEach(() => {
      uc.playPath(makeSegments());
      uc.segmentReached(1, 0);
    });

    it("writes the next segment's pose, then starts that segment moving", () => {
      const jointsWhenSegmentOneAppeared: number[][] = [];
      entity.addChangeObserver(() => {
        if (entity.path?.segmentIndex === 1) {
          jointsWhenSegmentOneAppeared.push(joints());
        }
      });

      uc.dwellEnded(1, 0);

      expect(entity.path).toMatchObject({ segmentIndex: 1, phase: "moving" });
      expect(jointsWhenSegmentOneAppeared).toEqual([jointsOf(20)]);
    });

    it("does not resume a path an observer cancelled during the next pose's writes", () => {
      entity.addChangeObserver(() => {
        if (entity.path?.phase === "dwelling" && entity.j1.degrees === 20) {
          entity.path = undefined; // a pose command from a VM subscriber
        }
      });

      uc.dwellEnded(1, 0);

      expect(entity.path).toBeUndefined();
      expect(joints()[1]).toBe(11); // the writes stopped after j1
    });

    it("ignores a stale play count", () => {
      uc.playPath(makeSegments());
      uc.segmentReached(2, 0);

      uc.dwellEnded(1, 0);

      expect(entity.path).toMatchObject({
        playCount: 2,
        segmentIndex: 0,
        phase: "dwelling",
      });
    });

    it("ignores a segment index other than the current one", () => {
      uc.dwellEnded(1, 1);

      expect(entity.path).toMatchObject({ segmentIndex: 0, phase: "dwelling" });
    });

    it("ignores a report unless the segment is dwelling", () => {
      uc.dwellEnded(1, 0);
      expect(entity.path).toMatchObject({ segmentIndex: 1, phase: "moving" });

      uc.dwellEnded(1, 1);

      expect(entity.path).toMatchObject({ segmentIndex: 1, phase: "moving" });
    });

    it("ignores a report when no path is in progress", () => {
      const cb = vi.fn();
      uc.subscribeOnCompleted(cb);
      entity.path = undefined;

      uc.dwellEnded(1, 0);

      expect(entity.path).toBeUndefined();
      expect(cb).not.toHaveBeenCalled();
    });

    it("does not notify the reached callbacks", () => {
      const cb = vi.fn();
      uc.subscribeOnSegmentReached(cb);

      uc.dwellEnded(1, 0);

      expect(cb).not.toHaveBeenCalled();
    });

    it("clears the path after the last segment, then notifies the completed callbacks", () => {
      const seen: { path: unknown; joints: number[] }[] = [];
      uc.subscribeOnCompleted(() => {
        seen.push({ path: entity.path, joints: joints() });
      });
      uc.dwellEnded(1, 0);
      uc.segmentReached(1, 1);
      uc.dwellEnded(1, 1);
      expect(seen).toEqual([]);

      uc.segmentReached(1, 2);
      uc.dwellEnded(1, 2);

      expect(seen).toEqual([{ path: undefined, joints: jointsOf(30) }]);
    });
  });

  describe("subscriptions", () => {
    it("stops calling a reached callback once it is unsubscribed", () => {
      uc.playPath([makeSegment(10), makeSegment(20)]);
      const cb = vi.fn();
      const unsubscribe = uc.subscribeOnSegmentReached(cb);

      uc.segmentReached(1, 0);
      unsubscribe();
      uc.segmentReached(1, 1);

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("stops calling a completed callback once it is unsubscribed", () => {
      const cb = vi.fn();
      const unsubscribe = uc.subscribeOnCompleted(cb);

      uc.playPath([makeSegment(10)]);
      uc.segmentReached(1, 0);
      unsubscribe();
      uc.playPath([makeSegment(10)]);
      uc.segmentReached(2, 0);

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("calls every callback when one of them unsubscribes itself", () => {
      uc.playPath([makeSegment(10)]);
      const second = vi.fn();
      const unsubscribeFirst = uc.subscribeOnSegmentReached(() => {
        unsubscribeFirst();
      });
      uc.subscribeOnSegmentReached(second);

      uc.segmentReached(1, 0);

      expect(second).toHaveBeenCalledTimes(1);
    });

    it("calls the callbacks with no arguments", () => {
      uc.playPath([makeSegment(10)]);
      const argCounts: number[] = [];
      uc.subscribeOnSegmentReached((...args: unknown[]) => {
        argCounts.push(args.length);
      });
      uc.subscribeOnCompleted((...args: unknown[]) => {
        argCounts.push(args.length);
      });

      uc.segmentReached(1, 0);

      expect(argCounts).toEqual([0, 0]);
    });
  });
});
