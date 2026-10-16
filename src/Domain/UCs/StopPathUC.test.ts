import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  Angle,
  AppObject,
  AppObjectRepo,
  makeAppObjectRepo,
} from "@vived/core";
import { makeABB6700Entity, ABB6700Entity } from "../Entities/ABB6700Entity";
import {
  ABB_6700_DEFAULT_STOP_DURATION_MS,
  type ABB6700PathSegment,
} from "../Entities/ABB6700Path";
import { StopPathUC, makeStopPathUC } from "./StopPathUC";
import type { ABB6700Pose } from "./SetPoseUC";

const makePose = (degrees: number): ABB6700Pose => ({
  j1: Angle.FromDegrees(degrees),
  j2: Angle.FromDegrees(degrees + 1),
  j3: Angle.FromDegrees(degrees + 2),
  j4: Angle.FromDegrees(degrees + 3),
  j5: Angle.FromDegrees(degrees + 4),
  j6: Angle.FromDegrees(degrees + 5),
});

const makeSegments = (): ABB6700PathSegment[] => [
  { pose: makePose(10), durationMs: 500, dwellMs: 100 },
  { pose: makePose(20), durationMs: 500, dwellMs: 100 },
];

const jointsOf = (degrees: number) => [
  degrees,
  degrees + 1,
  degrees + 2,
  degrees + 3,
  degrees + 4,
  degrees + 5,
];

