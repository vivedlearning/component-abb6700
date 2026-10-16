import { Angle, AppObject, AppObjectPM, AppObjectRepo } from "@vived/core";
import { ABB6700Entity } from "../Entities/ABB6700Entity";
import type { ABB6700PathPhase } from "../Entities/ABB6700Path";

/**
 * The path in progress, as a view needs it: where the path is and the current
 * segment's timing.
 */
export interface ABB6700PathVM {
  playCount: number;
  segmentIndex: number;
  phase: ABB6700PathPhase;
  /** The current segment's travel time. */
  durationMs: number;
  /** The current segment's dwell; 0 when the segment has none. */
  dwellMs: number;
  /** The stop's duration while phase is "stopping", else 0. */
  stopDurationMs: number;
}

/**
 * View Model for ABB 6700 joint angle display.
 * Immutable snapshot of 6-DOF joint state suitable for views.
 */
export interface ABB6700VM {
  j1: Angle;
  j2: Angle;
  j3: Angle;
  j4: Angle;
  j5: Angle;
  j6: Angle;
  stabilizerAngle: Angle;
  stabilizerExtension: number;
  transitionDurationMs: number;
  snapCount: number;
  /** The path in progress, or undefined when none is. */
  path: ABB6700PathVM | undefined;
}

/**
 * ABB6700PM
 *
 * Presentation Manager that observes the ABB6700Entity and
 * emits immutable view models for UI consumption. Suppresses redundant
 * updates when state hasn't changed.
 */
export abstract class ABB6700PM extends AppObjectPM<ABB6700VM> {
  static readonly type = "ABB6700PM";

  static get(appObj: AppObject): ABB6700PM | undefined {
    return appObj.getComponent<ABB6700PM>(this.type);
  }

  static getById(id: string, appObjects: AppObjectRepo): ABB6700PM | undefined {
    return appObjects.get(id)?.getComponent<ABB6700PM>(this.type);
  }
}

/**
 * Factory function to create a new ABB6700PM
 */
export function makeABB6700PM(appObject: AppObject): ABB6700PM {
  return new ABB6700PMImp(appObject);
}

class ABB6700PMImp extends ABB6700PM {
  private get entity() {
    try {
      return this.getCachedLocalComponent<ABB6700Entity>(ABB6700Entity.type);
    } catch {
      return undefined;
    }
  }

  vmsAreEqual(a: ABB6700VM, b: ABB6700VM): boolean {
    return (
      a.j1.degrees === b.j1.degrees &&
      a.j2.degrees === b.j2.degrees &&
      a.j3.degrees === b.j3.degrees &&
      a.j4.degrees === b.j4.degrees &&
      a.j5.degrees === b.j5.degrees &&
      a.j6.degrees === b.j6.degrees &&
      a.stabilizerAngle.degrees === b.stabilizerAngle.degrees &&
      a.stabilizerExtension === b.stabilizerExtension &&
      a.transitionDurationMs === b.transitionDurationMs &&
      a.snapCount === b.snapCount &&
      this.pathsAreEqual(a.path, b.path)
    );
  }

  private pathsAreEqual(
    a: ABB6700PathVM | undefined,
    b: ABB6700PathVM | undefined,
  ): boolean {
    if (a === undefined || b === undefined) return a === b;
    return (
      a.playCount === b.playCount &&
      a.segmentIndex === b.segmentIndex &&
      a.phase === b.phase &&
      a.durationMs === b.durationMs &&
      a.dwellMs === b.dwellMs &&
      a.stopDurationMs === b.stopDurationMs
    );
  }

  private buildPathVM(entity: ABB6700Entity): ABB6700PathVM | undefined {
    const path = entity.path;
    if (!path) return undefined;

    const segment = path.segments[path.segmentIndex];
    return {
      playCount: path.playCount,
      segmentIndex: path.segmentIndex,
      phase: path.phase,
      durationMs: segment.durationMs,
      dwellMs: segment.dwellMs ?? 0,
      stopDurationMs: path.stopDurationMs,
    };
  }

  onEntityChange = (): void => {
    if (!this.entity) return;

    const entity = this.entity;

    const viewModel: ABB6700VM = {
      j1: entity.j1,
      j2: entity.j2,
      j3: entity.j3,
      j4: entity.j4,
      j5: entity.j5,
      j6: entity.j6,
      stabilizerAngle: entity.stabilizerAngle,
      stabilizerExtension: entity.stabilizerExtension,
      transitionDurationMs: entity.transitionDurationMs,
      snapCount: entity.snapCount,
      path: this.buildPathVM(entity),
    };

    this.doUpdateView(viewModel);
  };

  dispose = (): void => {
    super.dispose();
    this.entity?.removeChangeObserver(this.onEntityChange);
  };

  constructor(appObject: AppObject) {
    super(appObject, ABB6700PM.type);
    this.entity?.addChangeObserver(this.onEntityChange);
    this.onEntityChange();
  }
}
