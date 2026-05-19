import { AppObjectRepo } from "@vived/core";
import { ABB6700Entity } from "../Entities/ABB6700Entity";
import { type ABB6700Pose } from "../UCs/SetPoseUC";

/**
 * Controller to get the current pose of an ABB 6700 instance.
 *
 * @param id - The ID of the ABB 6700 instance.
 * @param appObjects - The AppObject repository.
 * @returns The current pose, or undefined if the instance is not found.
 */
export function getPose(
  id: string,
  appObjects: AppObjectRepo,
): ABB6700Pose | undefined {
  const entity = ABB6700Entity.getById(id, appObjects);

  if (!entity) {
    appObjects.submitWarning(
      "getPose",
      `Unable to find ABB6700Entity for ID: ${id}`,
    );
    return undefined;
  }

  return {
    j1: entity.j1,
    j2: entity.j2,
    j3: entity.j3,
    j4: entity.j4,
    j5: entity.j5,
    j6: entity.j6,
  };
}
