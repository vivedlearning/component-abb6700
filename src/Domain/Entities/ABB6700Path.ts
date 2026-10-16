import type { ABB6700Pose } from "../UCs/SetPoseUC";

/** One step of a path: a pose, the travel time to it, an optional dwell at it. */
export interface ABB6700PathSegment {
  pose: ABB6700Pose;
  durationMs: number;
  dwellMs?: number;
}

export type ABB6700PathPhase = "moving" | "dwelling" | "stopping";

/** Options for stopPath. */
export type ABB6700StopPathOptions = { durationMs?: number };

/** The default time a path stop takes to bring the arm to rest. */
export const ABB_6700_DEFAULT_STOP_DURATION_MS = 400;

/** The entity's record of the path in progress. Immutable; replaced on every change. */
export interface ABB6700PathProgress {
  /** Which playPath this is; increments per playPath. */
  readonly playCount: number;
  /** A copy taken at playPath. */
  readonly segments: readonly ABB6700PathSegment[];
  readonly segmentIndex: number;
  readonly phase: ABB6700PathPhase;
  /** 0 unless phase === "stopping". */
  readonly stopDurationMs: number;
}
