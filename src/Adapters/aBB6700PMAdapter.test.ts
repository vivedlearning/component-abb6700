import { describe, it, expect, beforeEach } from "vitest";
import { AppObject, AppObjectRepo, makeAppObjectRepo } from "@vived/core";
import { MockABB6700PM } from "../Mocks/MockABB6700PM";
import { aBB6700PMAdapter } from "./aBB6700PMAdapter";

describe("aBB6700PMAdapter", () => {
  let appObjects: AppObjectRepo;
  let appObject: AppObject;
  const testId = "test-appobject-id";

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate(testId);
  });

  it("exposes correct default VM with 0-degree angles", () => {
    expect(aBB6700PMAdapter.defaultVM.j1.degrees).toBe(0);
    expect(aBB6700PMAdapter.defaultVM.j2.degrees).toBe(0);
    expect(aBB6700PMAdapter.defaultVM.j3.degrees).toBe(0);
    expect(aBB6700PMAdapter.defaultVM.j4.degrees).toBe(0);
    expect(aBB6700PMAdapter.defaultVM.j5.degrees).toBe(0);
    expect(aBB6700PMAdapter.defaultVM.j6.degrees).toBe(0);
  });

  it("subscribes view (addView called)", () => {
    const mockPM = new MockABB6700PM(appObject);

    const addViewSpy = vi.spyOn(mockPM, "addView");
    const setVM = vi.fn();

    aBB6700PMAdapter.subscribe(testId, appObjects, setVM);

    expect(addViewSpy).toHaveBeenCalledWith(setVM);
  });

  it("unsubscribes view (removeView called)", () => {
    const mockPM = new MockABB6700PM(appObject);

    const removeViewSpy = vi.spyOn(mockPM, "removeView");
    const setVM = vi.fn();

    aBB6700PMAdapter.unsubscribe(testId, appObjects, setVM);

    expect(removeViewSpy).toHaveBeenCalledWith(setVM);
  });

  it("handles missing PM gracefully during subscribe", () => {
    const setVM = vi.fn();
    const submitWarningSpy = vi.spyOn(appObjects, "submitWarning");

    aBB6700PMAdapter.subscribe(testId, appObjects, setVM);

    expect(submitWarningSpy).toHaveBeenCalledWith(
      "aBB6700PMAdapter",
      "Unable to find ABB6700PM",
    );
  });

  it("handles missing PM gracefully during unsubscribe", () => {
    const setVM = vi.fn();

    expect(() =>
      aBB6700PMAdapter.unsubscribe(testId, appObjects, setVM),
    ).not.toThrow();
  });

  it("handles empty ID gracefully during subscribe", () => {
    const setVM = vi.fn();

    aBB6700PMAdapter.subscribe("", appObjects, setVM);

    expect(setVM).not.toHaveBeenCalled();
  });

  it("handles empty ID gracefully during unsubscribe", () => {
    const setVM = vi.fn();

    aBB6700PMAdapter.unsubscribe("", appObjects, setVM);

    expect(setVM).not.toHaveBeenCalled();
  });
});
