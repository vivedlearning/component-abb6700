import { describe, it, expect, beforeEach } from "vitest";
import { Angle, AppObject, makeAppObjectRepo } from "@vived/core";
import { makeABB6700Entity } from "../Entities/ABB6700Entity";
import { SetJointAngleUC, makeSetJointAngleUC } from "./SetJointAngleUC";

describe("SetJointAngleUC", () => {
  let appObject: AppObject;
  let uc: SetJointAngleUC;

  beforeEach(() => {
    const appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("test-arm");
    makeABB6700Entity(appObject);
    uc = makeSetJointAngleUC(appObject);
  });

  it.each([
    ["j1"],
    ["j2"],
    ["j3"],
    ["j4"],
    ["j5"],
    ["j6"],
  ] as const)("sets joint %s on the entity", (joint) => {
    uc.setAngle(joint, Angle.FromDegrees(45));

    const entity = appObject.getComponent("ABB6700Entity") as Record<string, Angle>;
    expect(entity[joint].degrees).toBe(45);
  });

  it("sets different angles independently", () => {
    uc.setAngle("j1", Angle.FromDegrees(10));
    uc.setAngle("j3", Angle.FromDegrees(90));
    uc.setAngle("j6", Angle.FromDegrees(-45));

    const entity = appObject.getComponent("ABB6700Entity") as Record<string, Angle>;
    expect(entity["j1"].degrees).toBe(10);
    expect(entity["j2"].degrees).toBe(0);
    expect(entity["j3"].degrees).toBe(90);
    expect(entity["j6"].degrees).toBe(-45);
  });
});
