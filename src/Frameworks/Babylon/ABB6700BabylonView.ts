import "@babylonjs/loaders/glTF";
import { AppObject, AppObjectView } from "@vived/core";
import {
  AbstractMesh,
  AssetContainer,
  LoadAssetContainerAsync,
  Scene,
  TransformNode,
} from "@babylonjs/core";
import { BabylonEntity, getAssetBlobURL } from "@vived/app";
import { ABB6700VM } from "../../Domain/PMs/ABB6700PM";
import { aBB6700PMAdapter } from "../../Domain/Adapters/aBB6700PMAdapter";
import componentConfig from "../../component.config";

export type { ABB6700Joint } from "../../Domain/UCs/SetJointAngleUC";

type MeshMetadata = {
  gltf?: {
    extras?: {
      objectId?: string;
    };
  };
};

/**
 * ABB6700BabylonView
 *
 * Babylon.js view for the ABB 6700. Subscribes to the PM via the adapter
 * automatically in the constructor. The view resolves its own scene and
 * assets when load() is called, requiring no external scene parameter.
 */
export abstract class ABB6700BabylonView extends AppObjectView {
  static readonly type = "ABB6700BabylonView";

  /** Load the robot GLB asset, bind its meshes to this view, and subscribe to updates */
  abstract load(): Promise<void>;

  /** Bind loaded meshes and transform nodes to this view for rendering */
  protected abstract bindMeshes(
    meshes: AbstractMesh[],
    transformNodes?: TransformNode[],
  ): void;

  /** The End-of-Arm Tooling transform node (available after load) */
  abstract get eotTransformNode(): TransformNode | undefined;

  /** The root transform node of the robot (available after load) */
  abstract get rootTransformNode(): TransformNode | undefined;

  /** All meshes in this robot instance, for use as shadow casters */
  abstract get shadowCasters(): AbstractMesh[];

  static get(appObj: AppObject): ABB6700BabylonView | undefined {
    return appObj.getComponent<ABB6700BabylonView>(this.type);
  }
}

/**
 * Factory function to create and fully load an ABB6700BabylonView
 */
export async function makeABB6700BabylonView(
  appObject: AppObject,
): Promise<ABB6700BabylonView> {
  const view = new ABB6700BabylonViewImp(appObject);
  await view.load();
  return view;
}

class ABB6700BabylonViewImp extends ABB6700BabylonView {
  private static containerCache = new Map<string, AssetContainer>();

  private lastVM: ABB6700VM | undefined;
  private instantiatedEntries?: { dispose(): void };

  private j1Node: TransformNode | undefined;
  private j2Node: TransformNode | undefined;
  private j3Node: TransformNode | undefined;
  private j4Node: TransformNode | undefined;
  private j5Node: TransformNode | undefined;
  private j6Node: TransformNode | undefined;
  private stabilizerRotationNode: TransformNode | undefined;
  private stabilizerPrismaticNode: TransformNode | undefined;
  private eotNode: TransformNode | undefined;
  private _rootNode: TransformNode | undefined;
  private _shadowCasters: AbstractMesh[] = [];

  get eotTransformNode(): TransformNode | undefined {
    return this.eotNode;
  }

  get rootTransformNode(): TransformNode | undefined {
    return this._rootNode;
  }

  get shadowCasters(): AbstractMesh[] {
    return this._shadowCasters;
  }

  async load(): Promise<void> {
    const babylonEntity = BabylonEntity.get(this.appObjects);
    if (!babylonEntity?.scene) {
      this.error("BabylonEntity not found or scene not set");
      return;
    }

    const scene = babylonEntity.scene as Scene;

    const asset = componentConfig.assets[0];
    if (!asset) {
      throw new Error(
        "ABB6700BabylonView: no assets configured in componentConfig",
      );
    }

    // Dispose previous instance if load is called again
    this.instantiatedEntries?.dispose();

    let container = ABB6700BabylonViewImp.containerCache.get(asset.id);
    if (!container) {
      const blobURL = await getAssetBlobURL(asset.id, this.appObjects);
      container = await LoadAssetContainerAsync(blobURL, scene, {
        pluginExtension: ".glb",
      });
      ABB6700BabylonViewImp.containerCache.set(asset.id, container);
    }

    const entries = container.instantiateModelsToScene((name) => name);
    this.instantiatedEntries = entries;

    // Capture the root transform node
    const firstRoot = entries.rootNodes[0];
    this._rootNode = firstRoot instanceof TransformNode ? firstRoot : undefined;

    const allDescendants: TransformNode[] = [];
    for (const root of entries.rootNodes) {
      if (root instanceof TransformNode) {
        allDescendants.push(root);
      }
      for (const desc of root.getDescendants(false)) {
        if (desc instanceof TransformNode) {
          allDescendants.push(desc);
        }
      }
    }

    const meshes = allDescendants.filter(
      (n): n is AbstractMesh => n instanceof AbstractMesh,
    );
    const transformNodes = allDescendants.filter(
      (n) => !(n instanceof AbstractMesh),
    );

    this.bindMeshes(meshes, transformNodes);
  }

