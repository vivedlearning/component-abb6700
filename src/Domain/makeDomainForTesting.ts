/**
 * makeDomainForTesting.ts
 *
 * Canonical test harness for PRD domain-integration tests.
 *
 * SMART COMPONENT: This project has no makeDomain.ts because it is a smart
 * component that is added to a host app's domain, not a standalone app. This
 * harness wires only this component's feature factory exactly as production
 * does. Act through the component's Controllers (or the facade); assert through
 * its PM Adapter. Only `appObjects` is needed — the component does not dispatch
 * requests to a Host.
 *
 * See docs/agents/prd-spec-tests.md for the standard beforeEach pattern.
 */

import {
  AppObjectRepo,
  makeAppObjectRepo,
  makeDomainFactoryRepo,
} from "@vived/core";
import { makeABB6700FeatureFactory } from "./Factory/ABB6700FeatureFactory";

export interface DomainForTesting {
  appObjects: AppObjectRepo;
}

export function makeDomainForTesting(): DomainForTesting {
  const appObjects = makeAppObjectRepo();
  const factoryRepo = makeDomainFactoryRepo(appObjects);
  makeABB6700FeatureFactory(appObjects);
  factoryRepo.setupDomain();
  return { appObjects };
}
