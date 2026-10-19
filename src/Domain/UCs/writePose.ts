import type { ABB6700Entity } from "../Entities/ABB6700Entity";
import type { ABB6700Pose } from "../Entities/ABB6700Pose";

const JOINTS = ["j1", "j2", "j3", "j4", "j5", "j6"] as const;

/**
 * Write a pose to the entity's six joints, j1 first. Every write notifies the
 * entity's observers, and an observer may issue a command of its own. Pass
 * `stillCurrent` to stop as soon as one has: after each write it is asked
 * whether this write still owns the arm, and on false the remaining joints are
 * left alone and the function returns false.
 */
export function writePose(
  entity: ABB6700Entity,
  pose: ABB6700Pose,
  stillCurrent: () => boolean = () => true,
): boolean {
  for (const joint of JOINTS) {
    entity[joint] = pose[joint];
    if (!stillCurrent()) return false;
  }
  return true;
}
