import { Angle, AppObject, AppObjectRepo, AppObjectUC } from "@vived/core";
import { ABB6700Entity } from "../Entities/ABB6700Entity";

export interface ABB6700Pose {
  j1: Angle;
  j2: Angle;
  j3: Angle;
  j4: Angle;
  j5: Angle;
  j6: Angle;
}

/**
 * SetPoseUC
 *
 * Use case for setting all joint angles on an ABB 6700 instance atomically.
 */
export abstract class SetPoseUC extends AppObjectUC {
  static readonly type = "SetPoseUC";

  abstract setPose(pose: ABB6700Pose): void;

  static get(appObj: AppObject): SetPoseUC | undefined {
    return appObj.getComponent<SetPoseUC>(this.type);
  }

  static getById(id: string, appObjects: AppObjectRepo): SetPoseUC | undefined {
    return appObjects.get(id)?.getComponent<SetPoseUC>(this.type);
  }
}

export function makeSetPoseUC(appObject: AppObject): SetPoseUC {
  return new SetPoseUCImp(appObject);
}

class SetPoseUCImp extends SetPoseUC {
  private get entity(): ABB6700Entity | undefined {
    return this.getCachedLocalComponent<ABB6700Entity>(ABB6700Entity.type);
  }

  setPose(pose: ABB6700Pose): void {
    const entity = this.entity;
    if (!entity) {
      this.warn("Missing ABB6700Entity");
      return;
    }
    entity.j1 = pose.j1;
    entity.j2 = pose.j2;
    entity.j3 = pose.j3;
    entity.j4 = pose.j4;
    entity.j5 = pose.j5;
    entity.j6 = pose.j6;
  }

  constructor(appObject: AppObject) {
    super(appObject, SetPoseUC.type);
  }
}
