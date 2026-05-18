import { AppObject, AppObjectRepo } from "@vived/core";
import { GetAssetBlobURLUC } from "@vived/app";
import componentConfig from "../src/component.config";

/**
 * Dev-only implementation of GetAssetBlobURLUC.
 * Serves assets from the local /public directory via fetch().
 */
class DevGetAssetBlobURLUCImp extends GetAssetBlobURLUC {
  doDispatch = (assetID: string): Promise<string> => {
    const asset = componentConfig.assets.find((a) => a.id === assetID);

    if (!asset) {
      return Promise.reject(
        new Error(
          `Asset "${assetID}" not found in component config. Available: ${componentConfig.assets.map((a) => a.id).join(", ")}`,
        ),
      );
    }

    return fetch(`/${asset.file}`)
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(
            `Failed to fetch asset "${asset.file}": ${resp.status} ${resp.statusText}`,
          );
        }
        return resp.blob();
      })
      .then((blob) => URL.createObjectURL(blob));
  };

  constructor(appObject: AppObject) {
    super(appObject, GetAssetBlobURLUC.type);
  }
}

export function makeDevGetAssetBlobURLUC(
  appObjects: AppObjectRepo,
): GetAssetBlobURLUC {
  return new DevGetAssetBlobURLUCImp(
    appObjects.getOrCreate("DevGetAssetBlobURLUC"),
  );
}
