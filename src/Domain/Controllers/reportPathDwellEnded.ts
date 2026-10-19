import { AppObjectRepo } from "@vived/core";
import { PlayPathUC } from "../UCs/PlayPathUC";

/**
 * Package-internal. The view's report seam (ADR-0007): the Babylon view calls
 * this when a segment's dwell has run its time. Not exported from the package.
 *
 * @param id - The ID of the ABB 6700 instance.
 * @param appObjects - The AppObject repository.
 * @param playCount - The play count of the path the view was playing.
 * @param segmentIndex - The index of the segment whose dwell ended.
 */
export function reportPathDwellEnded(
  id: string,
  appObjects: AppObjectRepo,
  playCount: number,
  segmentIndex: number,
): void {
  const uc = PlayPathUC.getById(id, appObjects);

  if (!uc) {
    appObjects.submitWarning(
      "reportPathDwellEnded",
      `Unable to find PlayPathUC for ID: ${id}`,
    );
    return;
  }

  uc.dwellEnded(playCount, segmentIndex);
}
