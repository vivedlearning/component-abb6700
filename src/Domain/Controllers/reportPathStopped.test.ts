import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  Angle,
  AppObject,
  makeAppObjectRepo,
  AppObjectRepo,
} from "@vived/core";
import { reportPathStopped } from "./reportPathStopped";
import { MockStopPathUC } from "../Mocks/MockStopPathUC";
import type { ABB6700Pose } from "../UCs/SetPoseUC";

const pose: ABB6700Pose = {
  j1: Angle.FromDegrees(10),
  j2: Angle.FromDegrees(20),
  j3: Angle.FromDegrees(30),
  j4: Angle.FromDegrees(40),
  j5: Angle.FromDegrees(50),
  j6: Angle.FromDegrees(60),
};

describe("reportPathStopped controller", () => {
  let appObjects: AppObjectRepo;
  let appObject: AppObject;

  beforeEach(() => {
    vi.clearAllMocks();
    appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("arm-1");
    const mockUC = new MockStopPathUC(appObject);
    mockUC.restedAt = vi.fn();
  });

  it("delegates to the UC with the play count and the rest pose", () => {
    reportPathStopped("arm-1", appObjects, 3, pose);

    const uc = appObject.getComponent("StopPathUC") as MockStopPathUC;
    expect(uc.restedAt).toHaveBeenCalledWith(3, pose);
  });

  it("calls restedAt once per invocation", () => {
    reportPathStopped("arm-1", appObjects, 3, pose);

    const uc = appObject.getComponent("StopPathUC") as MockStopPathUC;
    expect(uc.restedAt).toHaveBeenCalledTimes(1);
  });

  it("warns and does nothing if the UC is not found", () => {
    const warnSpy = vi.spyOn(appObjects, "submitWarning");

    reportPathStopped("unknown-id", appObjects, 3, pose);

    expect(warnSpy).toHaveBeenCalledWith(
      "reportPathStopped",
      "Unable to find StopPathUC for ID: unknown-id",
    );
  });
});