  protected bindMeshes(
    meshes: AbstractMesh[],
    transformNodes: TransformNode[] = [],
  ): void {
    this._shadowCasters = meshes;
    this.j1Node = undefined;
    this.j2Node = undefined;
    this.j3Node = undefined;
    this.j4Node = undefined;
    this.j5Node = undefined;
    this.j6Node = undefined;
    this.stabilizerRotationNode = undefined;
    this.stabilizerPrismaticNode = undefined;
    this.eotNode = undefined;

    const allNodes: TransformNode[] = [...meshes, ...transformNodes];

    for (const node of allNodes) {
      const nodeId = this.resolveNodeId(node);
      switch (nodeId) {
        case "joint_1":
          this.j1Node = node;
          break;
        case "joint_2":
          this.j2Node = node;
          break;
        case "joint_3":
          this.j3Node = node;
          break;
        case "joint_4":
          this.j4Node = node;
          break;
        case "joint_5":
          this.j5Node = node;
          break;
        case "joint_6":
          this.j6Node = node;
          break;
        case "stabilizer_joint_1":
          this.stabilizerRotationNode = node;
          break;
        case "stabilizer_joint_2":
          this.stabilizerPrismaticNode = node;
          break;
        case "eot":
          this.eotNode = node;
          break;
      }
    }

    // GLB/GLTF imports set rotationQuaternion on nodes, which causes
    // .rotation (Euler angles) to be ignored. Null it out so applyView works.
    const jointNodes = [
      this.j1Node,
      this.j2Node,
      this.j3Node,
      this.j4Node,
      this.j5Node,
      this.j6Node,
      this.stabilizerRotationNode,
    ];
    for (const node of jointNodes) {
      if (node && node.rotationQuaternion) {
        node.rotationQuaternion = null;
      }
    }

    // Apply current state to the newly bound meshes
    if (this.lastVM) {
      this.applyView(this.lastVM);
    }
  }

  private resolveNodeId(node: TransformNode): string {
    const metadata = node.metadata as MeshMetadata | undefined;
    const objectId = metadata?.gltf?.extras?.objectId;
    if (typeof objectId === "string") {
      return objectId.toLowerCase();
    }
    return node.name.toLowerCase();
  }

  private applyView = (vm: ABB6700VM): void => {
    this.lastVM = vm;
    if (this.j1Node) this.j1Node.rotation.z = vm.j1.radians;
    if (this.j2Node) this.j2Node.rotation.z = vm.j2.radians;
    if (this.j3Node) this.j3Node.rotation.z = vm.j3.radians;
    if (this.j4Node) this.j4Node.rotation.z = vm.j4.radians;
    if (this.j5Node) this.j5Node.rotation.z = vm.j5.radians;
    if (this.j6Node) this.j6Node.rotation.z = vm.j6.radians;
    if (this.stabilizerRotationNode)
      this.stabilizerRotationNode.rotation.z = vm.stabilizerAngle.radians;
    if (this.stabilizerPrismaticNode)
      this.stabilizerPrismaticNode.position.z = vm.stabilizerExtension;
  };

  dispose(): void {
    this.instantiatedEntries?.dispose();
    aBB6700PMAdapter.unsubscribe(
      this.appObject.id,
      this.appObjects,
      this.applyView,
    );
    super.dispose();
  }

  constructor(appObject: AppObject) {
    super(appObject, ABB6700BabylonView.type);
    aBB6700PMAdapter.subscribe(
      this.appObject.id,
      this.appObjects,
      this.applyView,
    );
  }
}
