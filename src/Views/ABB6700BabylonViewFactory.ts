import "@babylonjs/loaders/glTF";
import {
  AbstractMesh,
  AssetContainer,
  Node,
  Scene,
  SceneLoader,
} from "@babylonjs/core";
import { getAssetBlobURL } from "@vived/app";
import { AppObject, AppObjectRepo, AppObjectView } from "@vived/core";
import { ABB6700RepoPM, ABB6700RepoVM } from "../PMs/ABB6700RepoPM";
import componentConfig from "../component.config";
import { makeABB6700BabylonView } from "./ABB6700BabylonView";

export abstract class ABB6700BabylonViewFactory extends AppObjectView {
  static readonly type = "ABB6700BabylonViewFactory";

  static get(appObj: AppObject): ABB6700BabylonViewFactory | undefined {
    return appObj.getComponent<ABB6700BabylonViewFactory>(this.type);
  }

  abstract setupView(scene: Scene): Promise<void>;
}

export function makeABB6700BabylonViewFactory(
  appObject: AppObject,
): ABB6700BabylonViewFactory {
  return new ABB6700BabylonViewFactoryImp(appObject);
}

class ABB6700BabylonViewFactoryImp extends ABB6700BabylonViewFactory {
  private pm: ABB6700RepoPM | undefined;
  private scene: Scene | undefined;
  private assetContainer: AssetContainer | undefined;
  private pendingEntityIds = new Set<string>();
  private viewMap = new Map<
    string,
    {
      view: ReturnType<typeof makeABB6700BabylonView>;
      rootNodes: Node[];
    }
  >();

  async setupView(scene: Scene): Promise<void> {
    this.scene = scene;

    try {
      this.pm = this.getCachedLocalComponent<ABB6700RepoPM>(ABB6700RepoPM.type);
    } catch {
      this.warn("Missing ABB6700RepoPM for view factory");
      return;
    }

    const defaultAsset = componentConfig.assets[0] as
      | { id: string }
      | undefined;
    if (!defaultAsset) {
      throw new Error("Missing ABB6700 asset configuration");
    }

    const blobURL = await getAssetBlobURL(defaultAsset.id, this.appObjects);
    this.assetContainer = await SceneLoader.LoadAssetContainerAsync(
      blobURL,
      "",
      scene,
      undefined,
      ".glb",
    );

    this.pm.addView(this.applyView);
  }

  private applyView = (vm: ABB6700RepoVM): void => {
    const vmIds = new Set(vm.entityIds);

    for (const id of vm.entityIds) {
      if (!this.viewMap.has(id)) {
        void this.setupEntityView(id).catch((error) => {
          this.warn(
            `Failed to setup ABB6700 view for ${id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
      }
    }

    for (const existingId of this.viewMap.keys()) {
      if (!vmIds.has(existingId)) {
        this.teardownEntityView(existingId);
      }
    }
  };

  private async setupEntityView(id: string): Promise<void> {
    if (!this.assetContainer || !this.scene) return;
    if (this.viewMap.has(id) || this.pendingEntityIds.has(id)) return;

    const appObject = this.appObjects.get(id);
    if (!appObject) {
      this.warn(`Unable to find AppObject for ABB6700 entity ${id}`);
      return;
    }

    this.pendingEntityIds.add(id);

    try {
      const view = makeABB6700BabylonView(appObject);
      await view.setupView();

      const instantiated = this.assetContainer.instantiateModelsToScene();
      const rootNodes = instantiated.rootNodes;
      const meshes = rootNodes.flatMap((rootNode) =>
        "getChildMeshes" in rootNode && typeof rootNode.getChildMeshes === "function"
          ? rootNode.getChildMeshes()
          : [],
      ) as AbstractMesh[];

      view.bindMeshes(meshes);
      this.viewMap.set(id, { view, rootNodes });
    } finally {
      this.pendingEntityIds.delete(id);
    }
  }

  private teardownEntityView(id: string): void {
    const entry = this.viewMap.get(id);
    if (!entry) return;

    for (const rootNode of entry.rootNodes) {
      rootNode.dispose();
    }

    entry.view.dispose();
    this.viewMap.delete(id);
  }

  dispose(): void {
    this.pm?.removeView(this.applyView);

    for (const id of [...this.viewMap.keys()]) {
      this.teardownEntityView(id);
    }

    this.assetContainer?.dispose();
    super.dispose();
  }

  constructor(appObject: AppObject) {
    super(appObject, ABB6700BabylonViewFactory.type);
  }
}

export async function setupABB6700Framework(
  appObjects: AppObjectRepo,
  scene: Scene,
): Promise<ABB6700BabylonViewFactory> {
  const repoAppObject = appObjects.getOrCreate("ABB6700s");
  const factory = makeABB6700BabylonViewFactory(repoAppObject);
  await factory.setupView(scene);
  return factory;
}
