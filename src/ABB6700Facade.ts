import { Angle, AppObjectRepo } from "@vived/core";
import { aBB6700PMAdapter } from "./Domain/Adapters/aBB6700PMAdapter";
import { createABB6700 } from "./Domain/Controllers/createABB6700";
import { getPose } from "./Domain/Controllers/getPose";
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

const defaultState = (): ABB6700State => ({
  version: ABB_6700_STATE_VERSION,
  j1: 0,
  j2: 0,
  j3: 0,
  j4: 0,
  j5: 0,
  j6: 0,
});

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

  getPose(): ABB6700Pose | undefined {
    return getPose(this.id, this.appObjects);
  }

  getState(): ABB6700State {
    const pose = this.getPose();
    if (!pose) return defaultState();

    return {
      version: ABB_6700_STATE_VERSION,
      j1: pose.j1.degrees,
      j2: pose.j2.degrees,
      j3: pose.j3.degrees,
      j4: pose.j4.degrees,
      j5: pose.j5.degrees,
      j6: pose.j6.degrees,
    };
  }

  applyState(state: ABB6700State): void {
    if (state.version !== ABB_6700_STATE_VERSION) {
      this.appObjects.submitWarning(
        "ABB6700Facade.applyState",
        `Unsupported state version: ${state.version}`,
      );
      return;
    }

    this.setPose({
      j1: Angle.FromDegrees(state.j1),
      j2: Angle.FromDegrees(state.j2),
      j3: Angle.FromDegrees(state.j3),
      j4: Angle.FromDegrees(state.j4),
      j5: Angle.FromDegrees(state.j5),
      j6: Angle.FromDegrees(state.j6),
    });
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
