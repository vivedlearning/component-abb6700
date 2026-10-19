import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  Angle,
  AppObject,
  makeAppObjectRepo,
  AppObjectRepo,
} from "@vived/core";
import { playPath } from "./playPath";
import { MockPlayPathUC } from "../Mocks/MockPlayPathUC";
import type { ABB6700PathSegment } from "../Entities/ABB6700Path";

const makeSegments = (): ABB6700PathSegment[] => [
  {
    pose: {
      j1: Angle.FromDegrees(10),
      j2: Angle.FromDegrees(20),
      j3: Angle.FromDegrees(30),
      j4: Angle.FromDegrees(40),
      j5: Angle.FromDegrees(50),
      j6: Angle.FromDegrees(60),
    },
    durationMs: 500,
    dwellMs: 100,
  },
];

describe("playPath controller", () => {
  let appObjects: AppObjectRepo;
  let appObject: AppObject;

  beforeEach(() => {
    vi.clearAllMocks();
    appObjects = makeAppObjectRepo();
    appObject = appObjects.getOrCreate("arm-1");
    const mockUC = new MockPlayPathUC(appObject);
    mockUC.playPath = vi.fn();
  });

  it("delegates to the UC with the segments", () => {
    const segments = makeSegments();
    playPath("arm-1", segments, appObjects);

    const uc = appObject.getComponent("PlayPathUC") as MockPlayPathUC;
    expect(uc.playPath).toHaveBeenCalledWith(segments);
  });

  it("calls playPath once per invocation", () => {
    playPath("arm-1", makeSegments(), appObjects);

    const uc = appObject.getComponent("PlayPathUC") as MockPlayPathUC;
    expect(uc.playPath).toHaveBeenCalledTimes(1);
  });

  it("warns and does nothing if the UC is not found", () => {
    const warnSpy = vi.spyOn(appObjects, "submitWarning");

    playPath("unknown-id", makeSegments(), appObjects);

    expect(warnSpy).toHaveBeenCalledWith(
      "playPath",
      "Unable to find PlayPathUC for ID: unknown-id",
    );
  });
});
