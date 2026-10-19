import { AppObjectRepo } from "@vived/core";
import { PlayPathUC } from "../UCs/PlayPathUC";

/**
 * Controller to subscribe to the arm reaching a segment's pose on a path.
 * The callback carries no payload: read the segment index from the view
 * model's `path`.
 *
 * @param id - The ID of the ABB 6700 instance.
 * @param appObjects - The AppObject repository.
 * @param cb - Called each time the arm reaches a segment's pose.
 * @returns A function that stops further calls.
 */
export function onPathSegmentReached(
  id: string,
  appObjects: AppObjectRepo,
  cb: () => void,
): () => void {
  const uc = PlayPathUC.getById(id, appObjects);

  if (!uc) {
    appObjects.submitWarning(
      "onPathSegmentReached",
      `Unable to find PlayPathUC for ID: ${id}`,
    );
    return () => {};
  }

  return uc.subscribeOnSegmentReached(cb);
}
