import { AppObject, AppObjectRepo } from "@vived/core";
import { ABB6700Repo } from "../../Domain/Entities/ABB6700Repo";
import { makeABB6700BabylonView } from "./ABB6700BabylonView";

/**
 * Framework-layer entry point for creating a fully wired ABB6700 instance
 * with Babylon.js view.
 *
 * This function bridges the domain layer (pure entity/PM/UC creation) with
 * the Babylon view layer. It ensures the domain factory remains pure and
 * framework-agnostic, while the Babylon composition happens here.
 *
 * The returned AppObject has both the domain stack (entity, PMs, UCs) and
 * the Babylon view, fully loaded and ready for rendering.
 *
 * @param id - The ID for the new instance
 * @param appObjects - The AppObject repository
 * @returns The created AppObject with Babylon view loaded, or undefined if the repo is not found
 */
export async function createBabylonABB6700(
  id: string,
  appObjects: AppObjectRepo,
): Promise<AppObject | undefined> {
  const repo = ABB6700Repo.get(appObjects);
  if (!repo) {
    appObjects.submitWarning("createBabylonABB6700", "ABB6700Repo not found");
    return undefined;
  }

  // Create the domain instance
  const entity = repo.createABB6700Entity(id);

  // Create and load the Babylon view
  await makeABB6700BabylonView(entity.appObject);

  return entity.appObject;
}
