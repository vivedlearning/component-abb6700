import { Angle, AppObjectRepo } from "@vived/core";
import { aBB6700PMAdapter } from "./Domain/Adapters/aBB6700PMAdapter";
import { applyABB6700State } from "./Domain/Controllers/applyABB6700State";
import { createABB6700 } from "./Domain/Controllers/createABB6700";
import { getABB6700State } from "./Domain/Controllers/getABB6700State";
import { setJointAngle } from "./Domain/Controllers/setJointAngle";
import { setPose } from "./Domain/Controllers/setPose";
import { ABB6700Entity } from "./Domain/Entities/ABB6700Entity";
import type { ABB6700VM } from "./Domain/PMs/ABB6700PM";
import type { ABB6700Joint } from "./Domain/UCs/SetJointAngleUC";
import type { ABB6700Pose } from "./Domain/UCs/SetPoseUC";
import { ABB6700Repo } from "./Domain/Entities/ABB6700Repo";
import type { SmartComponent } from "./SmartComponent";
import {
  ABB_6700_STATE_VERSION,
  type ABB6700State,
  type ABB6700Events,
} from "./Domain/Entities/ABB6700State";

export {
  ABB_6700_STATE_VERSION,
  type ABB6700State,
  type ABB6700Events,
} from "./Domain/Entities/ABB6700State";

export class ABB6700Facade implements SmartComponent {
  readonly interfaceVersion = 1;

  constructor(
    readonly id: string,
    private readonly appObjects: AppObjectRepo,
  ) {
    this.ensureAppObject();
  }

  async load(variant?: string): Promise<void> {
    void variant;

    const appObject = this.ensureAppObject();
    if (!appObject) return;

    // Dynamically import the Babylon view so the facade module carries no
    // Babylon dependency until load() is called. This keeps construction (and
    // module import) fully headless — see ADR-0002 (two-phase lifecycle).
    const { ABB6700BabylonView, makeABB6700BabylonView } = await import(
      "./Frameworks/Babylon/ABB6700BabylonView"
    );

    const existingView = ABB6700BabylonView.get(appObject);
    if (existingView) {
      await existingView.load();
      return;
    }

    await makeABB6700BabylonView(appObject);
  }

  destroy(): void {
    ABB6700Repo.get(this.appObjects)?.deleteABB6700Entity(this.id);
  }

  setPose(pose: ABB6700Pose): void {
    setPose(this.id, pose, this.appObjects);
  }

  setJointAngle(joint: ABB6700Joint, angle: Angle): void {
    setJointAngle(this.id, joint, angle, this.appObjects);
  }

  getState(): ABB6700State {
    return getABB6700State(this.id, this.appObjects, ABB_6700_STATE_VERSION);
  }

  applyState(state: ABB6700State): void {
    applyABB6700State(this.id, this.appObjects, state);
  }

  onEvent(event: string, cb: (...args: never[]) => void): () => void;
  onEvent<K extends keyof ABB6700Events>(event: K, cb: ABB6700Events[K]): () => void;
  onEvent(event: string, cb: (...args: never[]) => void): () => void {
    void event;
    void cb;
    return () => {};
  }

  onViewModel(cb: (vm: ABB6700VM) => void): () => void {
    aBB6700PMAdapter.subscribe(this.id, this.appObjects, cb);
    return () => {
      aBB6700PMAdapter.unsubscribe(this.id, this.appObjects, cb);
    };
  }

  private ensureAppObject() {
    if (!ABB6700Entity.getById(this.id, this.appObjects)) {
      return createABB6700(this.id, this.appObjects);
    }

    return this.appObjects.get(this.id);
  }
}
