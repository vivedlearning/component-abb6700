import { AppObjectRepo } from "@vived/core";
import { SetPoseUC, type ABB6700Pose } from "../UCs/SetPoseUC";

/**
 * Controller to set all joint angles on an ABB 6700 instance at once.
 *
 * @param id - The ID of the ABB 6700 instance.
 * @param pose - The pose to apply (j1 through j6 angles).
 * @param appObjects - The AppObject repository.
 */
export function setPose(
  id: string,
  pose: ABB6700Pose,
  appObjects: AppObjectRepo,
): void {
  const uc = SetPoseUC.getById(id, appObjects);

  if (!uc) {
    appObjects.submitWarning(
      "setPose",
      `Unable to find SetPoseUC for ID: ${id}`,
    );
    return;
  }

  uc.setPose(pose);
}
