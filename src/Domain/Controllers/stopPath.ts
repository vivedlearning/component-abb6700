import { AppObjectRepo } from "@vived/core";
import type { ABB6700StopPathOptions } from "../Entities/ABB6700Path";
import { StopPathUC } from "../UCs/StopPathUC";

/**
 * Controller to stop the path in flight on an ABB 6700 instance. With no path
 * in progress it does nothing.
 *
 * @param id - The ID of the ABB 6700 instance.
 * @param appObjects - The AppObject repository.
 * @param options - Optional stop options (e.g. `{ durationMs: 300 }`); the stop takes the default duration when omitted.
 */
export function stopPath(
  id: string,
  appObjects: AppObjectRepo,
  options?: ABB6700StopPathOptions,
): void {
  const uc = StopPathUC.getById(id, appObjects);

  if (!uc) {
    appObjects.submitWarning(
      "stopPath",
      `Unable to find StopPathUC for ID: ${id}`,
    );
    return;
  }

  if (options) {
    uc.stopPath(options);
  } else {
    uc.stopPath();
  }
}
