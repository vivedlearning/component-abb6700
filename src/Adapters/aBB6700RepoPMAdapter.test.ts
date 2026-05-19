import { describe, it, expect, beforeEach } from "vitest";
import { AppObjectRepo, makeAppObjectRepo } from "@vived/core";
import { makeABB6700Repo } from "../Entities/ABB6700Repo";
import { makeABB6700RepoPM } from "../PMs/ABB6700RepoPM";
import { aBB6700RepoPMAdapter } from "./aBB6700RepoPMAdapter";

describe("aBB6700RepoPMAdapter", () => {
  let appObjects: AppObjectRepo;

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
  });

  it("exposes an empty default VM", () => {
    expect(aBB6700RepoPMAdapter.defaultVM).toEqual({ entityIds: [] });
  });

  it("subscribes and unsubscribes using ABB6700RepoPM", () => {
    const appObject = appObjects.getOrCreate("ABB6700s");
    makeABB6700Repo(appObject);
    const pm = makeABB6700RepoPM(appObject);

    const addViewSpy = vi.spyOn(pm, "addView");
    const removeViewSpy = vi.spyOn(pm, "removeView");
    const setVM = vi.fn();

    aBB6700RepoPMAdapter.subscribe("ABB6700s", appObjects, setVM);
    aBB6700RepoPMAdapter.unsubscribe("ABB6700s", appObjects, setVM);

    expect(addViewSpy).toHaveBeenCalledWith(setVM);
    expect(removeViewSpy).toHaveBeenCalledWith(setVM);
  });

  it("warns when subscribing without a repo PM", () => {
    const setVM = vi.fn();
    const submitWarningSpy = vi.spyOn(appObjects, "submitWarning");

    aBB6700RepoPMAdapter.subscribe("ABB6700s", appObjects, setVM);

    expect(submitWarningSpy).toHaveBeenCalledWith(
      "aBB6700RepoPMAdapter",
      "Unable to find ABB6700RepoPM",
    );
  });

  it("handles missing PM and empty id on unsubscribe", () => {
    const setVM = vi.fn();

    expect(() =>
      aBB6700RepoPMAdapter.unsubscribe("ABB6700s", appObjects, setVM),
    ).not.toThrow();

    expect(() =>
      aBB6700RepoPMAdapter.unsubscribe("", appObjects, setVM),
    ).not.toThrow();
  });
});
