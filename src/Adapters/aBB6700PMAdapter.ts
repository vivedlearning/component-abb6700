import { Angle, AppObjectRepo, type PmAdapter } from "@vived/core";
import { ABB6700PM, type ABB6700VM } from "../PMs/ABB6700PM";

/**
 * PM Adapter for ABB 6700
 *
 * Connects UI views to the ABB6700PM. Use this adapter in
 * React components or Babylon views to subscribe to VM updates.
 */
export const aBB6700PMAdapter: PmAdapter<ABB6700VM> = {
  defaultVM: {
    j1: Angle.FromDegrees(0),
    j2: Angle.FromDegrees(0),
    j3: Angle.FromDegrees(0),
    j4: Angle.FromDegrees(0),
    j5: Angle.FromDegrees(0),
    j6: Angle.FromDegrees(0),
  },

  subscribe: (
    id: string,
    appObjects: AppObjectRepo,
    setVM: (vm: ABB6700VM) => void,
  ) => {
    if (!id) return;

    const pm = ABB6700PM.getById(id, appObjects);
    if (!pm) {
      appObjects.submitWarning("aBB6700PMAdapter", "Unable to find ABB6700PM");
      return;
    }

    pm.addView(setVM);
  },

  unsubscribe: (
    id: string,
    appObjects: AppObjectRepo,
    setVM: (vm: ABB6700VM) => void,
  ) => {
    if (!id) return;

    const pm = ABB6700PM.getById(id, appObjects);
    if (!pm) return;

    pm.removeView(setVM);
  },
};
