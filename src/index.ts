/**
 * ABB 6700 — VIVED Smart Component
 *
 * Public API: re-exports all component layers for consumer use.
 */

// Entities
export {
  ABB6700Entity,
  makeABB6700Entity,
} from "./Domain/Entities/ABB6700Entity";
export {
  ABB6700Repo,
  makeABB6700Repo,
  type ABB6700EntityFactory,
} from "./Domain/Entities/ABB6700Repo";

// Presentation Managers
export {
  ABB6700PM,
  makeABB6700PM,
  type ABB6700VM,
} from "./Domain/PMs/ABB6700PM";

// Adapters
export { aBB6700PMAdapter } from "./Domain/Adapters/aBB6700PMAdapter";

// Facade
export {
  ABB6700Facade,
  ABB_6700_STATE_VERSION,
  type ABB6700Events,
  type ABB6700State,
} from "./ABB6700Facade";
export type { SmartComponent } from "./SmartComponent";

// Views
export {
  ABB6700_WHOLE_ARM_HIGHLIGHT_GROUP,
  ABB6700BabylonView,
  makeABB6700BabylonView,
} from "./Frameworks/Babylon/ABB6700BabylonView";

// Framework bridge (recommended consumer entry point for Babylon integration)
export { createBabylonABB6700 } from "./Frameworks/Babylon/createBabylonABB6700";

// Factory
export {
  ABB6700FeatureFactory,
  makeABB6700FeatureFactory,
} from "./Domain/Factory/ABB6700FeatureFactory";
export { setupABB6700InstanceFactory } from "./Domain/Factory/setupABB6700InstanceFactory";

// Use Cases
export {
  SetJointAngleUC,
  makeSetJointAngleUC,
  type ABB6700Joint,
} from "./Domain/UCs/SetJointAngleUC";
export {
  SetPoseUC,
  makeSetPoseUC,
  type ABB6700Pose,
} from "./Domain/UCs/SetPoseUC";

// Controllers
export { createABB6700 } from "./Domain/Controllers/createABB6700";
export { setJointAngle } from "./Domain/Controllers/setJointAngle";
export { setPose } from "./Domain/Controllers/setPose";
export { getPose } from "./Domain/Controllers/getPose";

// Mocks (for consumer testing)
export { MockABB6700PM } from "./Domain/Mocks/MockABB6700PM";
export { MockSetJointAngleUC } from "./Domain/Mocks/MockSetJointAngleUC";
export { MockSetPoseUC } from "./Domain/Mocks/MockSetPoseUC";

// Config
export { default as componentConfig } from "./component.config";
