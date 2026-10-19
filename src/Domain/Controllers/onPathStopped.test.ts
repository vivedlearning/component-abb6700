import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppObject, makeAppObjectRepo, AppObjectRepo } from "@vived/core";
import { onPathStopped } from "./onPathStopped";
import { MockStopPathUC } from "../Mocks/MockStopPathUC";

describe("onPathStopped controller", () => {
  let appObjects: AppObjectRepo;
  let appObject: AppObject;
  let unsubscribe: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("arm-1");
    unsubscribe = vi.fn();
    const mockUC = new MockStopPathUC(appObject);
    mockUC.subscribeOnStopped = vi.fn(() => unsubscribe);
  });

  it("subscribes the callback on the UC", () => {
    const cb = vi.fn();
    onPathStopped("arm-1", appObjects, cb);

    const uc = appObject.getComponent("StopPathUC") as MockStopPathUC;
    expect(uc.subscribeOnStopped).toHaveBeenCalledWith(cb);
    expect(uc.subscribeOnStopped).toHaveBeenCalledTimes(1);
  });

  it("returns the UC's unsubscribe function", () => {
    const result = onPathStopped("arm-1", appObjects, vi.fn());

    expect(result).toBe(unsubscribe);
  });

  it("warns and returns a no-op unsubscribe if the UC is not found", () => {
    const warnSpy = vi.spyOn(appObjects, "submitWarning");

    const result = onPathStopped("unknown-id", appObjects, vi.fn());

    expect(warnSpy).toHaveBeenCalledWith(
      "onPathStopped",
      "Unable to find StopPathUC for ID: unknown-id",
    );
    expect(() => result()).not.toThrow();
  });
});
