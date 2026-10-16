import { AppObjectRepo } from "@vived/core";
import { PlayPathUC } from "../UCs/PlayPathUC";

/**
 * Package-internal. The view's report seam (ADR-0007): the Babylon view calls
 * this when the rendered arm arrives at a segment's pose. Not exported from
 * the package.
 *
 * @param id - The ID of the ABB 6700 instance.
 * @param appObjects - The AppObject repository.
 * @param playCount - The play count of the path the view was playing.
 * @param segmentIndex - The index of the segment reached.
 */
export function reportPathSegmentReached(
  id: string,
  appObjects: AppObjectRepo,
  playCount: number,
  segmentIndex: number,
): void {
  const uc = PlayPathUC.getById(id, appObjects);

  if (!uc) {
    appObjects.submitWarning(
      "reportPathSegmentReached",
      `Unable to find PlayPathUC for ID: ${id}`,
    );
    return;
  }

  uc.segmentReached(playCount, segmentIndex);
}
