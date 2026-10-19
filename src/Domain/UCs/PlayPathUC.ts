import { AppObject, AppObjectRepo, AppObjectUC } from "@vived/core";
import { ABB6700Entity } from "../Entities/ABB6700Entity";
import type {
  ABB6700PathPhase,
  ABB6700PathProgress,
  ABB6700PathSegment,
} from "../Entities/ABB6700Path";
import { CallbackSet } from "./CallbackSet";
import { writePose } from "./writePose";

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
  private reachedCallbacks = new CallbackSet("pathSegmentReached", (m) =>
    this.error(m),
  );
  private completedCallbacks = new CallbackSet("pathCompleted", (m) =>
    this.error(m),
  );

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

    // Record the path, then write its first pose. An observer that issues a
    // command during the writes replaces or clears the path, and the writes
    // stop there: the later command wins.
    entity.startPath(segments);
    const started = entity.path;
    writePose(entity, segments[0].pose, () => entity.path === started);
  }

  segmentReached(playCount: number, segmentIndex: number): void {
    const entity = this.entity;
    const path = this.matchingPath(entity, playCount, segmentIndex, "moving");
    if (!entity || !path) return;

    const dwelling = { ...path, phase: "dwelling" as const };
    entity.path = dwelling;
    this.reachedCallbacks.notify();

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
    return this.reachedCallbacks.subscribe(cb);
  }

  subscribeOnCompleted(cb: () => void): () => void {
    return this.completedCallbacks.subscribe(cb);
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

    for (const [i, segment] of segments.entries()) {
      // TypeScript rules these shapes out, but untyped data can carry them.
      if (typeof segment !== "object" || segment === null) {
        return `Rejected segment ${i}: not a segment`;
      }
      if (typeof segment.pose !== "object" || segment.pose === null) {
        return `Rejected segment ${i}: it has no pose`;
      }
      const { durationMs, dwellMs } = segment;
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
      this.completedCallbacks.notify();
      return;
    }

    // Write the next pose while the path still dwells, then start the segment.
    // An observer that issues a command during the writes takes the arm over:
    // stop there and leave its path, or its lack of one, in place.
    const next = path.segmentIndex + 1;
    if (!writePose(entity, path.segments[next].pose, () => entity.path === path))
      return;
    entity.path = { ...path, segmentIndex: next, phase: "moving" };
  }

  constructor(appObject: AppObject) {
    super(appObject, PlayPathUC.type);
  }
}
