import { AppObject, AppObjectRepo, AppObjectUC } from "@vived/core";
import { ABB6700Entity } from "../Entities/ABB6700Entity";
import type {
  ABB6700PathPhase,
  ABB6700PathProgress,
  ABB6700PathSegment,
} from "../Entities/ABB6700Path";
import type { ABB6700Pose } from "./SetPoseUC";

/**
 * PlayPathUC
 *
 * Use case that plays a path on an ABB 6700 instance: it owns the path's
 * progression and announces progress through two payload-free callback sets.
 * The Babylon view is the path's clock (ADR-0007) and drives the progression
 * through segmentReached and dwellEnded.
 */
export abstract class PlayPathUC extends AppObjectUC {
  static readonly type = "PlayPathUC";

  abstract playPath(segments: readonly ABB6700PathSegment[]): void;
  abstract segmentReached(playCount: number, segmentIndex: number): void;
  abstract dwellEnded(playCount: number, segmentIndex: number): void;
  abstract subscribeOnSegmentReached(cb: () => void): () => void;
  abstract subscribeOnCompleted(cb: () => void): () => void;

  static get(appObj: AppObject): PlayPathUC | undefined {
    return appObj.getComponent<PlayPathUC>(this.type);
  }

  static getById(
    id: string,
    appObjects: AppObjectRepo,
  ): PlayPathUC | undefined {
    return appObjects.get(id)?.getComponent<PlayPathUC>(this.type);
  }
}

export function makePlayPathUC(appObject: AppObject): PlayPathUC {
  return new PlayPathUCImp(appObject);
}

class PlayPathUCImp extends PlayPathUC {
  private reachedCallbacks = new Set<() => void>();
  private completedCallbacks = new Set<() => void>();

  private get entity(): ABB6700Entity | undefined {
    return this.getCachedLocalComponent<ABB6700Entity>(ABB6700Entity.type);
  }

  playPath(segments: readonly ABB6700PathSegment[]): void {
    const entity = this.entity;
    if (!entity) {
      this.warn("Missing ABB6700Entity");
      return;
    }

    const problem = this.findProblem(segments);
    if (problem) {
      this.warn(problem);
      return;
    }

    // Joints first, so the VM that carries the new phase already carries the
    // whole segment pose.
    this.writePose(entity, segments[0].pose);
    entity.startPath(segments);
  }

  segmentReached(playCount: number, segmentIndex: number): void {
    const entity = this.entity;
    const path = this.matchingPath(entity, playCount, segmentIndex, "moving");
    if (!entity || !path) return;

    const dwelling = { ...path, phase: "dwelling" as const };
    entity.path = dwelling;
    this.notify(this.reachedCallbacks);

    // A callback may have replaced, cancelled or stopped the path.
    if (entity.path === dwelling && !path.segments[segmentIndex].dwellMs) {
      this.advance(entity, dwelling);
    }
  }

  dwellEnded(playCount: number, segmentIndex: number): void {
    const entity = this.entity;
    const path = this.matchingPath(entity, playCount, segmentIndex, "dwelling");
    if (!entity || !path) return;

    this.advance(entity, path);
  }

  subscribeOnSegmentReached(cb: () => void): () => void {
    this.reachedCallbacks.add(cb);
    return () => {
      this.reachedCallbacks.delete(cb);
    };
  }

  subscribeOnCompleted(cb: () => void): () => void {
    this.completedCallbacks.add(cb);
    return () => {
      this.completedCallbacks.delete(cb);
    };
  }

  // The path in progress, if it is the report's path, segment and phase.
  // A report for a path that was replaced, cancelled or stopped matches none.
  private matchingPath(
    entity: ABB6700Entity | undefined,
    playCount: number,
    segmentIndex: number,
    phase: ABB6700PathPhase,
  ): ABB6700PathProgress | undefined {
    const path = entity?.path;
    if (
      path?.playCount === playCount &&
      path.segmentIndex === segmentIndex &&
      path.phase === phase
    ) {
      return path;
    }
    return undefined;
  }

  // Describes why a segment list is malformed, or returns undefined if it is not.
  private findProblem(
    segments: readonly ABB6700PathSegment[],
  ): string | undefined {
    if (!Array.isArray(segments) || segments.length === 0) {
      return "Rejected an empty path";
    }

    for (const [i, { durationMs, dwellMs }] of segments.entries()) {
      if (!Number.isFinite(durationMs) || durationMs < 0) {
        return `Rejected invalid travel time in segment ${i}: ${durationMs}`;
      }
      if (dwellMs !== undefined && (!Number.isFinite(dwellMs) || dwellMs < 0)) {
        return `Rejected invalid dwell in segment ${i}: ${dwellMs}`;
      }
    }
    return undefined;
  }

  // Starts the next segment, or completes the path after its last segment.
  private advance(entity: ABB6700Entity, path: ABB6700PathProgress): void {
    if (path.segmentIndex === path.segments.length - 1) {
      entity.path = undefined;
      this.notify(this.completedCallbacks);
      return;
    }

    const next = path.segmentIndex + 1;
    this.writePose(entity, path.segments[next].pose);
    entity.path = { ...path, segmentIndex: next, phase: "moving" };
  }

  // Notifies a copy, so a callback may unsubscribe while being notified.
  private notify(callbacks: Set<() => void>): void {
    [...callbacks].forEach((cb) => cb());
  }

  private writePose(entity: ABB6700Entity, pose: ABB6700Pose): void {
    entity.j1 = pose.j1;
    entity.j2 = pose.j2;
    entity.j3 = pose.j3;
    entity.j4 = pose.j4;
    entity.j5 = pose.j5;
    entity.j6 = pose.j6;
  }

  constructor(appObject: AppObject) {
    super(appObject, PlayPathUC.type);
  }
}
