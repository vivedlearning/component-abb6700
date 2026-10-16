import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppObject, makeAppObjectRepo, AppObjectRepo } from "@vived/core";
import { stopPath } from "./stopPath";
import { MockStopPathUC } from "../Mocks/MockStopPathUC";

describe("stopPath controller", () => {
  let appObjects: AppObjectRepo;
  let appObject: AppObject;

  beforeEach(() => {
    vi.clearAllMocks();
    appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("arm-1");
    const mockUC = new MockStopPathUC(appObject);
    mockUC.stopPath = vi.fn();
  });

  it("delegates to the UC with the options", () => {
    const options = { durationMs: 300 };
    stopPath("arm-1", appObjects, options);

    const uc = appObject.getComponent("StopPathUC") as MockStopPathUC;
    expect(uc.stopPath).toHaveBeenCalledWith(options);
  });

  it("delegates to the UC with no arguments when no options are given", () => {
    stopPath("arm-1", appObjects);

    const uc = appObject.getComponent("StopPathUC") as MockStopPathUC;
    expect(uc.stopPath).toHaveBeenCalledWith();
  });

  it("calls stopPath once per invocation", () => {
    stopPath("arm-1", appObjects);

    const uc = appObject.getComponent("StopPathUC") as MockStopPathUC;
    expect(uc.stopPath).toHaveBeenCalledTimes(1);
  });

  it("warns and does nothing if the UC is not found", () => {
    const warnSpy = vi.spyOn(appObjects, "submitWarning");

    stopPath("unknown-id", appObjects);

    expect(warnSpy).toHaveBeenCalledWith(
      "stopPath",
      "Unable to find StopPathUC for ID: unknown-id",
    );
  });
});
