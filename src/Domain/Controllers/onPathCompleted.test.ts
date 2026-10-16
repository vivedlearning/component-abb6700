import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppObject, makeAppObjectRepo, AppObjectRepo } from "@vived/core";
import { onPathCompleted } from "./onPathCompleted";
import { MockPlayPathUC } from "../Mocks/MockPlayPathUC";

describe("onPathCompleted controller", () => {
  let appObjects: AppObjectRepo;
  let appObject: AppObject;
  let unsubscribe: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("arm-1");
    unsubscribe = vi.fn();
    const mockUC = new MockPlayPathUC(appObject);
    mockUC.subscribeOnCompleted = vi.fn(() => unsubscribe);
  });

  it("subscribes the callback on the UC", () => {
    const cb = vi.fn();
    onPathCompleted("arm-1", appObjects, cb);

    const uc = appObject.getComponent("PlayPathUC") as MockPlayPathUC;
    expect(uc.subscribeOnCompleted).toHaveBeenCalledWith(cb);
    expect(uc.subscribeOnCompleted).toHaveBeenCalledTimes(1);
  });

  it("returns the UC's unsubscribe function", () => {
    const result = onPathCompleted("arm-1", appObjects, vi.fn());

    expect(result).toBe(unsubscribe);
  });

  it("warns and returns a no-op unsubscribe if the UC is not found", () => {
    const warnSpy = vi.spyOn(appObjects, "submitWarning");

    const result = onPathCompleted("unknown-id", appObjects, vi.fn());

    expect(warnSpy).toHaveBeenCalledWith(
      "onPathCompleted",
      "Unable to find PlayPathUC for ID: unknown-id",
    );
    expect(() => result()).not.toThrow();
  });
});
