import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  Angle,
  AppObject,
  makeAppObjectRepo,
  AppObjectRepo,
} from "@vived/core";
import { setPose } from "./setPose";
import { MockSetPoseUC } from "../Mocks/MockSetPoseUC";
import { ABB6700Pose } from "../UCs/SetPoseUC";

const makePose = (): ABB6700Pose => ({
  j1: Angle.FromDegrees(10),
  j2: Angle.FromDegrees(20),
  j3: Angle.FromDegrees(30),
  j4: Angle.FromDegrees(40),
  j5: Angle.FromDegrees(50),
  j6: Angle.FromDegrees(60),
});

describe("setPose controller", () => {
  let appObjects: AppObjectRepo;
  let appObject: AppObject;

  beforeEach(() => {
    vi.clearAllMocks();
    appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("arm-1");
    const mockUC = new MockSetPoseUC(appObject);
    mockUC.setPose = vi.fn();
  });

  it("delegates to the UC with the correct pose", () => {
    const pose = makePose();
    setPose("arm-1", pose, appObjects);

    const uc = appObject.getComponent("SetPoseUC") as MockSetPoseUC;
    expect(uc.setPose).toHaveBeenCalledWith(pose);
  });

  it("calls setPose once per invocation", () => {
    setPose("arm-1", makePose(), appObjects);

    const uc = appObject.getComponent("SetPoseUC") as MockSetPoseUC;
    expect(uc.setPose).toHaveBeenCalledTimes(1);
  });

  it("warns and does nothing if the UC is not found", () => {
    const warnSpy = vi.spyOn(appObjects, "submitWarning");

    setPose("unknown-id", makePose(), appObjects);

    expect(warnSpy).toHaveBeenCalledWith(
      "setPose",
      "Unable to find SetPoseUC for ID: unknown-id",
    );
  });
});
