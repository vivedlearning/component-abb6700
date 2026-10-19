import {
  Angle,
  AppObject,
  AppObjectEntity,
  AppObjectRepo,
  MemoizedAngle,
} from "@vived/core";
import { ABB_6700_DEFAULT_JOINT_DEGREES } from "./ABB6700State";
import type { ABB6700PathProgress, ABB6700PathSegment } from "./ABB6700Path";

/** The default pose-transition duration, in milliseconds, for a new instance. */
export const ABB_6700_DEFAULT_TRANSITION_DURATION_MS = 1000;

/**
 * ABB 6700 Entity
 *
 * Domain entity representing a 6-DOF robot arm with rotational joints J1–J6.
 * Each joint angle is stored as a MemoizedAngle with a default of 0 degrees.
 * Multiple instances can exist in a scene, each with independent state.
 */
export abstract class ABB6700Entity extends AppObjectEntity {
  static readonly type = "ABB6700Entity";

  abstract get j1(): Angle;
  abstract set j1(val: Angle);

  abstract get j2(): Angle;
  abstract set j2(val: Angle);

  abstract get j3(): Angle;
  abstract set j3(val: Angle);

  abstract get j4(): Angle;
  abstract set j4(val: Angle);

  abstract get j5(): Angle;
  abstract set j5(val: Angle);

  abstract get j6(): Angle;
  abstract set j6(val: Angle);

  abstract get stabilizerAngle(): Angle;
  abstract set stabilizerAngle(val: Angle);

  abstract get stabilizerExtension(): number;
  abstract set stabilizerExtension(val: number);

  /** The duration, in milliseconds, a commanded pose transitions over. */
  abstract get transitionDurationMs(): number;
  abstract set transitionDurationMs(val: number);

  /** Monotonically increasing count of snap requests. Never resets. */
  abstract get snapCount(): number;

  /** Increments snapCount and notifies observers, even if nothing else changed. */
  abstract requestSnap(): void;

  /** The path in progress, or undefined. Replaced on every change, never mutated. */
  abstract get path(): ABB6700PathProgress | undefined;
  abstract set path(val: ABB6700PathProgress | undefined);

  /**
   * Increments the play count, then records a new path at its first segment,
   * moving. Does not write the joints. Returns the path it recorded, which an
   * observer notified by the recording may already have replaced or cleared.
   */
  abstract startPath(
    segments: readonly ABB6700PathSegment[],
  ): ABB6700PathProgress;

  static get(appObj: AppObject): ABB6700Entity | undefined {
    return appObj.getComponent<ABB6700Entity>(this.type);
  }

  static getById(
    id: string,
    appObjects: AppObjectRepo,
  ): ABB6700Entity | undefined {
    return appObjects.get(id)?.getComponent<ABB6700Entity>(this.type);
  }

  static addIfMissing(appObj: AppObject): ABB6700Entity {
    const existing = appObj.getComponent<ABB6700Entity>(this.type);
    if (existing) {
      return existing;
    } else {
      return makeABB6700Entity(appObj);
    }
  }
}

/**
 * Factory function to create a new ABB6700Entity
 */
export function makeABB6700Entity(appObject: AppObject): ABB6700Entity {
  return new ABB6700EntityImp(appObject);
}

class ABB6700EntityImp extends ABB6700Entity {
  private memoizedJ1 = new MemoizedAngle(
    Angle.FromDegrees(ABB_6700_DEFAULT_JOINT_DEGREES),
    this.notifyOnChange,
  );
  private memoizedJ2 = new MemoizedAngle(
    Angle.FromDegrees(ABB_6700_DEFAULT_JOINT_DEGREES),
    this.notifyOnChange,
  );
  private memoizedJ3 = new MemoizedAngle(
    Angle.FromDegrees(ABB_6700_DEFAULT_JOINT_DEGREES),
    this.notifyOnChange,
  );
  private memoizedJ4 = new MemoizedAngle(
    Angle.FromDegrees(ABB_6700_DEFAULT_JOINT_DEGREES),
    this.notifyOnChange,
  );
  private memoizedJ5 = new MemoizedAngle(
    Angle.FromDegrees(ABB_6700_DEFAULT_JOINT_DEGREES),
    this.notifyOnChange,
  );
  private memoizedJ6 = new MemoizedAngle(
    Angle.FromDegrees(ABB_6700_DEFAULT_JOINT_DEGREES),
    this.notifyOnChange,
  );
  private memoizedStabilizerAngle = new MemoizedAngle(
    Angle.FromDegrees(0),
    this.notifyOnChange,
  );
  private _stabilizerExtension = 0;
  private _transitionDurationMs = ABB_6700_DEFAULT_TRANSITION_DURATION_MS;
  private _snapCount = 0;
  private _path: ABB6700PathProgress | undefined;
  private _playCount = 0;

  get j1() {
    return this.memoizedJ1.val;
  }
  set j1(val: Angle) {
    this.memoizedJ1.val = val;
  }

  get j2() {
    return this.memoizedJ2.val;
  }
  set j2(val: Angle) {
    this.memoizedJ2.val = val;
  }

  get j3() {
    return this.memoizedJ3.val;
  }
  set j3(val: Angle) {
    this.memoizedJ3.val = val;
  }

  get j4() {
    return this.memoizedJ4.val;
  }
  set j4(val: Angle) {
    this.memoizedJ4.val = val;
  }

  get j5() {
    return this.memoizedJ5.val;
  }
  set j5(val: Angle) {
    this.memoizedJ5.val = val;
  }

  get j6() {
    return this.memoizedJ6.val;
  }
  set j6(val: Angle) {
    this.memoizedJ6.val = val;
  }

  get stabilizerAngle(): Angle {
    return this.memoizedStabilizerAngle.val;
  }
  set stabilizerAngle(val: Angle) {
    this.memoizedStabilizerAngle.val = val;
  }

  get stabilizerExtension(): number {
    return this._stabilizerExtension;
  }
  set stabilizerExtension(val: number) {
    if (this._stabilizerExtension === val) return;
    this._stabilizerExtension = val;
    this.notifyOnChange();
  }

  get transitionDurationMs(): number {
    return this._transitionDurationMs;
  }
  set transitionDurationMs(val: number) {
    if (this._transitionDurationMs === val) return;
    this._transitionDurationMs = val;
    this.notifyOnChange();
  }

  get snapCount(): number {
    return this._snapCount;
  }

  requestSnap(): void {
    this._snapCount++;
    this.notifyOnChange();
  }

  get path(): ABB6700PathProgress | undefined {
    return this._path;
  }
  set path(val: ABB6700PathProgress | undefined) {
    if (this._path === val) return;
    this._path = val;
    this.notifyOnChange();
  }

  startPath(segments: readonly ABB6700PathSegment[]): ABB6700PathProgress {
    this._playCount++;
    const started: ABB6700PathProgress = {
      playCount: this._playCount,
      // A copy down to each pose, so the caller's later edits never reach the
      // path in progress (or skip its validation).
      segments: segments.map((segment) => ({
        ...segment,
        pose: { ...segment.pose },
      })),
      segmentIndex: 0,
      phase: "moving",
      stopDurationMs: 0,
    };
    this.path = started;
    return started;
  }

  constructor(appObject: AppObject) {
    super(appObject, ABB6700Entity.type);
  }
}
