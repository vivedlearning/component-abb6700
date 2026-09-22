import { Angle, AppObject, AppObjectUC } from "@vived/core";
import { ABB6700Entity } from "../Entities/ABB6700Entity";

// Stabilizer geometry constants
// Fixed anchor relative to J1; moving anchor relative to J2 (in link2 local frame)
const FIXED_ANCHOR = { x: -0.2812, y: 0.3602 };
const J1_TO_J2 = { x: 0.2792, y: 0.442 };
const MOVING_ANCHOR = { x: -0.1821, y: -0.0284 };

// Rest state (j2 = 0): moving anchor in J1 frame = J1_TO_J2 + MOVING_ANCHOR
const REST_DX = J1_TO_J2.x + MOVING_ANCHOR.x - FIXED_ANCHOR.x;
const REST_DY = J1_TO_J2.y + MOVING_ANCHOR.y - FIXED_ANCHOR.y;
const REST_ANGLE = Math.atan2(REST_DY, REST_DX);
const REST_LENGTH = Math.sqrt(REST_DX * REST_DX + REST_DY * REST_DY);

const ANGLE_OFFSET = 8.0326 * (Math.PI / 180);

/**
 * Pure stabilizer-linkage math: given J2, returns the stabilizer's rotation
 * angle and prismatic extension. Extracted so the view can derive the
 * stabilizer from an interpolated J2 during a pose transition, using the
 * exact same math the domain uses.
 */
export function calcStabilizer(j2: Angle): { angle: Angle; extension: number } {
  const currentJ2 = j2.radians;
  const cosT = Math.cos(currentJ2);
  const sinT = Math.sin(currentJ2);
  const rotX = MOVING_ANCHOR.x * cosT - MOVING_ANCHOR.y * sinT;
  const rotY = MOVING_ANCHOR.x * sinT + MOVING_ANCHOR.y * cosT;
  const dx = J1_TO_J2.x + rotX - FIXED_ANCHOR.x;
  const dy = J1_TO_J2.y + rotY - FIXED_ANCHOR.y;

  return {
    angle: Angle.FromRadians(Math.atan2(dy, dx) - REST_ANGLE + ANGLE_OFFSET),
    extension: REST_LENGTH - Math.sqrt(dx * dx + dy * dy),
  };
}

export abstract class CalcStabilizerUC extends AppObjectUC {
  static readonly type = "CalcStabilizerUC";

  static get(appObj: AppObject): CalcStabilizerUC | undefined {
    return appObj.getComponent<CalcStabilizerUC>(this.type);
  }
}

export function makeCalcStabilizerUC(appObject: AppObject): CalcStabilizerUC {
  return new CalcStabilizerUCImp(appObject);
}

class CalcStabilizerUCImp extends CalcStabilizerUC {
  private get entity(): ABB6700Entity | undefined {
    return this.getCachedLocalComponent<ABB6700Entity>(ABB6700Entity.type);
  }

  private lastJ2Radians: number | undefined = undefined;

  private onEntityChange = (): void => {
    const entity = this.entity;
    if (!entity) return;

    const currentJ2 = entity.j2.radians;
    if (currentJ2 === this.lastJ2Radians) return;
    this.lastJ2Radians = currentJ2;

    const result = calcStabilizer(entity.j2);
    entity.stabilizerAngle = result.angle;
    entity.stabilizerExtension = result.extension;
  };

  dispose = (): void => {
    this.entity?.removeChangeObserver(this.onEntityChange);
    super.dispose();
  };

  constructor(appObject: AppObject) {
    super(appObject, CalcStabilizerUC.type);
    this.entity?.addChangeObserver(this.onEntityChange);
    this.onEntityChange();
  }
}
