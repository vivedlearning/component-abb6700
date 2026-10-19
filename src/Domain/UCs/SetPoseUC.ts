import { AppObject, AppObjectRepo, AppObjectUC } from "@vived/core";
import { ABB6700Entity } from "../Entities/ABB6700Entity";
import type { ABB6700Pose } from "../Entities/ABB6700Pose";

// The pose type lives with the entities; re-exported so existing imports hold.
export type { ABB6700Pose } from "../Entities/ABB6700Pose";

/**
 * Per-command rendering option for setPose, setJointAngle and applyState.
 * Only the exact value "none" snaps; undefined, "transition", a missing object,
 * or any other value transitions.
 */
export type ABB6700TransitionOption = {
  transition?: "none" | "transition";
};

/**
 * SetPoseUC
 *
 * Use case for setting all joint angles on an ABB 6700 instance atomically.
 */
export abstract class SetPoseUC extends AppObjectUC {
  static readonly type = "SetPoseUC";

  abstract setPose(pose: ABB6700Pose, options?: ABB6700TransitionOption): void;

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

  setPose(pose: ABB6700Pose, options?: ABB6700TransitionOption): void {
    const entity = this.entity;
    if (!entity) {
      this.warn("Missing ABB6700Entity");
      return;
    }
    // A pose command cancels a path in progress, silently. Cancel first, so
    // no VM pairs the path with the commanded joints.
    entity.path = undefined;
    entity.j1 = pose.j1;
    entity.j2 = pose.j2;
    entity.j3 = pose.j3;
    entity.j4 = pose.j4;
    entity.j5 = pose.j5;
    entity.j6 = pose.j6;

    if (options?.transition === "none") {
      entity.requestSnap();
    }
  }

  constructor(appObject: AppObject) {
    super(appObject, SetPoseUC.type);
  }
}
