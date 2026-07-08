import { describe, it, expect, beforeEach } from "vitest";
import { Angle, makeAppObjectRepo } from "@vived/core";
import { makeABB6700Entity, ABB6700Entity } from "../Entities/ABB6700Entity";
import { CalcStabilizerUC, makeCalcStabilizerUC } from "./CalcStabilizerUC";

describe("CalcStabilizerUC", () => {
  let appObjects: ReturnType<typeof makeAppObjectRepo>;
  let entity: ABB6700Entity;

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
    const appObject = appObjects.getOrCreate("test-arm");
    entity = makeABB6700Entity(appObject);
    makeCalcStabilizerUC(appObject);
  });

  it("initializes stabilizer values on construction", () => {
    expect(entity.stabilizerAngle.degrees).toBeCloseTo(8.0326, 3);
    expect(entity.stabilizerExtension).toBe(0);
  });

  it("updates stabilizer angle when j2 changes", () => {
    const initialAngle = entity.stabilizerAngle.radians;
    entity.j2 = Angle.FromDegrees(30);
    expect(entity.stabilizerAngle.radians).not.toBeCloseTo(initialAngle);
  });

  it("updates stabilizer extension when j2 changes", () => {
    entity.j2 = Angle.FromDegrees(30);
    expect(entity.stabilizerExtension).not.toBeCloseTo(0);
  });

  it("does not update stabilizer when other joints change", () => {
    const angleAfterInit = entity.stabilizerAngle.radians;
    const extAfterInit = entity.stabilizerExtension;
    entity.j1 = Angle.FromDegrees(45);
    expect(entity.stabilizerAngle.radians).toBe(angleAfterInit);
    expect(entity.stabilizerExtension).toBe(extAfterInit);
  });

  it("can retrieve via static get", () => {
    const appObject = appObjects.getOrCreate("test-arm");
    const uc = CalcStabilizerUC.get(appObject);
    expect(uc).toBeDefined();
  });

  it("stops observing after disposal", () => {
    const appObject = appObjects.getOrCreate("test-arm");
    const uc = CalcStabilizerUC.get(appObject)!;
    const angleBeforeDispose = entity.stabilizerAngle.radians;
    uc.dispose();

    entity.j2 = Angle.FromDegrees(30);
    expect(entity.stabilizerAngle.radians).toBe(angleBeforeDispose);
  });
});
