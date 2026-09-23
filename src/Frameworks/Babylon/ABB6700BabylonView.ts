import "@babylonjs/loaders/glTF";
import { AppObject, AppObjectView, Angle } from "@vived/core";
import {
  AbstractMesh,
  Scene,
  TransformNode,
  type Node,
  type Observer,
} from "@babylonjs/core";
import { BabylonEntity } from "@vived/app";
import { ABB6700VM } from "../../Domain/PMs/ABB6700PM";
import { aBB6700PMAdapter } from "../../Domain/Adapters/aBB6700PMAdapter";
import componentConfig from "../../component.config";
import { getABB6700AssetContainer } from "./ABB6700AssetCache";
import { calcStabilizer } from "../../Domain/UCs/CalcStabilizerUC";

/** Six joint angles in radians, indexed j1..j6. */
type Pose = [number, number, number, number, number, number];

interface Transition {
  from: Pose;
  to: Pose;
  durationMs: number;
  elapsedMs: number;
}

function posesEqual(a: Pose, b: Pose): boolean {
  return a.every((v, i) => v === b[i]);
}

/** Ease-in-out: smoothstep. */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export type { ABB6700Joint } from "../../Domain/UCs/SetJointAngleUC";

export const ABB6700_WHOLE_ARM_HIGHLIGHT_GROUP = "abb_6700";

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

  /** Named Babylon nodes indexed by their resolved objectId/name */
  abstract get nodesByObjectId(): ReadonlyMap<string, Node>;

  /** Highlightable mesh groups indexed by host-facing highlight group key */
  abstract get highlightGroupsByObjectId(): ReadonlyMap<string, AbstractMesh[]>;

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
  private lastVM: ABB6700VM | undefined;
  private instantiatedEntries?: { dispose(): void };

  /** The pose currently written to the nodes, or undefined before the first render. */
  private rendered: Pose | undefined;
  private transition: Transition | undefined;
  private scene: Scene | undefined;
  private renderObserver: Observer<Scene> | null = null;

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
  private _nodesByObjectId = new Map<string, Node>();
  private _highlightGroupsByObjectId = new Map<string, AbstractMesh[]>();

  get eotTransformNode(): TransformNode | undefined {
    return this.eotNode;
  }

  get rootTransformNode(): TransformNode | undefined {
    return this._rootNode;
  }

  get shadowCasters(): AbstractMesh[] {
    return this._shadowCasters;
  }

  get nodesByObjectId(): ReadonlyMap<string, Node> {
    return this._nodesByObjectId;
  }

  get highlightGroupsByObjectId(): ReadonlyMap<string, AbstractMesh[]> {
    return this._highlightGroupsByObjectId;
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

    // A reload replaces the nodes. Drop any transition in flight and the
    // rendered pose first, so the render observer attached below never
    // advances the old transition onto disposed nodes while the new asset
    // is still loading. bindMeshes() then snaps the new nodes to lastVM.
    this.transition = undefined;
    this.rendered = undefined;

    // Dispose previous instance if load is called again
    this.instantiatedEntries?.dispose();

    // A Host remount hands the view a fresh scene each time: detach the
    // render observer from the previous scene before attaching to the new
    // one, so a stale scene never keeps ticking this view.
    this.scene?.onBeforeRenderObservable?.remove(this.renderObserver);
    this.scene = scene;
    this.renderObserver =
      scene.onBeforeRenderObservable?.add(this.onBeforeRender) ?? null;

    // Scene-scoped and deduplicated: the four arms of a cell share one GLB
    // load, and a remounted app (new scene) never receives a container from
    // the previous scene.
    const container = await getABB6700AssetContainer(
      scene,
      this.appObjects,
      asset.id,
    );

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
    this._nodesByObjectId = new Map<string, Node>();
    this._highlightGroupsByObjectId = new Map<string, AbstractMesh[]>();
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
      this._nodesByObjectId.set(nodeId, node);
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

    if (meshes.length > 0) {
      this._highlightGroupsByObjectId.set(
        ABB6700_WHOLE_ARM_HIGHLIGHT_GROUP,
        [...meshes],
      );
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

    // A rebind (remount) must snap: forget whatever pose was rendered on the
    // previous nodes and any transition in flight.
    this.rendered = undefined;
    this.transition = undefined;

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

  private writeJoints(pose: Pose): void {
    if (this.j1Node) this.j1Node.rotation.z = pose[0];
    if (this.j2Node) this.j2Node.rotation.z = pose[1];
    if (this.j3Node) this.j3Node.rotation.z = pose[2];
    if (this.j4Node) this.j4Node.rotation.z = pose[3];
    if (this.j5Node) this.j5Node.rotation.z = pose[4];
    if (this.j6Node) this.j6Node.rotation.z = pose[5];
  }

  private writeStabilizer(angleRadians: number, extension: number): void {
    if (this.stabilizerRotationNode)
      this.stabilizerRotationNode.rotation.z = angleRadians;
    if (this.stabilizerPrismaticNode)
      this.stabilizerPrismaticNode.position.z = extension;
  }

  /** Write a pose directly to the nodes with no transition. */
  private snapTo(target: Pose, vm: ABB6700VM): void {
    this.writeJoints(target);
    // Derive the stabilizer from J2 rather than trusting the VM's own values:
    // the domain notifies once for the joint and again per derived stabilizer
    // value, so the first VM carrying a new J2 can still carry the previous
    // extension. Deriving keeps the linkage consistent whatever the order.
    const stab = calcStabilizer(vm.j2);
    this.writeStabilizer(stab.angle.radians, stab.extension);
    this.rendered = target;
    this.transition = undefined;
  }

  private applyView = (vm: ABB6700VM): void => {
    this.lastVM = vm;
    const target: Pose = [
      vm.j1.radians,
      vm.j2.radians,
      vm.j3.radians,
      vm.j4.radians,
      vm.j5.radians,
      vm.j6.radians,
    ];

    // Nothing rendered yet (first VM, or a fresh bindMeshes): appear
    // directly in the commanded pose.
    if (!this.rendered) {
      this.snapTo(target, vm);
      return;
    }

    // A VM whose joints match the current goal (the in-flight target, or
    // the rendered pose if nothing is in flight) is duration-only: it must
    // not retarget or re-time a transition.
    const currentGoal = this.transition?.to ?? this.rendered;
    if (posesEqual(target, currentGoal)) {
      return;
    }

    if (vm.transitionDurationMs <= 0) {
      this.snapTo(target, vm);
      return;
    }

    // Start (or redirect) a transition from the currently rendered angles.
    // Node writes happen on the next frame, not on the command itself.
    this.transition = {
      from: this.rendered,
      to: target,
      durationMs: vm.transitionDurationMs,
      elapsedMs: 0,
    };
  };

  /** Per-frame render-loop step: advances the in-flight transition, if any. */
  private onBeforeRender = (): void => {
    const transition = this.transition;
    if (!transition) return;

    const deltaMs = this.scene?.getEngine().getDeltaTime() ?? 0;
    transition.elapsedMs += deltaMs;
    const t = Math.min(1, transition.elapsedMs / transition.durationMs);
    const eased = smoothstep(t);

    const interpolated = transition.from.map(
      (from, i) => from + (transition.to[i] - from) * eased,
    ) as Pose;
    this.writeJoints(interpolated);
    const stab = calcStabilizer(Angle.FromRadians(interpolated[1]));
    this.writeStabilizer(stab.angle.radians, stab.extension);

    if (t >= 1) {
      // Arrive exactly: write the target verbatim, no float residue.
      this.writeJoints(transition.to);
      if (this.lastVM) {
        this.writeStabilizer(
          this.lastVM.stabilizerAngle.radians,
          this.lastVM.stabilizerExtension,
        );
      }
      this.rendered = transition.to;
      this.transition = undefined;
    } else {
      this.rendered = interpolated;
    }
  };

  dispose(): void {
    this.scene?.onBeforeRenderObservable?.remove(this.renderObserver);
    this.renderObserver = null;
    this.transition = undefined;
    this.instantiatedEntries?.dispose();
    this._shadowCasters = [];
    this._nodesByObjectId = new Map<string, Node>();
    this._highlightGroupsByObjectId = new Map<string, AbstractMesh[]>();
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
