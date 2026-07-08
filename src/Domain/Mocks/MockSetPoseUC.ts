import { AppObject } from "@vived/core";
import { ABB6700Pose, SetPoseUC } from "../UCs/SetPoseUC";

export class MockSetPoseUC extends SetPoseUC {
  setPose = (_pose: ABB6700Pose): void => {};

  constructor(appObject: AppObject) {
    super(appObject, SetPoseUC.type);
  }
}
