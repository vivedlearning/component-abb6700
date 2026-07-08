import {
  Angle,
  AppObject,
  AppObjectEntity,
  AppObjectRepo,
  MemoizedAngle,
} from "@vived/core";

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
    Angle.FromDegrees(0),
    this.notifyOnChange,
  );
  private memoizedJ2 = new MemoizedAngle(
    Angle.FromDegrees(0),
    this.notifyOnChange,
  );
  private memoizedJ3 = new MemoizedAngle(
    Angle.FromDegrees(0),
    this.notifyOnChange,
  );
  private memoizedJ4 = new MemoizedAngle(
    Angle.FromDegrees(0),
    this.notifyOnChange,
  );
  private memoizedJ5 = new MemoizedAngle(
    Angle.FromDegrees(0),
    this.notifyOnChange,
  );
  private memoizedJ6 = new MemoizedAngle(
    Angle.FromDegrees(0),
    this.notifyOnChange,
  );
  private memoizedStabilizerAngle = new MemoizedAngle(
    Angle.FromDegrees(0),
    this.notifyOnChange,
  );
  private _stabilizerExtension = 0;

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

  constructor(appObject: AppObject) {
    super(appObject, ABB6700Entity.type);
  }
}
