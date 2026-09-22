import { describe, it, expect, beforeEach } from "vitest";
import { AppObject, makeAppObjectRepo } from "@vived/core";
import {
  makeABB6700Entity,
  ABB6700Entity,
  ABB_6700_DEFAULT_TRANSITION_DURATION_MS,
} from "../Entities/ABB6700Entity";
import {
  SetTransitionDurationUC,
  makeSetTransitionDurationUC,
} from "./SetTransitionDurationUC";

describe("SetTransitionDurationUC", () => {
  let appObject: AppObject;
  let entity: ABB6700Entity;
  let uc: SetTransitionDurationUC;

  beforeEach(() => {
    const appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("test-arm");
    entity = makeABB6700Entity(appObject);
    uc = makeSetTransitionDurationUC(appObject);
  });

  it("sets the transition duration on the entity", () => {
    uc.setDuration(250);

    expect(entity.transitionDurationMs).toBe(250);
  });

  it("overwrites a previously set duration", () => {
    uc.setDuration(250);
    uc.setDuration(500);

    expect(entity.transitionDurationMs).toBe(500);
  });

  it("allows a duration of zero", () => {
    uc.setDuration(0);

    expect(entity.transitionDurationMs).toBe(0);
  });

  it("rejects a negative duration and leaves the previous duration untouched", () => {
    uc.setDuration(250);
    uc.setDuration(-1);

    expect(entity.transitionDurationMs).toBe(250);
  });

  it("rejects a NaN duration and leaves the previous duration untouched", () => {
    uc.setDuration(250);
    uc.setDuration(NaN);

    expect(entity.transitionDurationMs).toBe(250);
  });

  it("rejects an infinite duration and leaves the previous duration untouched", () => {
    uc.setDuration(250);
    uc.setDuration(Infinity);

    expect(entity.transitionDurationMs).toBe(250);
  });

  it("can retrieve via static get", () => {
    expect(SetTransitionDurationUC.get(appObject)).toBeDefined();
  });

  it("can retrieve via static getById", () => {
    const appObjects = makeAppObjectRepo();
    const ao = appObjects.getOrCreate("arm-2");
    makeABB6700Entity(ao);
    makeSetTransitionDurationUC(ao);

    expect(SetTransitionDurationUC.getById("arm-2", appObjects)).toBeDefined();
  });

  it("returns undefined for getById when not found", () => {
    const appObjects = makeAppObjectRepo();
    expect(
      SetTransitionDurationUC.getById("missing", appObjects),
    ).toBeUndefined();
  });

  it("defaults the entity to ABB_6700_DEFAULT_TRANSITION_DURATION_MS", () => {
    expect(entity.transitionDurationMs).toBe(
      ABB_6700_DEFAULT_TRANSITION_DURATION_MS,
    );
  });
});
