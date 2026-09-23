import { AppObject, AppObjectRepo, AppObjectUC } from "@vived/core";
import { ABB6700Entity } from "../Entities/ABB6700Entity";

/**
 * SetTransitionDurationUC
 *
 * Use case for setting the pose-transition duration, in milliseconds, on an
 * ABB 6700 instance. A negative or non-finite duration is rejected with a
 * warning and the previous duration is left untouched.
 */
export abstract class SetTransitionDurationUC extends AppObjectUC {
  static readonly type = "SetTransitionDurationUC";

  abstract setDuration(ms: number): void;

  static get(appObj: AppObject): SetTransitionDurationUC | undefined {
    return appObj.getComponent<SetTransitionDurationUC>(this.type);
  }

  static getById(
    id: string,
    appObjects: AppObjectRepo,
  ): SetTransitionDurationUC | undefined {
    return appObjects.get(id)?.getComponent<SetTransitionDurationUC>(this.type);
  }
}

export function makeSetTransitionDurationUC(
  appObject: AppObject,
): SetTransitionDurationUC {
  return new SetTransitionDurationUCImp(appObject);
}

class SetTransitionDurationUCImp extends SetTransitionDurationUC {
  private get entity(): ABB6700Entity | undefined {
    return this.getCachedLocalComponent<ABB6700Entity>(ABB6700Entity.type);
  }

  setDuration(ms: number): void {
    const entity = this.entity;
    if (!entity) {
      this.warn("Missing ABB6700Entity");
      return;
    }

    if (!Number.isFinite(ms) || ms < 0) {
      this.warn(`Rejected invalid transition duration: ${ms}`);
      return;
    }

    entity.transitionDurationMs = ms;
  }

  constructor(appObject: AppObject) {
    super(appObject, SetTransitionDurationUC.type);
  }
}
