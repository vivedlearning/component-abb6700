import { describe, it, beforeEach, expect, vi } from "vitest";
import { Angle, type AppObjectRepo } from "@vived/core";
import { makeDomainForTesting } from "../../src/Domain/makeDomainForTesting";
import {
  ABB6700Facade,
  ABB_6700_STATE_VERSION,
  type ABB6700State,
} from "../../src/ABB6700Facade";
import { aBB6700PMAdapter } from "../../src/Domain/Adapters/aBB6700PMAdapter";
import type { ABB6700VM } from "../../src/Domain/PMs/ABB6700PM";
import { ABB_6700_DEFAULT_TRANSITION_DURATION_MS } from "../../src/Domain/Entities/ABB6700Entity";

describe("PRD: pose-interpolation", () => {
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

  describe("story-1: As a Student, I want the arm to move smoothly from its current pose to a newly commanded pose instead of jumping, so that the motion reads as a robot moving rather than a cut between slides.", () => {
    // View-only — interpolated angles live on Babylon joint nodes, not in the VM
    it.skip(
      "all-joints-travel: all six joints travel from their current on-screen angles to the target angles over the transition duration",
    );
    it.skip(
      "eased: the motion eases in and out, with no abrupt change in speed at the start or end",
    );
    it.skip(
      "arrives-exactly: the arm arrives exactly on the target angles when the transition ends, with no residual offset",
    );
  });

  describe("story-2: As a Student, I want the stabilizer linkage to stay attached to the arm throughout the transition, so that the robot never looks broken mid-motion.", () => {
    // View-only — stabilizer node motion during a transition is a Babylon node concern
    it.skip(
      "moves-with-j2: the stabilizer rotational member and prismatic member move continuously with J2 during the transition",
    );
    it.skip(
      "arrives-with-j2: the stabilizer reaches its derived values in the same frame J2 reaches its target",
    );
  });

  describe("story-3: As a Student, I want a pose commanded mid-transition to redirect the arm from where it currently is, so that rapid slide changes never cause a jump back or a stutter.", () => {
    // View-only — redirect behaviour is observable only on Babylon joint nodes
    it.skip(
      "starts-from-current: the redirected transition starts from the arm's current on-screen angles, not from the superseded target",
    );
    it.skip(
      "full-duration: the redirected transition takes the full transition duration from the moment of the new command",
    );
    it.skip(
      "latest-wins: only the most recent target is honoured; a superseded target is never revisited",
    );
  });

  it.skip(
    "story-4: As a Student, I want each arm in a cell to transition independently, so that commanding one arm never moves, redirects, or interrupts another.",
    // View-only — per-instance node motion; the VM already reports per-instance targets
  );

  describe("story-5: As a Student, I want the arm to appear directly in its authored pose when the scene first loads, so that I never see the arm swing in from a default pose.", () => {
    // View-only — first rendered pose is a Babylon node concern
    it.skip(
      "no-transition-on-load: the first pose rendered after load is the current pose, with no transition",
    );
    it.skip(
      "pre-load-pose-direct: a pose commanded before load is rendered directly once the view attaches, with no transition",
    );
  });

  describe("story-6: As a slide Activity, I want a sensible default transition, so that arms animate between slide poses with no configuration.", () => {
    it("default-duration: the default transition duration is 1 second", () => {
      const vm = readVM();

      expect(ABB_6700_DEFAULT_TRANSITION_DURATION_MS).toBe(1000);
      expect(vm()?.transitionDurationMs).toBe(
        ABB_6700_DEFAULT_TRANSITION_DURATION_MS,
      );
    });
    it.skip(
      "default-easing: the default easing is ease-in-out",
      // View-only — easing exists only in the Babylon view's per-frame update; the domain has no easing concept
    );
  });

  describe("story-7: As a slide Activity, I want to set the transition duration per arm instance at any time, so that I can tune the pacing or turn animation off entirely.", () => {
    it.skip(
      "zero-disables: a duration of zero disables the transition: subsequently commanded poses are rendered immediately",
      // View-only — immediate rendering is observable only on Babylon joint nodes
    );
    it("applies-to-next: a changed duration applies to the next commanded pose; a transition already in progress keeps the duration it started with", () => {
      const vm = readVM();
      const before = vm();

      facade.setTransitionDuration(250);

      expect(vm()?.transitionDurationMs).toBe(250);
      expect(vm()?.j1.degrees).toBe(before?.j1.degrees);
      expect(vm()?.j2.degrees).toBe(before?.j2.degrees);
      expect(vm()?.j3.degrees).toBe(before?.j3.degrees);
      expect(vm()?.j4.degrees).toBe(before?.j4.degrees);
      expect(vm()?.j5.degrees).toBe(before?.j5.degrees);
      expect(vm()?.j6.degrees).toBe(before?.j6.degrees);
    });
    it("invalid-rejected: a negative or non-finite duration is rejected with a warning and the previous duration is kept", () => {
      const warnSpy = vi.spyOn(appObjects, "submitWarning");
      const vm = readVM();

      facade.setTransitionDuration(250);

      facade.setTransitionDuration(-1);
      expect(vm()?.transitionDurationMs).toBe(250);

      facade.setTransitionDuration(NaN);
      expect(vm()?.transitionDurationMs).toBe(250);

      facade.setTransitionDuration(Infinity);
      expect(vm()?.transitionDurationMs).toBe(250);

      expect(warnSpy).toHaveBeenCalledTimes(3);
    });
    it("pre-load-honoured: a duration set before `load()` is honoured once the view attaches", () => {
      const vm = readVM();

      facade.setTransitionDuration(400);

      expect(vm()?.transitionDurationMs).toBe(400);
    });
  });

  describe("story-8: As a slide Activity, I want the view model and state snapshot to report the commanded target pose immediately, so that persistence and host UI never capture a mid-transition pose.", () => {
    it("vm-reports-target: the last view model delivered during a pose command carries the target pose, never view-interpolated angles", () => {
      const vm = readVM();

      facade.setPose({
        j1: Angle.FromDegrees(11),
        j2: Angle.FromDegrees(22),
        j3: Angle.FromDegrees(33),
        j4: Angle.FromDegrees(44),
        j5: Angle.FromDegrees(55),
        j6: Angle.FromDegrees(66),
      });

      expect(vm()?.j1.degrees).toBe(11);
      expect(vm()?.j2.degrees).toBe(22);
      expect(vm()?.j3.degrees).toBe(33);
      expect(vm()?.j4.degrees).toBe(44);
      expect(vm()?.j5.degrees).toBe(55);
      expect(vm()?.j6.degrees).toBe(66);
    });
    it("state-reports-target: `getState()` returns the target pose while the arm is still in transition", () => {
      facade.setPose({
        j1: Angle.FromDegrees(11),
        j2: Angle.FromDegrees(22),
        j3: Angle.FromDegrees(33),
        j4: Angle.FromDegrees(44),
        j5: Angle.FromDegrees(55),
        j6: Angle.FromDegrees(66),
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
    it("duration-not-in-state: the transition duration is not part of `ABB6700State`", () => {
      const vm = readVM();

      facade.setTransitionDuration(250);

      const state = facade.getState();
      expect(Object.keys(state).sort()).toEqual(
        ["version", "j1", "j2", "j3", "j4", "j5", "j6"].sort(),
      );

      facade.applyState({
        ...state,
        transitionDurationMs: 5,
      } as ABB6700State);

      expect(vm()?.transitionDurationMs).toBe(250);
    });
  });

  it.skip(
    "story-9: As a slide Activity, I want `destroy()` during a transition to stop the motion cleanly, so that tearing down mid-animation never throws or writes to disposed nodes.",
    // View-only — requires an attached Babylon view mid-transition
  );

  it.skip(
    "story-10: As a slide Activity, I want a remounted view to come up directly in the current pose, so that a host remount never replays a swing.",
    // View-only — remount rebinds Babylon nodes; observable only on the view
  );
});
