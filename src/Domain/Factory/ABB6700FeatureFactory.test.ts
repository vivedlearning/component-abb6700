import { describe, it, expect, beforeEach } from "vitest";
import { AppObjectRepo, makeAppObjectRepo } from "@vived/core";
import { ABB6700Repo } from "../Entities/ABB6700Repo";
import {
  ABB6700FeatureFactory,
  makeABB6700FeatureFactory,
} from "./ABB6700FeatureFactory";

describe("ABB6700FeatureFactory", () => {
  let appObjects: AppObjectRepo;

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
  });

  it("creates a factory instance", () => {
    const factory = makeABB6700FeatureFactory(appObjects);
    expect(factory).toBeInstanceOf(ABB6700FeatureFactory);
  });

  it("sets up the repository during setupEntities", () => {
    const factory = makeABB6700FeatureFactory(appObjects);
    factory.setupEntities();

    const repo = ABB6700Repo.get(appObjects);
    expect(repo).toBeDefined();
  });

  it("creates instances with full component stack via repo", () => {
    const factory = makeABB6700FeatureFactory(appObjects);
    factory.setupEntities();
    factory.setupUCs();
    factory.setupPMs();
    factory.finalSetup();

    const repo = ABB6700Repo.get(appObjects)!;
    const entity = repo.createABB6700Entity("test-instance");

    // Entity exists
    expect(entity).toBeDefined();

    // PM was created
    const pm = entity.appObject.getComponent("ABB6700PM");
    expect(pm).toBeDefined();
  });
});
