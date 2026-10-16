import { AppObject } from "@vived/core";
import type { ABB6700PathSegment } from "../Entities/ABB6700Path";
import { PlayPathUC } from "../UCs/PlayPathUC";

export class MockPlayPathUC extends PlayPathUC {
  playPath = (_segments: readonly ABB6700PathSegment[]): void => {};
  segmentReached = (_playCount: number, _segmentIndex: number): void => {};
  dwellEnded = (_playCount: number, _segmentIndex: number): void => {};
  subscribeOnSegmentReached =
    (_cb: () => void): (() => void) =>
    () => {};
  subscribeOnCompleted =
    (_cb: () => void): (() => void) =>
    () => {};

  constructor(appObject: AppObject) {
    super(appObject, PlayPathUC.type);
  }
}
