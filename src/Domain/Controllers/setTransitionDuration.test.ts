import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppObject, makeAppObjectRepo, AppObjectRepo } from "@vived/core";
import { setTransitionDuration } from "./setTransitionDuration";
import { MockSetTransitionDurationUC } from "../Mocks/MockSetTransitionDurationUC";

describe("setTransitionDuration controller", () => {
  let appObjects: AppObjectRepo;
  let appObject: AppObject;

  beforeEach(() => {
    vi.clearAllMocks();
    appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("arm-1");
    const mockUC = new MockSetTransitionDurationUC(appObject);
    mockUC.setDuration = vi.fn();
  });

  it("delegates to the UC with the correct duration", () => {
    setTransitionDuration("arm-1", 250, appObjects);

    const uc = appObject.getComponent(
      "SetTransitionDurationUC",
    ) as MockSetTransitionDurationUC;
    expect(uc.setDuration).toHaveBeenCalledWith(250);
  });

  it("calls setDuration once per invocation", () => {
    setTransitionDuration("arm-1", 250, appObjects);

    const uc = appObject.getComponent(
      "SetTransitionDurationUC",
    ) as MockSetTransitionDurationUC;
    expect(uc.setDuration).toHaveBeenCalledTimes(1);
  });

  it("warns and does nothing if the UC is not found", () => {
    const warnSpy = vi.spyOn(appObjects, "submitWarning");

    setTransitionDuration("unknown-id", 250, appObjects);

    expect(warnSpy).toHaveBeenCalledWith(
      "setTransitionDuration",
      "Unable to find SetTransitionDurationUC for ID: unknown-id",
    );
  });
});
