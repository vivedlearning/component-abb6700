import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  Angle,
  AppObject,
  makeAppObjectRepo,
  AppObjectRepo,
} from "@vived/core";
import { setJointAngle } from "./setJointAngle";
import { MockSetJointAngleUC } from "../Mocks/MockSetJointAngleUC";

describe("setJointAngle controller", () => {
  let appObjects: AppObjectRepo;
  let appObject: AppObject;

  beforeEach(() => {
    vi.clearAllMocks();
    appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("arm-1");
    const mockUC = new MockSetJointAngleUC(appObject);
    mockUC.setAngle = vi.fn();
  });

  it("delegates to the UC with the correct joint and angle", () => {
    const angle = Angle.FromDegrees(90);
    setJointAngle("arm-1", "j3", angle, appObjects);

    const uc = appObject.getComponent("SetJointAngleUC") as MockSetJointAngleUC;
    expect(uc.setAngle).toHaveBeenCalledWith("j3", angle);
  });

  it("calls setAngle once per invocation", () => {
    setJointAngle("arm-1", "j1", Angle.FromDegrees(45), appObjects);

    const uc = appObject.getComponent("SetJointAngleUC") as MockSetJointAngleUC;
    expect(uc.setAngle).toHaveBeenCalledTimes(1);
  });

  it("warns and does nothing if the UC is not found", () => {
    const warnSpy = vi.spyOn(appObjects, "submitWarning");

    setJointAngle("unknown-id", "j1", Angle.FromDegrees(0), appObjects);

    expect(warnSpy).toHaveBeenCalledWith(
      "setJointAngle",
      "Unable to find SetJointAngleUC for ID: unknown-id",
    );
  });
});
