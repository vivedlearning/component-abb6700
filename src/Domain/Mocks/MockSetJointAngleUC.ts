import { Angle, AppObject } from "@vived/core";
import { ABB6700Joint, SetJointAngleUC } from "../UCs/SetJointAngleUC";

export class MockSetJointAngleUC extends SetJointAngleUC {
  setAngle = (joint: ABB6700Joint, angle: Angle): void => {
    void joint;
    void angle;
  };

  constructor(appObject: AppObject) {
    super(appObject, SetJointAngleUC.type);
  }
}
