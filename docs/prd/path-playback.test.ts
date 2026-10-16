import { describe, it, beforeEach, expect, vi } from "vitest";
import { Angle, type AppObjectRepo } from "@vived/core";
import { makeDomainForTesting } from "../../src/Domain/makeDomainForTesting";
import { ABB6700Facade, ABB_6700_STATE_VERSION } from "../../src/ABB6700Facade";
import { aBB6700PMAdapter } from "../../src/Domain/Adapters/aBB6700PMAdapter";
import type { ABB6700VM } from "../../src/Domain/PMs/ABB6700PM";
import type { ABB6700PathSegment, ABB6700Pose } from "../../src";
import { playPath } from "../../src/Domain/Controllers/playPath";
import { onPathCompleted } from "../../src/Domain/Controllers/onPathCompleted";
import { onPathSegmentReached } from "../../src/Domain/Controllers/onPathSegmentReached";
import { reportPathSegmentReached } from "../../src/Domain/Controllers/reportPathSegmentReached";
import { reportPathDwellEnded } from "../../src/Domain/Controllers/reportPathDwellEnded";

const JOINTS = ["j1", "j2", "j3", "j4", "j5", "j6"] as const;

// A distinct angle per joint, so a swapped or dropped joint is caught.
const poseOf = (degrees: number): ABB6700Pose => ({
  j1: Angle.FromDegrees(degrees),
  j2: Angle.FromDegrees(degrees + 1),
  j3: Angle.FromDegrees(degrees + 2),
  j4: Angle.FromDegrees(degrees + 3),
  j5: Angle.FromDegrees(degrees + 4),
  j6: Angle.FromDegrees(degrees + 5),
});
const degreesOf = (pose: ABB6700Pose) => JOINTS.map((j) => pose[j].degrees);

const P0 = poseOf(10);
const P1 = poseOf(20);
const P2 = poseOf(30);

const segment = (pose: ABB6700Pose, dwellMs?: number): ABB6700PathSegment =>
  dwellMs === undefined
    ? { pose, durationMs: 500 }
    : { pose, durationMs: 500, dwellMs };
const makeSegments = (): ABB6700PathSegment[] => [
  segment(P0, 100),
  segment(P1, 100),
  segment(P2, 100),
];

