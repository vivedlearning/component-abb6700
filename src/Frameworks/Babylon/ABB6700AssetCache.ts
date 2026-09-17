import "@babylonjs/loaders/glTF";
import {
  AssetContainer,
  LoadAssetContainerAsync,
  Scene,
} from "@babylonjs/core";
import { AppObjectRepo } from "@vived/core";
import { getAssetBlobURL } from "@vived/app";

/**
 * Scene-scoped asset cache for the ABB 6700 GLB.
 *
 * Keyed by Scene (via WeakMap) and asset ID so that:
 * - Each GLB is loaded at most once per scene, no matter how many arms exist.
 * - In-flight Promises are deduplicated — concurrent callers await the same load.
 * - Failed loads are removed so they can be retried on the next call.
 * - When the scene is destroyed, cache entries are garbage-collected automatically.
 *
 * The scene key is what matters. A Host mounts the app more than once per page
 * life, and every mount is a new engine and scene while this module lives on.
 * A cache keyed by asset ID alone hands the second scene a container whose
 * meshes belong to the first, dead one: `instantiateModelsToScene` then clones
 * into that dead scene, and the arm never renders even though its transform
 * hierarchy exists (so tooling riding its EOT socket still shows).
 */
let assetContainersByScene = new WeakMap<
  Scene,
  Map<string, Promise<AssetContainer>>
>();

export async function getABB6700AssetContainer(
  scene: Scene,
  appObjects: AppObjectRepo,
  assetId: string,
): Promise<AssetContainer> {
  let byAsset = assetContainersByScene.get(scene);
  if (!byAsset) {
    byAsset = new Map<string, Promise<AssetContainer>>();
    assetContainersByScene.set(scene, byAsset);
  }

  const existing = byAsset.get(assetId);
  if (existing) return existing;

  const promise = (async () => {
    const blobURL = await getAssetBlobURL(assetId, appObjects);
    return LoadAssetContainerAsync(blobURL, scene, {
      pluginExtension: ".glb",
    });
  })();

  // Store the promise immediately so concurrent callers await the same load.
  byAsset.set(assetId, promise);

  try {
    return await promise;
  } catch (err) {
    // Remove the failed entry so callers can retry.
    byAsset.delete(assetId);
    throw err;
  }
}

/** Clear the entire cache — intended for use in tests only. */
export function clearABB6700AssetCache(): void {
  assetContainersByScene = new WeakMap();
}
