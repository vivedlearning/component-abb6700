/**
 * ABB 6700 — VIVED Smart Component
 *
 * Public API: re-exports all component layers for consumer use.
 */

// Entities
export { ABB6700Entity, makeABB6700Entity } from "./Entities/ABB6700Entity";
export {
  ABB6700Repo,
  makeABB6700Repo,
  type ABB6700EntityFactory,
} from "./Entities/ABB6700Repo";

// Presentation Managers
export { ABB6700PM, makeABB6700PM, type ABB6700VM } from "./PMs/ABB6700PM";

// Adapters
export { aBB6700PMAdapter } from "./Adapters/aBB6700PMAdapter";

// Views
export {
  ABB6700BabylonView,
  makeABB6700BabylonView,
} from "./Views/ABB6700BabylonView";

// Factory
export {
  ABB6700FeatureFactory,
  makeABB6700FeatureFactory,
} from "./Factory/ABB6700FeatureFactory";

// Mocks (for consumer testing)
export { MockABB6700PM } from "./Mocks/MockABB6700PM";

// Config
export { default as componentConfig } from "./component.config";
