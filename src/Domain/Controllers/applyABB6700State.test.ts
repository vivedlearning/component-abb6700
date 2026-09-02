import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppObject, makeAppObjectRepo, AppObjectRepo } from "@vived/core";
import { applyABB6700State } from "./applyABB6700State";
import { MockSetPoseUC } from "../Mocks/MockSetPoseUC";
import {
  ABB_6700_STATE_VERSION,
  type ABB6700State,
} from "../Entities/ABB6700State";

const makeState = (): ABB6700State => ({
  version: ABB_6700_STATE_VERSION,
  j1: 10,
  j2: 20,
  j3: 30,
  j4: 40,
  j5: 50,
  j6: 60,
});

describe("applyABB6700State controller", () => {
  let appObjects: AppObjectRepo;
  let appObject: AppObject;
  let mockUC: MockSetPoseUC;

  beforeEach(() => {
    vi.clearAllMocks();
    appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("arm-1");
    mockUC = new MockSetPoseUC(appObject);
    mockUC.setPose = vi.fn();
  });

  it("assembles the full pose from the snapshot's degrees and calls setPose once", () => {
    applyABB6700State("arm-1", appObjects, makeState());

    expect(mockUC.setPose).toHaveBeenCalledTimes(1);
    const pose = (mockUC.setPose as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(pose.j1.degrees).toBe(10);
    expect(pose.j2.degrees).toBe(20);
    expect(pose.j3.degrees).toBe(30);
    expect(pose.j4.degrees).toBe(40);
    expect(pose.j5.degrees).toBe(50);
    expect(pose.j6.degrees).toBe(60);
  });

  it("applies the snapshot regardless of its version — no gate, no no-op", () => {
    applyABB6700State("arm-1", appObjects, {
      ...makeState(),
      version: ABB_6700_STATE_VERSION + 999,
    });

    expect(mockUC.setPose).toHaveBeenCalledTimes(1);
    const pose = (mockUC.setPose as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(pose.j1.degrees).toBe(10);
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["NaN", NaN],
    ["a string", "not-a-number"],
  ])(
    "falls back to the joint default when a joint's value is %s",
    (_label, badValue) => {
      const snapshot = {
        ...makeState(),
        j4: badValue,
      } as unknown as ABB6700State;

      applyABB6700State("arm-1", appObjects, snapshot);

      const pose = (mockUC.setPose as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(pose.j4.degrees).toBe(0);
      expect(Number.isNaN(pose.j4.degrees)).toBe(false);
    },
  );

  it("warns and does nothing if the UC is not found", () => {
    const warnSpy = vi.spyOn(appObjects, "submitWarning");

    applyABB6700State("unknown-id", appObjects, makeState());

    expect(warnSpy).toHaveBeenCalledWith(
      "applyABB6700State",
      "Unable to find SetPoseUC for ID: unknown-id",
    );
    expect(mockUC.setPose).not.toHaveBeenCalled();
  });
});
