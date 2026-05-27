import { describe, it, expect, vi, beforeEach } from "vitest";
import { Angle, makeAppObjectRepo, AppObjectRepo } from "@vived/core";
import { makeABB6700Entity } from "../Entities/ABB6700Entity";
import { getPose } from "./getPose";

describe("getPose controller", () => {
  let appObjects: AppObjectRepo;

  beforeEach(() => {
    vi.clearAllMocks();
    appObjects = makeAppObjectRepo();
  });

  it("returns the current pose from the entity", () => {
    const ao = appObjects.getOrCreate("arm-1");
    const entity = makeABB6700Entity(ao);
    entity.j1 = Angle.FromDegrees(10);
    entity.j2 = Angle.FromDegrees(20);
    entity.j3 = Angle.FromDegrees(30);
    entity.j4 = Angle.FromDegrees(40);
    entity.j5 = Angle.FromDegrees(50);
    entity.j6 = Angle.FromDegrees(60);

    const pose = getPose("arm-1", appObjects);

    expect(pose).toBeDefined();
    expect(pose!.j1.degrees).toBe(10);
    expect(pose!.j2.degrees).toBe(20);
    expect(pose!.j3.degrees).toBe(30);
    expect(pose!.j4.degrees).toBe(40);
    expect(pose!.j5.degrees).toBe(50);
    expect(pose!.j6.degrees).toBe(60);
  });

  it("returns all zeros for a freshly created entity", () => {
    const ao = appObjects.getOrCreate("arm-1");
    makeABB6700Entity(ao);

    const pose = getPose("arm-1", appObjects);

    expect(pose).toBeDefined();
    expect(pose!.j1.degrees).toBe(0);
    expect(pose!.j6.degrees).toBe(0);
  });

  it("warns and returns undefined if entity is not found", () => {
    const warnSpy = vi.spyOn(appObjects, "submitWarning");

    const pose = getPose("missing-id", appObjects);

    expect(pose).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      "getPose",
      "Unable to find ABB6700Entity for ID: missing-id",
    );
  });
});