describe("StopPathUC", () => {
  let appObjects: AppObjectRepo;
  let appObject: AppObject;
  let entity: ABB6700Entity;
  let uc: StopPathUC;

  const joints = () => [
    entity.j1.degrees,
    entity.j2.degrees,
    entity.j3.degrees,
    entity.j4.degrees,
    entity.j5.degrees,
    entity.j6.degrees,
  ];

  // A path in progress, as PlayPathUC would leave it: at segment 1, moving,
  // with that segment's pose committed. Its play count is 1.
  const startPathAtSegmentOne = () => {
    entity.startPath(makeSegments());
    entity.path = { ...entity.path!, segmentIndex: 1 };
    entity.j1 = makePose(20).j1;
    entity.j2 = makePose(20).j2;
    entity.j3 = makePose(20).j3;
    entity.j4 = makePose(20).j4;
    entity.j5 = makePose(20).j5;
    entity.j6 = makePose(20).j6;
  };

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("test-arm");
    entity = makeABB6700Entity(appObject);
    uc = makeStopPathUC(appObject);
  });

  it("can retrieve via static get", () => {
    expect(StopPathUC.get(appObject)).toBe(uc);
  });

  it("can retrieve via static getById", () => {
    expect(StopPathUC.getById("test-arm", appObjects)).toBe(uc);
  });

  it("returns undefined for getById when not found", () => {
    expect(StopPathUC.getById("missing", appObjects)).toBeUndefined();
  });

  describe("stopPath", () => {
    beforeEach(() => {
      startPathAtSegmentOne();
    });

    it("puts the path in its stopping phase with the default duration", () => {
      uc.stopPath();

      expect(entity.path).toMatchObject({
        playCount: 1,
        segmentIndex: 1,
        phase: "stopping",
        stopDurationMs: ABB_6700_DEFAULT_STOP_DURATION_MS,
      });
    });

    it("keeps the segments and leaves the joints untouched", () => {
      const segments = entity.path!.segments;

      uc.stopPath();

      expect(entity.path?.segments).toBe(segments);
      expect(joints()).toEqual(jointsOf(20));
    });

    it("stops a path that is dwelling", () => {
      entity.path = { ...entity.path!, phase: "dwelling" };

      uc.stopPath();

      expect(entity.path).toMatchObject({ segmentIndex: 1, phase: "stopping" });
    });

    it.each([
      ["a requested", 300],
      ["a zero", 0],
    ])("uses %s duration without a warning", (_name, durationMs) => {
      const warnSpy = vi.spyOn(appObjects, "submitWarning");

      uc.stopPath({ durationMs });

      expect(entity.path).toMatchObject({
        phase: "stopping",
        stopDurationMs: durationMs,
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("uses the default duration when the options carry none", () => {
      uc.stopPath({});

      expect(entity.path?.stopDurationMs).toBe(
        ABB_6700_DEFAULT_STOP_DURATION_MS,
      );
    });

    it.each([
      ["negative", -1],
      ["NaN", NaN],
      ["infinite", Infinity],
    ])(
      "replaces a %s duration with the default and a warning, and still stops",
      (_name, durationMs) => {
        const warnSpy = vi.spyOn(appObjects, "submitWarning");

        uc.stopPath({ durationMs });

        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(entity.path).toMatchObject({
          phase: "stopping",
          stopDurationMs: ABB_6700_DEFAULT_STOP_DURATION_MS,
        });
      },
    );

    it("changes nothing and does not warn when the path is already stopping", () => {
      const warnSpy = vi.spyOn(appObjects, "submitWarning");
      uc.stopPath({ durationMs: 300 });
      const stopping = entity.path;

      uc.stopPath();
      uc.stopPath({ durationMs: -1 });

      expect(entity.path).toBe(stopping);
      expect(entity.path?.stopDurationMs).toBe(300);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("changes nothing and does not warn when no path is in progress", () => {
      const warnSpy = vi.spyOn(appObjects, "submitWarning");
      entity.path = undefined;

      uc.stopPath();
      uc.stopPath({ durationMs: -1 });

      expect(entity.path).toBeUndefined();
      expect(joints()).toEqual(jointsOf(20));
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe("restedAt", () => {
    const rest = makePose(25);

    beforeEach(() => {
      startPathAtSegmentOne();
      uc.stopPath();
    });

    it("writes the rest pose to the joints and ends the path", () => {
      uc.restedAt(1, rest);

      expect(joints()).toEqual(jointsOf(25));
      expect(entity.path).toBeUndefined();
    });

    it("writes the joints before the path ends", () => {
      const jointsWhenPathEnded: number[][] = [];
      entity.addChangeObserver(() => {
        if (!entity.path) jointsWhenPathEnded.push(joints());
      });

      uc.restedAt(1, rest);

      expect(jointsWhenPathEnded).toEqual([jointsOf(25)]);
    });

    it("notifies the callbacks after the pose is committed and the path has ended", () => {
      const seen: { path: unknown; joints: number[] }[] = [];
      uc.subscribeOnStopped(() => {
        seen.push({ path: entity.path, joints: joints() });
      });

      uc.restedAt(1, rest);

      expect(seen).toEqual([{ path: undefined, joints: jointsOf(25) }]);
    });

    it("ignores a stale play count", () => {
      const cb = vi.fn();
      uc.subscribeOnStopped(cb);

      uc.restedAt(2, rest);

      expect(entity.path).toMatchObject({ playCount: 1, phase: "stopping" });
      expect(joints()).toEqual(jointsOf(20));
      expect(cb).not.toHaveBeenCalled();
    });

    it.each(["moving", "dwelling"] as const)(
      "ignores a report while the path is %s",
      (phase) => {
        const cb = vi.fn();
        uc.subscribeOnStopped(cb);
        entity.path = { ...entity.path!, phase, stopDurationMs: 0 };

        uc.restedAt(1, rest);

        expect(entity.path).toMatchObject({ phase });
        expect(joints()).toEqual(jointsOf(20));
        expect(cb).not.toHaveBeenCalled();
      },
    );

    it("ignores a report when no path is in progress", () => {
      const cb = vi.fn();
      uc.subscribeOnStopped(cb);
      entity.path = undefined;

      uc.restedAt(1, rest);

      expect(joints()).toEqual(jointsOf(20));
      expect(cb).not.toHaveBeenCalled();
    });

    it("notifies once: a second report for the same stop is ignored", () => {
      const cb = vi.fn();
      uc.subscribeOnStopped(cb);

      uc.restedAt(1, rest);
      uc.restedAt(1, makePose(40));

      expect(joints()).toEqual(jointsOf(25));
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe("subscriptions", () => {
    beforeEach(() => {
      startPathAtSegmentOne();
      uc.stopPath();
    });

    it("stops calling a callback once it is unsubscribed", () => {
      const cb = vi.fn();
      const unsubscribe = uc.subscribeOnStopped(cb);

      uc.restedAt(1, makePose(25));
      unsubscribe();
      startPathAtSegmentOne();
      uc.stopPath();
      uc.restedAt(2, makePose(25));

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("calls every callback when one of them unsubscribes itself", () => {
      const second = vi.fn();
      const unsubscribeFirst = uc.subscribeOnStopped(() => {
        unsubscribeFirst();
      });
      uc.subscribeOnStopped(second);

      uc.restedAt(1, makePose(25));

      expect(second).toHaveBeenCalledTimes(1);
    });

    it("calls the callbacks with no arguments", () => {
      const argCounts: number[] = [];
      uc.subscribeOnStopped((...args: unknown[]) => {
        argCounts.push(args.length);
      });

      uc.restedAt(1, makePose(25));

      expect(argCounts).toEqual([0]);
    });
  });
});
