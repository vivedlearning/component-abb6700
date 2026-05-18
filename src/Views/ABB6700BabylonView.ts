import { AppObject, AppObjectView } from "@vived/core";
import { AbstractMesh } from "@babylonjs/core";
import { ABB6700PM, ABB6700VM } from "../PMs/ABB6700PM";

/**
 * ABB6700BabylonView
 *
 * Babylon.js view for the ABB 6700. Subscribes to the PM
 * and updates the 3D representation when the view model changes.
 *
 * Replace the implementation with your actual Babylon.js rendering logic.
 */
export abstract class ABB6700BabylonView extends AppObjectView {
  static readonly type = "ABB6700BabylonView";

  /** Set up the view by subscribing to the PM */
  abstract setupView(): Promise<void>;

  /** Bind loaded meshes to this view for rendering */
  abstract bindMeshes(meshes: AbstractMesh[]): void;

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

  async setupView(): Promise<void> {
    this.pm = this.getCachedLocalComponent<ABB6700PM>(ABB6700PM.type);

    if (!this.pm) {
      this.warn("Missing ABB6700PM for view");
      return;
    }

    this.pm.addView(this.applyView);
  }

  bindMeshes(meshes: AbstractMesh[]): void {
    // TODO: Resolve and store mesh references for each joint
    // Example: find meshes by gltf.extras.meshId or name for J1–J6
  }

  private applyView = (vm: ABB6700VM): void => {
    // TODO: Update Babylon.js joint rotations based on vm
    // Example:
    // this.j1Mesh.rotation.y = vm.j1.radians;
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
