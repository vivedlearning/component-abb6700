import { AppObject, AppObjectView } from "@vived/core";
import { AbstractMesh, TransformNode } from "@babylonjs/core";
import { ABB6700PM, ABB6700VM } from "../PMs/ABB6700PM";

export type { ABB6700Joint } from "../UCs/SetJointAngleUC";

type MeshMetadata = {
  gltf?: {
    extras?: {
      meshId?: string;
    };
  };
};

/**
 * ABB6700BabylonView
 *
 * Babylon.js view for the ABB 6700. Subscribes to the PM
 * and updates the 3D representation when the view model changes.
 */
export abstract class ABB6700BabylonView extends AppObjectView {
  static readonly type = "ABB6700BabylonView";

  /** Set up the view by subscribing to the PM */
  abstract setupView(): Promise<void>;

  /** Bind loaded meshes and transform nodes to this view for rendering */
  abstract bindMeshes(
    meshes: AbstractMesh[],
    transformNodes?: TransformNode[],
  ): void;

  static get(appObj: AppObject): ABB6700BabylonView | undefined {
    return appObj.getComponent<ABB6700BabylonView>(this.type);
  }
}

/**
 * Factory function to create a ABB6700BabylonView
 */
export function makeABB6700BabylonView(
  appObject: AppObject,
): ABB6700BabylonView {
  return new ABB6700BabylonViewImp(appObject);
}

class ABB6700BabylonViewImp extends ABB6700BabylonView {
  private pm: ABB6700PM | undefined;

  private j1Node: TransformNode | undefined;
  private j2Node: TransformNode | undefined;
  private j3Node: TransformNode | undefined;
  private j4Node: TransformNode | undefined;
  private j5Node: TransformNode | undefined;
  private j6Node: TransformNode | undefined;
  private stabilizerRotationNode: TransformNode | undefined;
  private stabilizerPrismaticNode: TransformNode | undefined;
  private stabilizerPrismaticRestZ = 0;

  async setupView(): Promise<void> {
    this.pm = this.getCachedLocalComponent<ABB6700PM>(ABB6700PM.type);

    if (!this.pm) {
      this.warn("Missing ABB6700PM for view");
      return;
    }

    this.pm.addView(this.applyView);
  }

  bindMeshes(
    meshes: AbstractMesh[],
    transformNodes: TransformNode[] = [],
  ): void {
    this.j1Node = undefined;
    this.j2Node = undefined;
    this.j3Node = undefined;
    this.j4Node = undefined;
    this.j5Node = undefined;
    this.j6Node = undefined;
    this.stabilizerRotationNode = undefined;
    this.stabilizerPrismaticNode = undefined;

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

    // Capture the prismatic joint's rest position
    if (this.stabilizerPrismaticNode) {
      this.stabilizerPrismaticRestZ = this.stabilizerPrismaticNode.position.z;
    }

    // Apply current state to the newly bound meshes
    if (this.pm?.lastVM) {
      this.applyView(this.pm.lastVM);
    }
  }

  private resolveNodeId(node: TransformNode): string {
    const metadata = node.metadata as MeshMetadata | undefined;
    const meshId = metadata?.gltf?.extras?.meshId;
    if (typeof meshId === "string") {
      return meshId.toLowerCase();
    }
    return node.name.toLowerCase();
  }

  private applyView = (vm: ABB6700VM): void => {
    if (this.j1Node) this.j1Node.rotation.z = vm.j1.radians;
    if (this.j2Node) this.j2Node.rotation.z = vm.j2.radians;
    if (this.j3Node) this.j3Node.rotation.z = vm.j3.radians;
    if (this.j4Node) this.j4Node.rotation.z = vm.j4.radians;
    if (this.j5Node) this.j5Node.rotation.z = vm.j5.radians;
    if (this.j6Node) this.j6Node.rotation.z = vm.j6.radians;
    if (this.stabilizerRotationNode)
      this.stabilizerRotationNode.rotation.z = vm.stabilizerAngle.radians;
    if (this.stabilizerPrismaticNode)
      this.stabilizerPrismaticNode.position.z =
        this.stabilizerPrismaticRestZ + vm.stabilizerExtension;
  };

  dispose(): void {
    if (this.pm) {
      this.pm.removeView(this.applyView);
    }
    super.dispose();
  }

  constructor(appObject: AppObject) {
    super(appObject, ABB6700BabylonView.type);
  }
}
