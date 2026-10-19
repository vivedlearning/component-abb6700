import { AppObjectRepo } from "@vived/core";
import { PlayPathUC } from "../UCs/PlayPathUC";

/**
 * Controller to subscribe to a path completing: its last segment has been
 * reached and its dwell has ended. The callback carries no payload.
 *
 * @param id - The ID of the ABB 6700 instance.
 * @param appObjects - The AppObject repository.
 * @param cb - Called each time a path completes.
 * @returns A function that stops further calls.
 */
export function onPathCompleted(
  id: string,
  appObjects: AppObjectRepo,
  cb: () => void,
): () => void {
  const uc = PlayPathUC.getById(id, appObjects);

  if (!uc) {
    appObjects.submitWarning(
      "onPathCompleted",
      `Unable to find PlayPathUC for ID: ${id}`,
    );
    return () => {};
  }

  return uc.subscribeOnCompleted(cb);
}
