import { Angle, AppObject } from "@vived/core";
import { ABB6700Joint, SetJointAngleUC } from "../UCs/SetJointAngleUC";

export class MockSetJointAngleUC extends SetJointAngleUC {
  setAngle = (_joint: ABB6700Joint, _angle: Angle): void => {};

  constructor(appObject: AppObject) {
    super(appObject, SetJointAngleUC.type);
  }
}
