import { Angle, AppObjectRepo } from "@vived/core";
import { SetPoseUC } from "../UCs/SetPoseUC";
import {
  ABB_6700_DEFAULT_JOINT_DEGREES,
  type ABB6700State,
} from "../Entities/ABB6700State";

/**
 * Controller to restore a saved ABB6700State snapshot onto an ABB 6700
 * instance.
 *
 * Best-effort forward-compatible (ADR-0005): the snapshot is always applied
 * regardless of its `version` — there is no version gate. Each of the six
 * joints is resolved independently at runtime; a joint that is not a finite
 * number (absent, `undefined`, `null`, `NaN`, a string — as could arrive from
 * a snapshot persisted by another schema version) falls back to
 * `ABB_6700_DEFAULT_JOINT_DEGREES` rather than producing an invalid angle.
 * The assembled pose is applied via a single `SetPoseUC.setPose` call so the
 * atomic-pose semantics are preserved.
 *
 * @param id - The ID of the ABB 6700 instance.
 * @param appObjects - The AppObject repository.
 * @param state - The snapshot to restore.
 */
export function applyABB6700State(
  id: string,
  appObjects: AppObjectRepo,
  state: ABB6700State,
): void {
  const uc = SetPoseUC.getById(id, appObjects);

  if (!uc) {
    appObjects.submitWarning(
      "applyABB6700State",
      `Unable to find SetPoseUC for ID: ${id}`,
    );
    return;
  }

  const deg = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v)
      ? v
      : ABB_6700_DEFAULT_JOINT_DEGREES;

  uc.setPose({
    j1: Angle.FromDegrees(deg(state.j1)),
    j2: Angle.FromDegrees(deg(state.j2)),
    j3: Angle.FromDegrees(deg(state.j3)),
    j4: Angle.FromDegrees(deg(state.j4)),
    j5: Angle.FromDegrees(deg(state.j5)),
    j6: Angle.FromDegrees(deg(state.j6)),
  });
}
