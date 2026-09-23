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
import { setPose } from "../../src/Domain/Controllers/setPose";
import { setJointAngle } from "../../src/Domain/Controllers/setJointAngle";
import { applyABB6700State } from "../../src/Domain/Controllers/applyABB6700State";
import type { SmartComponent } from "../../src/SmartComponent";

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

  describe("story-11: As a slide Activity, I want to command a pose or a single joint with an option that snaps the arm instead of animating it, so that direct manipulation such as dragging a joint slider tracks the input exactly.", () => {
    it.skip(
      "snap-pose: `setPose` with the snap option renders the whole arm at the commanded target with no transition",
      // View-only — the snap is observable only on Babylon joint nodes
    );
    it.skip(
      "snap-joint: `setJointAngle` with the snap option renders the whole arm at the current target, so joints still in transition from an earlier command also land on their targets",
      // View-only — the whole-arm snap is observable only on Babylon joint nodes
    );
    it.skip(
      "cancels-in-flight: a snap command issued mid-transition ends that transition; the superseded target is never visited",
      // View-only — transition cancellation is observable only on Babylon joint nodes
    );
    it.skip(
      "same-target: a snap command whose angles equal the current target still ends any transition in flight",
      // View-only — ending an in-flight transition is observable only on Babylon joint nodes
    );
    it("controllers: the standalone `setPose` and `setJointAngle` controllers accept the same option as the facade methods", () => {
      const armOneVM = readVM();
      const armTwoFacade = new ABB6700Facade("arm-2", appObjects);
      let armTwoVM: ABB6700VM | undefined;
      aBB6700PMAdapter.subscribe("arm-2", appObjects, (v) => {
        armTwoVM = v;
      });

      const pose = {
        j1: Angle.FromDegrees(1),
        j2: Angle.FromDegrees(2),
        j3: Angle.FromDegrees(3),
        j4: Angle.FromDegrees(4),
        j5: Angle.FromDegrees(5),
        j6: Angle.FromDegrees(6),
      };

      setPose("arm-1", pose, appObjects, { transition: "none" });
      armTwoFacade.setPose(pose, { transition: "none" });

      expect(armOneVM()?.snapCount).toBe(1);
      expect(armTwoVM?.snapCount).toBe(1);
      expect(armOneVM()?.j1.degrees).toBe(1);
      expect(armOneVM()?.j6.degrees).toBe(6);
      expect(armTwoVM?.j1.degrees).toBe(1);
      expect(armTwoVM?.j6.degrees).toBe(6);

      const angle = Angle.FromDegrees(99);
      setJointAngle("arm-1", "j3", angle, appObjects, { transition: "none" });
      armTwoFacade.setJointAngle("j3", angle, { transition: "none" });

      expect(armOneVM()?.snapCount).toBe(2);
      expect(armTwoVM?.snapCount).toBe(2);
      expect(armOneVM()?.j3.degrees).toBe(99);
      expect(armTwoVM?.j3.degrees).toBe(99);
    });
  });

  describe("story-12: As a slide Activity, I want commands without the snap option to keep animating exactly as before, so that existing hosts and slide changes are unaffected.", () => {
    it.skip(
      "default-animates: omitting the option, or passing `\"animate\"`, transitions as described in stories 1–3",
      // View-only — transitions are observable only on Babylon joint nodes
    );
    it.skip(
      "animate-after-snap: an animated command after a snap transitions from the snapped pose",
      // View-only — transitions are observable only on Babylon joint nodes
    );
    it("unrecognized: an unrecognized option value is treated as the default and does not throw", () => {
      const vm = readVM();
      const countBefore = vm()?.snapCount;

      const poseA = {
        j1: Angle.FromDegrees(1),
        j2: Angle.FromDegrees(1),
        j3: Angle.FromDegrees(1),
        j4: Angle.FromDegrees(1),
        j5: Angle.FromDegrees(1),
        j6: Angle.FromDegrees(1),
      };
      expect(() =>
        facade.setPose(poseA, { transition: "bogus" } as never),
      ).not.toThrow();
      expect(vm()?.snapCount).toBe(countBefore);
      expect(vm()?.j1.degrees).toBe(1);

      const poseB = { ...poseA, j2: Angle.FromDegrees(2) };
      expect(() => facade.setPose(poseB, {})).not.toThrow();
      expect(vm()?.snapCount).toBe(countBefore);
      expect(vm()?.j2.degrees).toBe(2);

      const poseC = { ...poseA, j3: Angle.FromDegrees(3) };
      expect(() =>
        facade.setPose(poseC, { transition: "animate" }),
      ).not.toThrow();
      expect(vm()?.snapCount).toBe(countBefore);
      expect(vm()?.j3.degrees).toBe(3);
    });
  });

  describe("story-13: As a slide Activity, I want `applyState` to accept the same option, so that I can restore a slide's authored configuration either with a transition or instantly.", () => {
    it.skip(
      "facade-apply: `applyState` with the snap option renders the restored pose with no transition; without it the restored pose transitions",
      // View-only — snap versus transition on restore is observable only on Babylon joint nodes
    );
    it.skip(
      "controller-apply: `applyABB6700State` accepts the same option with the same behaviour",
      // View-only — snap versus transition on restore is observable only on Babylon joint nodes
    );
    it("contract: `applyState` stays callable with the snapshot alone and the facade still satisfies the SmartComponent structural convention; the option extends beyond the contract v1's documented `applyState(state)` signature without breaking it", () => {
      const sc: SmartComponent = facade;
      expect(sc.id).toBe("arm-1");

      const vm = readVM();
      const countBefore = vm()?.snapCount ?? 0;

      const stateA: ABB6700State = {
        version: ABB_6700_STATE_VERSION,
        j1: 1,
        j2: 2,
        j3: 3,
        j4: 4,
        j5: 5,
        j6: 6,
      };
      facade.applyState(stateA);
      expect(facade.getState()).toEqual(stateA);
      expect(vm()?.snapCount).toBe(countBefore);

      const stateB: ABB6700State = {
        version: ABB_6700_STATE_VERSION,
        j1: 11,
        j2: 12,
        j3: 13,
        j4: 14,
        j5: 15,
        j6: 16,
      };
      facade.applyState(stateB, { transition: "none" });
      expect(facade.getState()).toEqual(stateB);
      expect(vm()?.snapCount).toBe(countBefore + 1);

      const stateC: ABB6700State = {
        version: ABB_6700_STATE_VERSION,
        j1: 21,
        j2: 22,
        j3: 23,
        j4: 24,
        j5: 25,
        j6: 26,
      };
      applyABB6700State("arm-1", appObjects, stateC, { transition: "none" });
      expect(facade.getState()).toEqual(stateC);
      expect(vm()?.snapCount).toBe(countBefore + 2);
    });
  });

  describe("story-14: As a slide Activity, I want the snap option to change only how the pose is rendered, so that persistence, host UI and pacing are unaffected by it.", () => {
    it("same-committed-target: a command with the snap option commits the same target to the view model and `getState()` as the same command without it", () => {
      const armOneVM = readVM();
      const armTwoFacade = new ABB6700Facade("arm-2", appObjects);
      let armTwoVM: ABB6700VM | undefined;
      aBB6700PMAdapter.subscribe("arm-2", appObjects, (v) => {
        armTwoVM = v;
      });

      const pose = {
        j1: Angle.FromDegrees(11),
        j2: Angle.FromDegrees(22),
        j3: Angle.FromDegrees(33),
        j4: Angle.FromDegrees(44),
        j5: Angle.FromDegrees(55),
        j6: Angle.FromDegrees(66),
      };

      facade.setPose(pose, { transition: "none" });
      armTwoFacade.setPose(pose);

      expect(armOneVM()?.j1.degrees).toBe(armTwoVM?.j1.degrees);
      expect(armOneVM()?.j2.degrees).toBe(armTwoVM?.j2.degrees);
      expect(armOneVM()?.j3.degrees).toBe(armTwoVM?.j3.degrees);
      expect(armOneVM()?.j4.degrees).toBe(armTwoVM?.j4.degrees);
      expect(armOneVM()?.j5.degrees).toBe(armTwoVM?.j5.degrees);
      expect(armOneVM()?.j6.degrees).toBe(armTwoVM?.j6.degrees);
      expect(armOneVM()?.stabilizerAngle.degrees).toBe(
        armTwoVM?.stabilizerAngle.degrees,
      );
      expect(armOneVM()?.stabilizerExtension).toBe(
        armTwoVM?.stabilizerExtension,
      );
      expect(facade.getState()).toEqual(armTwoFacade.getState());
    });
    it("not-in-state: the snap request is not part of `ABB6700State`", () => {
      facade.setPose(
        {
          j1: Angle.FromDegrees(1),
          j2: Angle.FromDegrees(2),
          j3: Angle.FromDegrees(3),
          j4: Angle.FromDegrees(4),
          j5: Angle.FromDegrees(5),
          j6: Angle.FromDegrees(6),
        },
        { transition: "none" },
      );

      expect(Object.keys(facade.getState()).sort()).toEqual(
        ["version", "j1", "j2", "j3", "j4", "j5", "j6"].sort(),
      );
    });
    it("duration-untouched: a snap command leaves the transition duration unchanged, and the next animated command uses it", () => {
      const vm = readVM();

      facade.setTransitionDuration(250);

      facade.setPose(
        {
          j1: Angle.FromDegrees(1),
          j2: Angle.FromDegrees(2),
          j3: Angle.FromDegrees(3),
          j4: Angle.FromDegrees(4),
          j5: Angle.FromDegrees(5),
          j6: Angle.FromDegrees(6),
        },
        { transition: "none" },
      );

      expect(vm()?.transitionDurationMs).toBe(250);

      facade.setPose({
        j1: Angle.FromDegrees(11),
        j2: Angle.FromDegrees(12),
        j3: Angle.FromDegrees(13),
        j4: Angle.FromDegrees(14),
        j5: Angle.FromDegrees(15),
        j6: Angle.FromDegrees(16),
      });

      expect(vm()?.transitionDurationMs).toBe(250);
    });
    it.skip(
      "zero-duration: with a transition duration of zero, commands render immediately whether or not the option is given",
      // View-only — immediate rendering is observable only on Babylon joint nodes
    );
  });

  it.skip(
    "story-15: As a Student, I want a snap on one arm to leave the other arms alone, so that authoring one robot never disturbs another mid-motion.",
    // View-only — per-arm rendering; observable only on Babylon joint nodes
  );

  it.skip(
    "story-16: As a slide Activity, I want a snap commanded before the view attaches to have no lasting effect, so that the first animated command after load still transitions.",
    // View-only — requires a Babylon view attached after the command
  );
});
