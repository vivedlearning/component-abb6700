import { describe, it, expect, beforeEach } from "vitest";
import { Angle, AppObject, makeAppObjectRepo } from "@vived/core";
import { makeABB6700Entity, ABB6700Entity } from "../Entities/ABB6700Entity";
import { SetPoseUC, makeSetPoseUC, ABB6700Pose } from "./SetPoseUC";

const makePose = (degrees: number): ABB6700Pose => ({
  j1: Angle.FromDegrees(degrees),
  j2: Angle.FromDegrees(degrees + 1),
  j3: Angle.FromDegrees(degrees + 2),
  j4: Angle.FromDegrees(degrees + 3),
  j5: Angle.FromDegrees(degrees + 4),
  j6: Angle.FromDegrees(degrees + 5),
});

describe("SetPoseUC", () => {
  let appObject: AppObject;
  let entity: ABB6700Entity;
  let uc: SetPoseUC;

  beforeEach(() => {
    const appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("test-arm");
    entity = makeABB6700Entity(appObject);
    uc = makeSetPoseUC(appObject);
  });

  it("sets all six joints on the entity", () => {
    const pose = makePose(10);
    uc.setPose(pose);

    expect(entity.j1.degrees).toBe(10);
    expect(entity.j2.degrees).toBe(11);
    expect(entity.j3.degrees).toBe(12);
    expect(entity.j4.degrees).toBe(13);
    expect(entity.j5.degrees).toBe(14);
    expect(entity.j6.degrees).toBe(15);
  });

  it("overwrites previous joint values", () => {
    uc.setPose(makePose(45));
    uc.setPose(makePose(0));

    expect(entity.j1.degrees).toBe(0);
    expect(entity.j6.degrees).toBe(5);
  });

  it("can retrieve via static get", () => {
    expect(SetPoseUC.get(appObject)).toBeDefined();
  });

  it("can retrieve via static getById", () => {
    const appObjects = makeAppObjectRepo();
    const ao = appObjects.getOrCreate("arm-2");
    makeABB6700Entity(ao);
    makeSetPoseUC(ao);

    expect(SetPoseUC.getById("arm-2", appObjects)).toBeDefined();
  });

  it("returns undefined for getById when not found", () => {
    const appObjects = makeAppObjectRepo();
    expect(SetPoseUC.getById("missing", appObjects)).toBeUndefined();
  });
});
