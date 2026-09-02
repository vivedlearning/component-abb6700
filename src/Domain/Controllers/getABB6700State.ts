import { AppObjectRepo } from "@vived/core";
import { ABB6700Entity } from "../Entities/ABB6700Entity";
import {
  defaultABB6700State,
  type ABB6700State,
} from "../Entities/ABB6700State";

/**
 * Controller to snapshot the current ABB6700State of an ABB 6700 instance.
 *
 * Unlike `getPose`, this never returns `undefined`: a consuming app's
 * `SerializedSystem` calling it during a slide load must always get a
 * serializable object back. When the entity cannot be found, a warning is
 * submitted and `defaultABB6700State(version)` is returned instead.
 *
 * @param id - The ID of the ABB 6700 instance.
 * @param appObjects - The AppObject repository.
 * @param version - The schema version to tag the returned snapshot with.
 * @returns The six joint angles in degrees, tagged with `version`.
 */
export function getABB6700State(
  id: string,
  appObjects: AppObjectRepo,
  version: number,
): ABB6700State {
  const entity = ABB6700Entity.getById(id, appObjects);

  if (!entity) {
    appObjects.submitWarning(
      "getABB6700State",
      `Unable to find ABB6700Entity for ID: ${id}`,
    );
    return defaultABB6700State(version);
  }

  return {
    version,
    j1: entity.j1.degrees,
    j2: entity.j2.degrees,
    j3: entity.j3.degrees,
    j4: entity.j4.degrees,
    j5: entity.j5.degrees,
    j6: entity.j6.degrees,
  };
}
