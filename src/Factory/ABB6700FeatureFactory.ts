import { AppObjectRepo, DomainFactory } from "@vived/core";
import { ABB6700Entity, makeABB6700Entity } from "../Entities/ABB6700Entity";
import {
  ABB6700EntityFactory,
  ABB6700Repo,
  makeABB6700Repo,
} from "../Entities/ABB6700Repo";
import { makeABB6700PM } from "../PMs/ABB6700PM";
import { makeABB6700RepoPM } from "../PMs/ABB6700RepoPM";

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
    this.repo.aBB6700EntityFactory = makeABB6700InstanceFactory(
      this.appObjects,
    );
  }

  setupUCs(): void {
    // No UCs for this feature yet
  }

  setupPMs(): void {
    makeABB6700RepoPM(this.appObject);
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

/**
 * Per-instance factory that creates Entity + PM for each component instance
 */
function makeABB6700InstanceFactory(
  appObjects: AppObjectRepo,
): ABB6700EntityFactory {
  return function (id: string): ABB6700Entity {
    const ao = appObjects.getOrCreate(id);
    const entity = makeABB6700Entity(ao);
    makeABB6700PM(ao);
    return entity;
  };
}
