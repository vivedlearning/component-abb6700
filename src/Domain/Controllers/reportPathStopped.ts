import { AppObjectRepo } from "@vived/core";
import { StopPathUC } from "../UCs/StopPathUC";
import type { ABB6700Pose } from "../UCs/SetPoseUC";

/**
 * Package-internal. The view's report seam (ADR-0007): the Babylon view calls
 * this when a stopping arm has come to rest, with the pose it rests at. Not
 * exported from the package.
 *
 * @param id - The ID of the ABB 6700 instance.
 * @param appObjects - The AppObject repository.
 * @param playCount - The play count of the path the view was stopping.
 * @param pose - The pose the arm rests at.
 */
export function reportPathStopped(
  id: string,
  appObjects: AppObjectRepo,
  playCount: number,
  pose: ABB6700Pose,
): void {
  const uc = StopPathUC.getById(id, appObjects);

  if (!uc) {
    appObjects.submitWarning(
      "reportPathStopped",
      `Unable to find StopPathUC for ID: ${id}`,
    );
    return;
  }

  uc.restedAt(playCount, pose);
}
