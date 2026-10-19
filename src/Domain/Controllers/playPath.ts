import { AppObjectRepo } from "@vived/core";
import type { ABB6700PathSegment } from "../Entities/ABB6700Path";
import { PlayPathUC } from "../UCs/PlayPathUC";

/**
 * Controller to play a path on an ABB 6700 instance: an ordered list of
 * segments, each a pose, a travel time and an optional dwell. A malformed
 * list is rejected whole with a warning.
 *
 * @param id - The ID of the ABB 6700 instance.
 * @param segments - The segments to play, in order.
 * @param appObjects - The AppObject repository.
 */
export function playPath(
  id: string,
  segments: readonly ABB6700PathSegment[],
  appObjects: AppObjectRepo,
): void {
  const uc = PlayPathUC.getById(id, appObjects);

  if (!uc) {
    appObjects.submitWarning(
      "playPath",
      `Unable to find PlayPathUC for ID: ${id}`,
    );
    return;
  }

  uc.playPath(segments);
}
