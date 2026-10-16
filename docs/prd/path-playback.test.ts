import { describe, it, beforeEach, expect } from "vitest";
import { Angle, type AppObjectRepo } from "@vived/core";
import { makeDomainForTesting } from "../../src/Domain/makeDomainForTesting";
import { ABB6700Facade, ABB_6700_STATE_VERSION } from "../../src/ABB6700Facade";
import { aBB6700PMAdapter } from "../../src/Domain/Adapters/aBB6700PMAdapter";
import type { ABB6700VM } from "../../src/Domain/PMs/ABB6700PM";

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

  // --- Story stubs ---
  // it.todo = not yet implemented · it() = done · it.skip = view-only
  // Story text must be verbatim from the PRD.

  describe("story-1: As a host, I want to play an ordered list of segments, each a pose, a travel time and an optional dwell, in one request, so that the arm runs a whole program without my chaining single pose commands.", () => {
    it.todo("facade: `playPath` on the facade starts the path");
    it.todo(
      "controller: the standalone `playPath` controller starts the path for a host that holds no facade",
    );
    it.todo(
      "first-committed: the first segment's pose is committed to the view model and `getState()` as soon as the path starts",
    );
    it.todo(
      "vm-path: the view model's `path` reports the segment in progress, its index and its phase, and is `undefined` when no path is in progress",
    );
  });

  describe("story-2: As a host, I want each segment's pose committed as that segment starts, so that the view model and `getState()` follow a path the same way they follow a single pose command.", () => {
    it.todo(
      "next-committed: when a segment's dwell ends, the next segment's pose is committed and the view model's segment index advances",
    );
    it.todo(
      "targets-only: no view model delivered during a path carries angles between two segment poses",
    );
    it.todo(
      "not-in-state: the path is not part of `ABB6700State`, and the state schema version stays 1",
    );
  });

  describe("story-3: As a host, I want to be told when the arm reaches each segment's pose, so that I can fire the weld gun during the dwell.", () => {
    it.todo(
      "once-in-order: `pathSegmentReached` fires once per segment, in segment order, when the arm arrives at the segment's pose",
    );
    it.todo(
      "index-readable: when `pathSegmentReached` fires, the view model's `path` names the segment reached, in its dwelling phase",
    );
    it.todo(
      "both-surfaces: the event is available through the facade's `onEvent` and through a standalone subscription controller, and each returns an unsubscribe function that stops further calls",
    );
    it.todo("payload-free: the callback receives no arguments");
  });

  describe("story-4: As a host, I want to be told when a path is done, so that I can start what comes next.", () => {
    it.todo(
      "after-last-dwell: `pathCompleted` fires once, after the last segment has been reached and its dwell has ended",
    );
    it.todo(
      "reached-first: for the last segment, `pathSegmentReached` fires before `pathCompleted`",
    );
    it.todo(
      "idle-after: when `pathCompleted` fires, the view model reports no path in progress and the last segment's pose stays committed",
    );
    it.todo(
      "both-surfaces: the event is available through the facade's `onEvent` and through a standalone subscription controller",
    );
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
    it.todo(
      "no-dwell: a segment without a dwell leads straight into the next one",
    );
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip(
      "same-pose: a segment whose pose equals the one before it still takes its travel time",
    );
    // View-only — frame timing and joint-node motion live in the Babylon view, not the VM
    it.skip(
      "zero-travel: a segment with a travel time of zero snaps to its pose",
    );
    it.todo(
      "duration-untouched: changing the transition duration during a path does not change the path's timing, and the new duration applies to the next pose command after the path",
    );
  });

  describe("story-6: As a host, I want a malformed path request rejected whole, so that a bad program never half-plays.", () => {
    it.todo(
      "empty: an empty segment list is rejected with a warning, and nothing changes",
    );
    it.todo(
      "bad-time: a negative or non-finite travel time or dwell in any segment rejects the whole request with a warning, and whatever was in progress carries on unchanged",
    );
    it.todo(
      "missing-arm: the `playPath` controller called with an id that has no arm behind it submits a warning and does nothing",
    );
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
    it.todo(
      "waits: before `load()`, the first segment's pose is committed, the path waits on that segment, and no event fires",
    );
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
