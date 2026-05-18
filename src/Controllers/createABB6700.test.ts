import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AppObjectRepo,
  makeAppObjectRepo,
  makeDomainFactoryRepo,
} from "@vived/core";
import { createABB6700 } from "./createABB6700";
import { ABB6700Repo } from "../Entities/ABB6700Repo";
import { makeABB6700FeatureFactory } from "../Factory/ABB6700FeatureFactory";

describe("createABB6700 controller", () => {
  let appObjects: AppObjectRepo;

  beforeEach(() => {
    vi.clearAllMocks();
    appObjects = makeAppObjectRepo();
    const factoryRepo = makeDomainFactoryRepo(appObjects);
    makeABB6700FeatureFactory(appObjects);
    factoryRepo.setupDomain();
  });

  it("creates an entity and returns its AppObject", () => {
    const appObject = createABB6700("instance-1", appObjects);

    expect(appObject).toBeDefined();
    expect(appObject!.id).toBe("instance-1");

    const repo = ABB6700Repo.get(appObjects)!;
    const entity = repo.getById("instance-1");
    expect(entity).toBeDefined();
  });

  it("returns undefined and warns if the repo is not found", () => {
    const bareAppObjects = makeAppObjectRepo();
    const warnSpy = vi.spyOn(bareAppObjects, "submitWarning");

    const result = createABB6700("instance-1", bareAppObjects);

    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      "createABB6700",
      "Unable to find ABB6700Repo",
    );
  });
});
