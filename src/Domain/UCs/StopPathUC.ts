import { AppObject, AppObjectRepo, AppObjectUC } from "@vived/core";
import { ABB6700Entity } from "../Entities/ABB6700Entity";
import {
  ABB_6700_DEFAULT_STOP_DURATION_MS,
  type ABB6700StopPathOptions,
} from "../Entities/ABB6700Path";
import type { ABB6700Pose } from "./SetPoseUC";

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
  private stoppedCallbacks = new Set<() => void>();

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

    entity.j1 = pose.j1;
    entity.j2 = pose.j2;
    entity.j3 = pose.j3;
    entity.j4 = pose.j4;
    entity.j5 = pose.j5;
    entity.j6 = pose.j6;
    entity.path = undefined;

    // Notifies a copy, so a callback may unsubscribe while being notified.
    [...this.stoppedCallbacks].forEach((cb) => cb());
  }

  subscribeOnStopped(cb: () => void): () => void {
    this.stoppedCallbacks.add(cb);
    return () => {
      this.stoppedCallbacks.delete(cb);
    };
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
