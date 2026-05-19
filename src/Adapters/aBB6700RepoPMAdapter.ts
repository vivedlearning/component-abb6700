import { AppObjectRepo, type PmAdapter } from "@vived/core";
import { ABB6700RepoPM, type ABB6700RepoVM } from "../PMs/ABB6700RepoPM";

export const aBB6700RepoPMAdapter: PmAdapter<ABB6700RepoVM> = {
  defaultVM: {
    entityIds: [],
  },

  subscribe: (
    id: string,
    appObjects: AppObjectRepo,
    setVM: (vm: ABB6700RepoVM) => void,
  ) => {
    if (!id) return;

    const pm = ABB6700RepoPM.getById(id, appObjects);
    if (!pm) {
      appObjects.submitWarning(
        "aBB6700RepoPMAdapter",
        "Unable to find ABB6700RepoPM",
      );
      return;
    }

    pm.addView(setVM);
  },

  unsubscribe: (
    id: string,
    appObjects: AppObjectRepo,
    setVM: (vm: ABB6700RepoVM) => void,
  ) => {
    if (!id) return;

    const pm = ABB6700RepoPM.getById(id, appObjects);
    if (!pm) return;

    pm.removeView(setVM);
  },
};
