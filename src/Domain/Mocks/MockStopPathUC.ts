import { AppObject } from "@vived/core";
import type { ABB6700StopPathOptions } from "../Entities/ABB6700Path";
import type { ABB6700Pose } from "../UCs/SetPoseUC";
import { StopPathUC } from "../UCs/StopPathUC";

export class MockStopPathUC extends StopPathUC {
  stopPath = (_options?: ABB6700StopPathOptions): void => {};
  restedAt = (_playCount: number, _pose: ABB6700Pose): void => {};
  subscribeOnStopped =
    (_cb: () => void): (() => void) =>
    () => {};

  constructor(appObject: AppObject) {
    super(appObject, StopPathUC.type);
  }
}
