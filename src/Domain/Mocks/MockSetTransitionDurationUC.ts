import { AppObject } from "@vived/core";
import { SetTransitionDurationUC } from "../UCs/SetTransitionDurationUC";

export class MockSetTransitionDurationUC extends SetTransitionDurationUC {
  setDuration = (_ms: number): void => {};

  constructor(appObject: AppObject) {
    super(appObject, SetTransitionDurationUC.type);
  }
}
