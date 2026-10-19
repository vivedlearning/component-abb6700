import { AppObject, AppObjectRepo, AppObjectUC } from "@vived/core";
import { ABB6700Entity } from "../Entities/ABB6700Entity";
import {
  ABB_6700_DEFAULT_STOP_DURATION_MS,
  type ABB6700StopPathOptions,
} from "../Entities/ABB6700Path";
import type { ABB6700Pose } from "../Entities/ABB6700Pose";
import { CallbackSet } from "./CallbackSet";
import { writePose } from "./writePose";

/**
 * StopPathUC
 *
 * Use case that stops a path in flight on an ABB 6700 instance. A stop request
 * puts the path in its stopping phase; the Babylon view slows the rendered arm
 * to rest and reports the pose it rests at (ADR-0007), which this use case
 * commits before it announces the stop through a payload-free callback set.
 */
export abstract class StopPathUC extends AppObjectUC {
  static readonly type = "StopPathUC";

  abstract stopPath(options?: ABB6700StopPathOptions): void;
  abstract restedAt(playCount: number, pose: ABB6700Pose): void;
  abstract subscribeOnStopped(cb: () => void): () => void;

  static get(appObj: AppObject): StopPathUC | undefined {
    return appObj.getComponent<StopPathUC>(this.type);
  }

  static getById(
    id: string,
    appObjects: AppObjectRepo,
  ): StopPathUC | undefined {
    return appObjects.get(id)?.getComponent<StopPathUC>(this.type);
  }
}

export function makeStopPathUC(appObject: AppObject): StopPathUC {
  return new StopPathUCImp(appObject);
}

class StopPathUCImp extends StopPathUC {
  private stoppedCallbacks = new CallbackSet("pathStopped", (m) =>
    this.error(m),
  );

  private get entity(): ABB6700Entity | undefined {
    return this.getCachedLocalComponent<ABB6700Entity>(ABB6700Entity.type);
  }

  stopPath(options?: ABB6700StopPathOptions): void {
    const entity = this.entity;
    if (!entity) {
      this.warn("Missing ABB6700Entity");
      return;
    }

    const path = entity.path;
    if (!path || path.phase === "stopping") return;

    entity.path = {
      ...path,
      phase: "stopping",
      stopDurationMs: this.resolveDuration(options),
    };
  }

  restedAt(playCount: number, pose: ABB6700Pose): void {
    const entity = this.entity;
    const path = entity?.path;
    // A report for a path that was replaced, cancelled or already stopped matches none.
    if (!entity || path?.playCount !== playCount || path.phase !== "stopping") {
      return;
    }

    // Commit the rest pose while the path is still stopping. An observer that
    // issues a command during the writes takes the arm over: stop there, and
    // announce no stop, as for a pose command during a stop.
    if (!writePose(entity, pose, () => entity.path === path)) return;
    entity.path = undefined;
    this.stoppedCallbacks.notify();
  }

  subscribeOnStopped(cb: () => void): () => void {
    return this.stoppedCallbacks.subscribe(cb);
  }

  // The requested stop duration. An invalid one is replaced by the default.
  private resolveDuration(options?: ABB6700StopPathOptions): number {
    const requested = options?.durationMs;
    if (requested === undefined) return ABB_6700_DEFAULT_STOP_DURATION_MS;
    if (Number.isFinite(requested) && requested >= 0) return requested;

    this.warn(
      `Replaced invalid stop duration ${requested} with the default ${ABB_6700_DEFAULT_STOP_DURATION_MS}`,
    );
    return ABB_6700_DEFAULT_STOP_DURATION_MS;
  }

  constructor(appObject: AppObject) {
    super(appObject, StopPathUC.type);
  }
}
