import { AppObjectRepo } from "@vived/core";
import {
  SetPoseUC,
  type ABB6700Pose,
  type ABB6700TransitionOption,
} from "../UCs/SetPoseUC";

/**
 * Controller to set all joint angles on an ABB 6700 instance at once.
 *
 * @param id - The ID of the ABB 6700 instance.
 * @param pose - The pose to apply (j1 through j6 angles).
 * @param appObjects - The AppObject repository.
 * @param options - Optional per-command rendering option (e.g. `{ transition: "none" }`).
 */
export function setPose(
  id: string,
  pose: ABB6700Pose,
  appObjects: AppObjectRepo,
  options?: ABB6700TransitionOption,
): void {
  const uc = SetPoseUC.getById(id, appObjects);

  if (!uc) {
    appObjects.submitWarning(
      "setPose",
      `Unable to find SetPoseUC for ID: ${id}`,
    );
    return;
  }

  if (options) {
    uc.setPose(pose, options);
  } else {
    uc.setPose(pose);
  }
}
