import { Angle, AppObject, AppObjectRepo, AppObjectUC } from "@vived/core";
import { ABB6700Entity } from "../Entities/ABB6700Entity";

export type ABB6700Joint = "j1" | "j2" | "j3" | "j4" | "j5" | "j6";

/**
 * SetJointAngleUC
 *
 * Use case for setting the angle of a specific joint on an ABB 6700 instance.
 */
export abstract class SetJointAngleUC extends AppObjectUC {
  static readonly type = "SetJointAngleUC";

  abstract setAngle(joint: ABB6700Joint, angle: Angle): void;

  static get(appObj: AppObject): SetJointAngleUC | undefined {
    return appObj.getComponent<SetJointAngleUC>(this.type);
  }

  static getById(
    id: string,
    appObjects: AppObjectRepo,
  ): SetJointAngleUC | undefined {
    return appObjects.get(id)?.getComponent<SetJointAngleUC>(this.type);
  }
}

export function makeSetJointAngleUC(appObject: AppObject): SetJointAngleUC {
  return new SetJointAngleUCImp(appObject);
}

class SetJointAngleUCImp extends SetJointAngleUC {
  private get entity(): ABB6700Entity | undefined {
    return this.getCachedLocalComponent<ABB6700Entity>(ABB6700Entity.type);
  }

  setAngle(joint: ABB6700Joint, angle: Angle): void {
    const entity = this.entity;
    if (!entity) {
      this.warn("Missing ABB6700Entity");
      return;
    }
    entity[joint] = angle;
  }

  constructor(appObject: AppObject) {
    super(appObject, SetJointAngleUC.type);
  }
}
