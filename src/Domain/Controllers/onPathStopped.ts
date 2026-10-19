import { AppObjectRepo } from "@vived/core";
import { StopPathUC } from "../UCs/StopPathUC";

/**
 * Controller to subscribe to a path stop: a stopped arm has come to rest and
 * its rest pose is committed. The callback carries no payload.
 *
 * @param id - The ID of the ABB 6700 instance.
 * @param appObjects - The AppObject repository.
 * @param cb - Called each time a stopped arm comes to rest.
 * @returns A function that stops further calls.
 */
export function onPathStopped(
  id: string,
  appObjects: AppObjectRepo,
  cb: () => void,
): () => void {
  const uc = StopPathUC.getById(id, appObjects);

  if (!uc) {
    appObjects.submitWarning(
      "onPathStopped",
      `Unable to find StopPathUC for ID: ${id}`,
    );
    return () => {};
  }

  return uc.subscribeOnStopped(cb);
}
