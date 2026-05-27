import { AppObject } from "@vived/core";
import { ABB6700Pose, SetPoseUC } from "../UCs/SetPoseUC";

export class MockSetPoseUC extends SetPoseUC {
  setPose = (pose: ABB6700Pose): void => {
    void pose;
  };

  constructor(appObject: AppObject) {
    super(appObject, SetPoseUC.type);
  }
}
