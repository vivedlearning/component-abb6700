import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppObject, makeAppObjectRepo, AppObjectRepo } from "@vived/core";
import { reportPathDwellEnded } from "./reportPathDwellEnded";
import { MockPlayPathUC } from "../Mocks/MockPlayPathUC";

describe("reportPathDwellEnded controller", () => {
  let appObjects: AppObjectRepo;
  let appObject: AppObject;

  beforeEach(() => {
    vi.clearAllMocks();
    appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("arm-1");
    const mockUC = new MockPlayPathUC(appObject);
    mockUC.dwellEnded = vi.fn();
  });

  it("delegates to the UC with the play count and segment index", () => {
    reportPathDwellEnded("arm-1", appObjects, 3, 1);

    const uc = appObject.getComponent("PlayPathUC") as MockPlayPathUC;
    expect(uc.dwellEnded).toHaveBeenCalledWith(3, 1);
  });

  it("calls dwellEnded once per invocation", () => {
    reportPathDwellEnded("arm-1", appObjects, 3, 1);

    const uc = appObject.getComponent("PlayPathUC") as MockPlayPathUC;
    expect(uc.dwellEnded).toHaveBeenCalledTimes(1);
  });

  it("warns and does nothing if the UC is not found", () => {
    const warnSpy = vi.spyOn(appObjects, "submitWarning");

    reportPathDwellEnded("unknown-id", appObjects, 3, 1);

    expect(warnSpy).toHaveBeenCalledWith(
      "reportPathDwellEnded",
      "Unable to find PlayPathUC for ID: unknown-id",
    );
  });
});
