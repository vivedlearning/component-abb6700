import { AppObjectRepo } from "@vived/core";
import { ABB6700Repo } from "../Entities/ABB6700Repo";

/**
 * Controller to create a new ABB 6700 instance.
 * Resolves the singleton ABB6700Repo and delegates to its
 * createABB6700Entity method.
 *
 * @param id - The ID for the new instance.
 * @param appObjects - The AppObject repository.
 * @returns The created AppObject, or undefined if the repo is not found.
 */
export function createABB6700(id: string, appObjects: AppObjectRepo) {
  const repo = ABB6700Repo.get(appObjects);

  if (!repo) {
    appObjects.submitWarning("createABB6700", "Unable to find ABB6700Repo");
    return undefined;
  }

  const entity = repo.createABB6700Entity(id);
  return entity.appObject;
}