describe("PRD: path-playback", () => {
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

  // Plays the view's part (ADR-0007): reports for the path the VM shows now.
  function viewOf(vm: () => ABB6700VM | undefined) {
    const playCount = () => vm()!.path!.playCount;
    const reached = (i: number) =>
      reportPathSegmentReached("arm-1", appObjects, playCount(), i);
    const dwellEnded = (i: number) =>
      reportPathDwellEnded("arm-1", appObjects, playCount(), i);
    return {
      reached,
      dwellEnded,
      // Reaches, then ends the dwell of, the first `count` segments in order.
      playThrough: (count: number) => {
        for (let i = 0; i < count; i++) {
          reached(i);
          dwellEnded(i);
        }
      },
    };
  }

  // --- Story stubs ---
  // it.todo = not yet implemented · it() = done · it.skip = view-only
  // Story text must be verbatim from the PRD.

  describe("story-1: As a host, I want to play an ordered list of segments, each a pose, a travel time and an optional dwell, in one request, so that the arm runs a whole program without my chaining single pose commands.", () => {
    it("facade: `playPath` on the facade starts the path", () => {
      const vm = readVM();

      facade.playPath(makeSegments());

      expect(vm()?.path).toMatchObject({ segmentIndex: 0, phase: "moving" });
      expect(degreesOf(vm()!)).toEqual(degreesOf(P0));
    });
    it("controller: the standalone `playPath` controller starts the path for a host that holds no facade", () => {
      const vm = readVM();

      playPath("arm-1", makeSegments(), appObjects);

      expect(vm()?.path).toMatchObject({ segmentIndex: 0, phase: "moving" });
      expect(degreesOf(vm()!)).toEqual(degreesOf(P0));
    });
    it("first-committed: the first segment's pose is committed to the view model and `getState()` as soon as the path starts", () => {
      const vm = readVM();

      facade.playPath(makeSegments());

      expect(degreesOf(vm()!)).toEqual(degreesOf(P0));
      expect(facade.getState()).toEqual({
        version: ABB_6700_STATE_VERSION,
        j1: 10,
        j2: 11,
        j3: 12,
        j4: 13,
        j5: 14,
        j6: 15,
      });
    });
    it("vm-path: the view model's `path` reports the segment in progress, its index and its phase, and is `undefined` when no path is in progress", () => {
      const vm = readVM();
      const view = viewOf(vm);
      expect(vm()).toHaveProperty("path", undefined);

      facade.playPath([segment(P0, 100), segment(P1, 100)]);
      expect(vm()?.path).toMatchObject({ segmentIndex: 0, phase: "moving" });

      view.reached(0);
      expect(vm()?.path).toMatchObject({ segmentIndex: 0, phase: "dwelling" });

      view.dwellEnded(0);
      view.reached(1);
      expect(vm()?.path).toMatchObject({ segmentIndex: 1, phase: "dwelling" });

      view.dwellEnded(1);
      expect(vm()).toHaveProperty("path", undefined);
    });
  });

  describe("story-2: As a host, I want each segment's pose committed as that segment starts, so that the view model and `getState()` follow a path the same way they follow a single pose command.", () => {
    it("next-committed: when a segment's dwell ends, the next segment's pose is committed and the view model's segment index advances", () => {
      const vm = readVM();
      const view = viewOf(vm);
      facade.playPath(makeSegments());

      view.reached(0);
      view.dwellEnded(0);

      expect(vm()?.path).toMatchObject({ segmentIndex: 1, phase: "moving" });
      expect(degreesOf(vm()!)).toEqual(degreesOf(P1));
      expect(facade.getState()).toEqual({
        version: ABB_6700_STATE_VERSION,
        j1: 20,
        j2: 21,
        j3: 22,
        j4: 23,
        j5: 24,
        j6: 25,
      });
    });
    it("targets-only: no view model delivered during a path carries angles between two segment poses", () => {
      const seen: ABB6700VM[] = [];
      aBB6700PMAdapter.subscribe("arm-1", appObjects, (v) => {
        seen.push(v);
      });
      const view = viewOf(() => seen[seen.length - 1]);
      const start = degreesOf(seen[0]);
      const segments = makeSegments();

      facade.playPath(segments);
      segments.forEach((_, i) => {
        view.reached(i);
        view.dwellEnded(i);
      });

      // Each joint only ever holds its start angle or one segment pose's angle.
      const allowed = JOINTS.map(
        (j, k) =>
          new Set([start[k], ...segments.map((s) => s.pose[j].degrees)]),
      );
      expect(
        seen.some((v) => degreesOf(v).join() === degreesOf(P2).join()),
      ).toBe(true);
      for (const v of seen) {
        JOINTS.forEach((j, k) => {
          expect(allowed[k].has(v[j].degrees)).toBe(true);
        });
      }
    });
    it("not-in-state: the path is not part of `ABB6700State`, and the state schema version stays 1", () => {
      facade.playPath(makeSegments());

      expect(Object.keys(facade.getState()).sort()).toEqual([
        "j1",
        "j2",
        "j3",
        "j4",
        "j5",
        "j6",
        "version",
      ]);
      expect(facade.getState().version).toBe(1);
    });
  });

  describe("story-3: As a host, I want to be told when the arm reaches each segment's pose, so that I can fire the weld gun during the dwell.", () => {
    it("once-in-order: `pathSegmentReached` fires once per segment, in segment order, when the arm arrives at the segment's pose", () => {
      const vm = readVM();
      const view = viewOf(vm);
      const indexAtCall: (number | undefined)[] = [];
      onPathSegmentReached("arm-1", appObjects, () => {
        indexAtCall.push(vm()?.path?.segmentIndex);
      });
      facade.playPath(makeSegments());
      expect(indexAtCall).toEqual([]);

      view.playThrough(3);

      expect(indexAtCall).toEqual([0, 1, 2]);
    });
    it("index-readable: when `pathSegmentReached` fires, the view model's `path` names the segment reached, in its dwelling phase", () => {
      const vm = readVM();
      const view = viewOf(vm);
      facade.playPath(makeSegments());
      view.reached(0);
      view.dwellEnded(0);
      let pathInCallback: ABB6700VM["path"];
      onPathSegmentReached("arm-1", appObjects, () => {
        pathInCallback = vm()?.path;
      });

      view.reached(1);

      expect(pathInCallback).toMatchObject({
        segmentIndex: 1,
        phase: "dwelling",
      });
    });
    it("both-surfaces: the event is available through the facade's `onEvent` and through a standalone subscription controller, and each returns an unsubscribe function that stops further calls", () => {
      const vm = readVM();
      const view = viewOf(vm);
      const viaFacade = vi.fn();
      const viaController = vi.fn();
      const offFacade = facade.onEvent("pathSegmentReached", viaFacade);
      const offController = onPathSegmentReached(
        "arm-1",
        appObjects,
        viaController,
      );
      facade.playPath(makeSegments());

      view.reached(0);
      expect(viaFacade).toHaveBeenCalledTimes(1);
      expect(viaController).toHaveBeenCalledTimes(1);

      offFacade();
      view.dwellEnded(0);
      view.reached(1);
      expect(viaFacade).toHaveBeenCalledTimes(1);
      expect(viaController).toHaveBeenCalledTimes(2);

      offController();
      view.dwellEnded(1);
      view.reached(2);
      expect(viaFacade).toHaveBeenCalledTimes(1);
      expect(viaController).toHaveBeenCalledTimes(2);
    });
    it("payload-free: the callback receives no arguments", () => {
      const vm = readVM();
      const view = viewOf(vm);
      const argCounts: number[] = [];
      facade.onEvent("pathSegmentReached", (...args: unknown[]) => {
        argCounts.push(args.length);
      });
      onPathSegmentReached("arm-1", appObjects, (...args: unknown[]) => {
        argCounts.push(args.length);
      });
      facade.playPath(makeSegments());

      view.reached(0);

      expect(argCounts).toEqual([0, 0]);
    });
  });

  describe("story-4: As a host, I want to be told when a path is done, so that I can start what comes next.", () => {
    it("after-last-dwell: `pathCompleted` fires once, after the last segment has been reached and its dwell has ended", () => {
      const vm = readVM();
      const view = viewOf(vm);
      const completed = vi.fn();
      onPathCompleted("arm-1", appObjects, completed);
      facade.playPath(makeSegments());

      view.playThrough(2);
      view.reached(2);
      expect(completed).not.toHaveBeenCalled();

      view.dwellEnded(2);
      expect(completed).toHaveBeenCalledTimes(1);
    });
    it("reached-first: for the last segment, `pathSegmentReached` fires before `pathCompleted`", () => {
      const vm = readVM();
      const view = viewOf(vm);
      const order: string[] = [];
      onPathSegmentReached("arm-1", appObjects, () => {
        order.push("reached");
      });
      onPathCompleted("arm-1", appObjects, () => {
        order.push("completed");
      });
      facade.playPath(makeSegments());

      view.playThrough(3);

      expect(order).toEqual(["reached", "reached", "reached", "completed"]);
    });
    it("idle-after: when `pathCompleted` fires, the view model reports no path in progress and the last segment's pose stays committed", () => {
      const vm = readVM();
      const view = viewOf(vm);
      let vmInCallback: ABB6700VM | undefined;
      onPathCompleted("arm-1", appObjects, () => {
        vmInCallback = vm();
      });
      facade.playPath(makeSegments());

      view.playThrough(3);

      expect(vmInCallback).toHaveProperty("path", undefined);
      expect(degreesOf(vmInCallback!)).toEqual(degreesOf(P2));
      expect(facade.getState().j1).toBe(30);
    });
    it("both-surfaces: the event is available through the facade's `onEvent` and through a standalone subscription controller", () => {
      const vm = readVM();
      const view = viewOf(vm);
      const viaFacade = vi.fn();
      const viaController = vi.fn();
      facade.onEvent("pathCompleted", viaFacade);
      onPathCompleted("arm-1", appObjects, viaController);
      facade.playPath(makeSegments());

      view.playThrough(3);

      expect(viaFacade).toHaveBeenCalledTimes(1);
      expect(viaController).toHaveBeenCalledTimes(1);
    });
  });

  describe("story-5: As a host, I want the travel times and dwells I hand in honoured as given, so that the program's timing stays mine.", () => {
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip(
      "travel-time: the arm takes each segment's travel time to reach its pose, whatever transition duration is set on the arm",
    );
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip(
      "dwell: the arm holds still at a segment's pose for that segment's dwell before the next segment starts",
    );
    it("no-dwell: a segment without a dwell leads straight into the next one", () => {
      const vm = readVM();
      const view = viewOf(vm);
      facade.playPath([segment(P0), segment(P1, 100)]);

      view.reached(0);

      expect(vm()?.path).toMatchObject({ segmentIndex: 1, phase: "moving" });
      expect(degreesOf(vm()!)).toEqual(degreesOf(P1));
    });
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip(
      "same-pose: a segment whose pose equals the one before it still takes its travel time",
    );
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip(
      "zero-travel: a segment with a travel time of zero snaps to its pose",
    );
    it("duration-untouched: changing the transition duration during a path does not change the path's timing, and the new duration applies to the next pose command after the path", () => {
      const vm = readVM();
      const view = viewOf(vm);
      facade.playPath(makeSegments());
      view.reached(0);

      facade.setTransitionDuration(250);

      expect(vm()?.transitionDurationMs).toBe(250);
      expect(vm()?.path).toMatchObject({ durationMs: 500, dwellMs: 100 });
      view.dwellEnded(0);
      expect(vm()?.path).toMatchObject({ segmentIndex: 1, durationMs: 500 });

      view.reached(1);
      view.dwellEnded(1);
      view.reached(2);
      view.dwellEnded(2);
      expect(vm()).toHaveProperty("path", undefined);
      expect(vm()?.transitionDurationMs).toBe(250);

      facade.setPose(poseOf(40));
      expect(vm()?.transitionDurationMs).toBe(250);
      expect(degreesOf(vm()!)).toEqual(degreesOf(poseOf(40)));
      expect(vm()).toHaveProperty("path", undefined);
    });
  });

  describe("story-6: As a host, I want a malformed path request rejected whole, so that a bad program never half-plays.", () => {
    it("empty: an empty segment list is rejected with a warning, and nothing changes", () => {
      const warnSpy = vi.spyOn(appObjects, "submitWarning");
      const vm = readVM();
      const view = viewOf(vm);
      const idle = vm();

      facade.playPath([]);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(vm()).toEqual(idle);

      facade.playPath(makeSegments());
      view.reached(0);
      const inProgress = vm();

      facade.playPath([]);

      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(vm()).toEqual(inProgress);
    });
    it("bad-time: a negative or non-finite travel time or dwell in any segment rejects the whole request with a warning, and whatever was in progress carries on unchanged", () => {
      const warnSpy = vi.spyOn(appObjects, "submitWarning");
      const vm = readVM();
      const view = viewOf(vm);
      facade.playPath(makeSegments());
      view.reached(0);
      const inProgress = vm();

      for (const bad of [-1, NaN, Infinity]) {
        facade.playPath([
          segment(P0, 100),
          { pose: P1, durationMs: bad },
          segment(P2),
        ]);
        expect(vm()).toEqual(inProgress);

        facade.playPath([
          segment(P0, 100),
          { pose: P1, durationMs: 500, dwellMs: bad },
          segment(P2),
        ]);
        expect(vm()).toEqual(inProgress);
      }

      expect(warnSpy).toHaveBeenCalledTimes(6);
    });
    it("missing-arm: the `playPath` controller called with an id that has no arm behind it submits a warning and does nothing", () => {
      const warnSpy = vi.spyOn(appObjects, "submitWarning");
      const vm = readVM();
      const before = vm();

      expect(() =>
        playPath("no-arm-here", makeSegments(), appObjects),
      ).not.toThrow();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        "playPath",
        "Unable to find PlayPathUC for ID: no-arm-here",
      );
      expect(vm()).toEqual(before);
    });
  });

  describe("story-7: As a Student, I want the arm to move through a path as one continuous motion, so that a program reads as a robot working rather than a series of jumps.", () => {
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip(
      "from-screen: the first segment starts from the angles on screen, even when a transition is in flight",
    );
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip(
      "eased: each segment eases in and out between its two poses, as a pose transition does",
    );
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip("exact: the arm arrives exactly on each segment's pose");
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip("stabilizer: the stabilizer linkage stays attached throughout");
  });

  it.todo(
    "story-8: As a Student, I want each arm's path to play independently, so that one arm's program never moves, stops or interrupts another arm.",
  );

  describe("story-9: As a host, I want to stop a path in flight, so that an Emergency Stop or a controller power-off halts the arm partway through a move.", () => {
    it.todo("facade: `stopPath` on the facade stops the path");
    it.todo(
      "controller: the standalone `stopPath` controller stops the path for a host that holds no facade",
    );
    it.todo(
      "stopping: from the stop request until the arm is at rest, the view model's `path` is in its stopping phase and the committed pose stays the current segment's",
    );
    it.todo(
      "drops-rest: after a stop request, no further segment starts and neither `pathSegmentReached` nor `pathCompleted` fires",
    );
  });

  describe("story-10: As a Student, I want a stopped arm to slow to rest from where it is on screen, so that a stop looks like a robot braking rather than a freeze or a finished move.", () => {
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip(
      "decelerates: the arm slows from the speed it has on screen and comes to rest within the stop duration",
    );
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip(
      "on-segment: the arm slows along its current segment and never passes the segment's pose",
    );
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip(
      "at-rest: an arm in a dwell, or at the start of a segment, stops where it is",
    );
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip(
      "stabilizer: the stabilizer linkage stays attached while the arm slows",
    );
  });

  describe("story-11: As a host, I want the pose a stopped arm rests at committed and announced, so that the view model, `getState()` and my sequencer agree on where the arm is.", () => {
    it.todo(
      "commits-rest: when the arm comes to rest, the view model and `getState()` hold the pose it rests at",
    );
    it.todo(
      "stopped-event: `pathStopped` fires once, after the rest pose is committed",
    );
    it.todo(
      "idle-after: when `pathStopped` fires, the view model reports no path in progress",
    );
    it.todo(
      "both-surfaces: the event is available through the facade's `onEvent` and through a standalone subscription controller",
    );
  });

  describe("story-12: As a host, I want to choose how long a stop takes, so that the stop matches the halt I am showing.", () => {
    it.todo(
      "default: the default stop duration is 400 ms, and the package exports that number and the stop options type so a host can use the same values",
    );
    it.todo(
      "per-request: a stop duration passed with the request is used for that stop",
    );
    it.todo(
      "invalid: a negative or non-finite stop duration is replaced by the default with a warning, and the stop still happens",
    );
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip("zero: a stop duration of zero stops the arm where it is");
  });

  describe("story-13: As a host, I want a stop request that has nothing to stop to change nothing, so that a stop never moves an idle arm or announces a stop that did not happen.", () => {
    it.todo(
      "idle: with no path in progress, `stopPath` changes nothing and fires no event",
    );
    it.todo(
      "repeat: a stop request while the arm is already stopping changes nothing, and `pathStopped` still fires once",
    );
  });

  describe("story-14: As a host, I want any pose command to cancel a path in progress, so that a slide change or a snap always takes over from a running path.", () => {
    it.todo(
      "set-pose: `setPose` during a path cancels it; the commanded pose is committed and the arm transitions to it from the angles on screen",
    );
    it.todo("set-joint: `setJointAngle` during a path cancels it");
    it.todo(
      "apply-state: `applyState` on the facade and the `applyABB6700State` controller cancel a path in progress",
    );
    it.todo(
      "snap: a pose command with the snap option during a path cancels it and snaps the arm to the commanded pose",
    );
    it.todo(
      "silent: a cancelled path fires no further events, and the view model reports no path in progress",
    );
    it.todo(
      "during-stop: a pose command while the arm is stopping ends the stop; the commanded pose wins and `pathStopped` does not fire",
    );
  });

  describe("story-15: As a host, I want a new path to replace the one in progress, so that I can change the program without stopping first.", () => {
    it.todo(
      "replaces: the new path's first segment is committed and the view model's segment index starts again at 0",
    );
    it.todo("silent: the replaced path fires no further events");
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip("from-screen: the new path starts from the angles on screen");
  });

  it("story-16: As a host, I want pose commands, the snap option and the transition duration to behave as before when no path is in progress, so that existing hosts see no change.", () => {
    const vm = readVM();
    const expectNoPath = () => expect(vm()).toHaveProperty("path", undefined);
    expectNoPath();

    const pose = {
      j1: Angle.FromDegrees(11),
      j2: Angle.FromDegrees(22),
      j3: Angle.FromDegrees(33),
      j4: Angle.FromDegrees(44),
      j5: Angle.FromDegrees(55),
      j6: Angle.FromDegrees(66),
    };
    facade.setPose(pose);
    expect(vm()?.j1.degrees).toBe(11);
    expect(vm()?.j6.degrees).toBe(66);
    expect(vm()?.snapCount).toBe(0);
    expectNoPath();

    facade.setJointAngle("j3", Angle.FromDegrees(99));
    expect(vm()?.j3.degrees).toBe(99);
    expect(vm()?.j2.degrees).toBe(22);
    expect(vm()?.snapCount).toBe(0);
    expectNoPath();

    const state = {
      version: ABB_6700_STATE_VERSION,
      j1: 1,
      j2: 2,
      j3: 3,
      j4: 4,
      j5: 5,
      j6: 6,
    };
    facade.applyState(state);
    expect(facade.getState()).toEqual(state);
    expect(vm()?.snapCount).toBe(0);
    expectNoPath();

    facade.setTransitionDuration(250);
    expect(vm()?.transitionDurationMs).toBe(250);
    expect(vm()?.j1.degrees).toBe(1);
    expectNoPath();

    facade.setPose(pose, { transition: "none" });
    expect(vm()?.snapCount).toBe(1);
    expect(vm()?.j1.degrees).toBe(11);
    expect(vm()?.transitionDurationMs).toBe(250);
    expectNoPath();

    facade.setJointAngle("j3", Angle.FromDegrees(99), { transition: "none" });
    expect(vm()?.snapCount).toBe(2);
    expect(vm()?.j3.degrees).toBe(99);
    expectNoPath();
  });

  describe("story-17: As a host, I want a path requested before the view loads to play once it loads, so that I can start a program in the same tick I create the arm.", () => {
    it("waits: before `load()`, the first segment's pose is committed, the path waits on that segment, and no event fires", () => {
      const vm = readVM();
      const reached = vi.fn();
      const completed = vi.fn();
      facade.onEvent("pathSegmentReached", reached);
      facade.onEvent("pathCompleted", completed);

      facade.playPath(makeSegments());

      expect(degreesOf(vm()!)).toEqual(degreesOf(P0));
      expect(vm()?.path).toMatchObject({ segmentIndex: 0, phase: "moving" });
      expect(reached).not.toHaveBeenCalled();
      expect(completed).not.toHaveBeenCalled();
    });
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip(
      "plays-on-load: once the view attaches, the arm appears directly on the committed pose, that segment counts as reached, and the path plays on from there",
    );
  });

  describe("story-18: As a host, I want `destroy()` or a remount during a path to end cleanly, so that tearing down mid-path never throws or writes to disposed nodes.", () => {
    it.todo(
      "destroy: `destroy()` during a path or a stop never throws, and no event fires afterwards",
    );
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip(
      "remount: after a remount during a path, the arm appears directly on the committed pose and the path plays on from there; during a stop, the stop ends on that pose",
    );
  });

  it.todo(
    "story-19: As a host, I want the path commands and events to extend the facade without breaking the SmartComponent contract, so that existing hosts compile and run unchanged.",
  );
});
