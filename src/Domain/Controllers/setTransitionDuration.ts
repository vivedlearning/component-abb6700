import { AppObjectRepo } from "@vived/core";
import { SetTransitionDurationUC } from "../UCs/SetTransitionDurationUC";

/**
 * Controller to set the pose-transition duration, in milliseconds, on an
 * ABB 6700 instance.
 *
 * @param id - The ID of the ABB 6700 instance.
 * @param ms - The transition duration in milliseconds.
 * @param appObjects - The AppObject repository.
 */
export function setTransitionDuration(
  id: string,
  ms: number,
  appObjects: AppObjectRepo,
): void {
  const uc = SetTransitionDurationUC.getById(id, appObjects);

  if (!uc) {
    appObjects.submitWarning(
      "setTransitionDuration",
      `Unable to find SetTransitionDurationUC for ID: ${id}`,
    );
    return;
  }

  uc.setDuration(ms);
}
