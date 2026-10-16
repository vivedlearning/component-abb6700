import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppObject, makeAppObjectRepo, AppObjectRepo } from "@vived/core";
import { reportPathSegmentReached } from "./reportPathSegmentReached";
import { MockPlayPathUC } from "../Mocks/MockPlayPathUC";

describe("reportPathSegmentReached controller", () => {
  let appObjects: AppObjectRepo;
  let appObject: AppObject;

  beforeEach(() => {
    vi.clearAllMocks();
    appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("arm-1");
    const mockUC = new MockPlayPathUC(appObject);
    mockUC.segmentReached = vi.fn();
  });

  it("delegates to the UC with the play count and segment index", () => {
    reportPathSegmentReached("arm-1", appObjects, 3, 1);

    const uc = appObject.getComponent("PlayPathUC") as MockPlayPathUC;
    expect(uc.segmentReached).toHaveBeenCalledWith(3, 1);
  });

  it("calls segmentReached once per invocation", () => {
    reportPathSegmentReached("arm-1", appObjects, 3, 1);

    const uc = appObject.getComponent("PlayPathUC") as MockPlayPathUC;
    expect(uc.segmentReached).toHaveBeenCalledTimes(1);
  });

  it("warns and does nothing if the UC is not found", () => {
    const warnSpy = vi.spyOn(appObjects, "submitWarning");

    reportPathSegmentReached("unknown-id", appObjects, 3, 1);

    expect(warnSpy).toHaveBeenCalledWith(
      "reportPathSegmentReached",
      "Unable to find PlayPathUC for ID: unknown-id",
    );
  });
});
