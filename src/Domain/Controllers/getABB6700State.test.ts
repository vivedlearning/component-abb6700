import { describe, it, expect, vi, beforeEach } from "vitest";
import { Angle, makeAppObjectRepo, AppObjectRepo } from "@vived/core";
import { makeABB6700Entity } from "../Entities/ABB6700Entity";
import {
  ABB_6700_STATE_VERSION,
  defaultABB6700State,
} from "../Entities/ABB6700State";
import { getABB6700State } from "./getABB6700State";

describe("getABB6700State controller", () => {
  let appObjects: AppObjectRepo;

  beforeEach(() => {
    vi.clearAllMocks();
    appObjects = makeAppObjectRepo();
  });

  it("returns the six joint angles in degrees tagged with the requested version", () => {
    const ao = appObjects.getOrCreate("arm-1");
    const entity = makeABB6700Entity(ao);
    entity.j1 = Angle.FromDegrees(10);
    entity.j2 = Angle.FromDegrees(20);
    entity.j3 = Angle.FromDegrees(30);
    entity.j4 = Angle.FromDegrees(40);
    entity.j5 = Angle.FromDegrees(50);
    entity.j6 = Angle.FromDegrees(60);

    const requestedVersion = ABB_6700_STATE_VERSION + 999;
    const state = getABB6700State("arm-1", appObjects, requestedVersion);

    expect(state).toEqual({
      version: requestedVersion,
      j1: 10,
      j2: 20,
      j3: 30,
      j4: 40,
      j5: 50,
      j6: 60,
    });
  });

  it("returns all zeros for a freshly created entity", () => {
    const ao = appObjects.getOrCreate("arm-1");
    makeABB6700Entity(ao);

    const state = getABB6700State("arm-1", appObjects, ABB_6700_STATE_VERSION);

    expect(state.j1).toBe(0);
    expect(state.j6).toBe(0);
  });

  it("warns and returns the default state, tagged with the requested version, if the entity is not found", () => {
    const warnSpy = vi.spyOn(appObjects, "submitWarning");

    const requestedVersion = ABB_6700_STATE_VERSION + 5;
    const state = getABB6700State(
      "missing-id",
      appObjects,
      requestedVersion,
    );

    expect(state).toEqual(defaultABB6700State(requestedVersion));
    expect(warnSpy).toHaveBeenCalledWith(
      "getABB6700State",
      "Unable to find ABB6700Entity for ID: missing-id",
    );
  });

  it("does not throw for an id with no arm behind it", () => {
    expect(() =>
      getABB6700State("missing-id", appObjects, ABB_6700_STATE_VERSION),
    ).not.toThrow();
  });
});
