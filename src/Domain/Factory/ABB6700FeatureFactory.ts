import { AppObjectRepo, DomainFactory } from "@vived/core";
import { ABB6700Repo, makeABB6700Repo } from "../Entities/ABB6700Repo";
import { setupABB6700InstanceFactory } from "./setupABB6700InstanceFactory";

/**
 * ABB6700FeatureFactory
 *
 * Orchestrates creation and wiring of the ABB 6700 feature.
 * Follows the four-phase setup pattern:
 * 1. setupEntities — Create singleton repository
 * 2. setupUCs — Create singleton use cases (if any)
 * 3. setupPMs — Create singleton PMs (if any)
 * 4. finalSetup — Cross-component wiring
 *
 * Per-instance PMs are created on-demand via the entity factory.
 */
export class ABB6700FeatureFactory extends DomainFactory {
  factoryName = "ABB6700FeatureFactory";

  private repo: ABB6700Repo | null = null;

  setupEntities(): void {
    this.repo = makeABB6700Repo(this.appObject);
    setupABB6700InstanceFactory(this.appObjects);
  }

  setupUCs(): void {
    // Per-instance UCs are created on-demand by the entity factory
  }

  setupPMs(): void {
    // Per-instance PMs are created on-demand by the entity factory
  }

  finalSetup(): void {
    // Cross-component wiring if needed
  }
}

/**
 * Creates and registers the ABB6700FeatureFactory
 */
export function makeABB6700FeatureFactory(
  appObjects: AppObjectRepo,
): ABB6700FeatureFactory {
  const appObject = appObjects.getOrCreate("ABB6700s");
  return new ABB6700FeatureFactory(appObject);
}
