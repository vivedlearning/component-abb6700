import { Angle, AppObjectRepo } from "@vived/core";
import { SetJointAngleUC, type ABB6700Joint } from "../UCs/SetJointAngleUC";

/**
 * Controller to set the angle of a specific joint on an ABB 6700 instance.
 *
 * @param id - The ID of the ABB 6700 instance.
 * @param joint - Which joint to set ("j1" through "j6").
 * @param angle - The new angle value.
 * @param appObjects - The AppObject repository.
 */
export function setJointAngle(
  id: string,
  joint: ABB6700Joint,
  angle: Angle,
  appObjects: AppObjectRepo,
): void {
  const uc = SetJointAngleUC.getById(id, appObjects);

  if (!uc) {
    appObjects.submitWarning(
      "setJointAngle",
      `Unable to find SetJointAngleUC for ID: ${id}`,
    );
    return;
  }

  uc.setAngle(joint, angle);
}
