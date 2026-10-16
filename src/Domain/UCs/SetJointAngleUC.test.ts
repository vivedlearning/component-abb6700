import { describe, it, expect, beforeEach } from "vitest";
import { Angle, AppObject, makeAppObjectRepo } from "@vived/core";
import { ABB6700Entity, makeABB6700Entity } from "../Entities/ABB6700Entity";
import { SetJointAngleUC, makeSetJointAngleUC } from "./SetJointAngleUC";

describe("SetJointAngleUC", () => {
  let appObject: AppObject;
  let entity: ABB6700Entity;
  let uc: SetJointAngleUC;

  beforeEach(() => {
    const appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("test-arm");
    entity = makeABB6700Entity(appObject);
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

  describe("path cancellation", () => {
    const startPath = () =>
      entity.startPath([
        {
          pose: {
            j1: Angle.FromDegrees(20),
            j2: Angle.FromDegrees(21),
            j3: Angle.FromDegrees(22),
            j4: Angle.FromDegrees(23),
            j5: Angle.FromDegrees(24),
            j6: Angle.FromDegrees(25),
          },
          durationMs: 500,
        },
      ]);

    it("cancels the path in progress", () => {
      startPath();

      uc.setAngle("j3", Angle.FromDegrees(45));

      expect(entity.path).toBeUndefined();
    });

    it("cancels the path before writing the joint", () => {
      startPath();
      const before = entity.j3.degrees;
      const seen: { path: unknown; j3: number }[] = [];
      entity.addChangeObserver(() => {
        seen.push({ path: entity.path, j3: entity.j3.degrees });
      });

      uc.setAngle("j3", Angle.FromDegrees(45));

      // The first notification carries the cancel, with the old joint.
      expect(seen[0]).toEqual({ path: undefined, j3: before });
    });

    it("cancels the path when snapping", () => {
      startPath();

      uc.setAngle("j3", Angle.FromDegrees(45), { transition: "none" });

      expect(entity.path).toBeUndefined();
      expect(entity.snapCount).toBe(1);
    });
  });

  describe("snap option", () => {
    it("does not increment snapCount when no options are given", () => {
      uc.setAngle("j1", Angle.FromDegrees(10));
      expect(entity.snapCount).toBe(0);
    });

    it('does not increment snapCount when transition is "transition"', () => {
      uc.setAngle("j1", Angle.FromDegrees(10), { transition: "transition" });
      expect(entity.snapCount).toBe(0);
    });

    it('increments snapCount when transition is "none"', () => {
      uc.setAngle("j1", Angle.FromDegrees(10), { transition: "none" });
      expect(entity.snapCount).toBe(1);
      expect(entity.j1.degrees).toBe(10);
    });
  });
});
