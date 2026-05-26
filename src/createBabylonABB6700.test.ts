import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AppObjectRepo,
  makeAppObjectRepo,
  makeDomainFactoryRepo,
} from "@vived/core";

// Mock Babylon imports
vi.mock("@babylonjs/core", () => {
  class TransformNode {
    name: string;
    metadata: unknown;
    rotation = { x: 0, y: 0, z: 0 };
    position = { x: 0, y: 0, z: 0 };
    rotationQuaternion = null;

    constructor(name: string) {
      this.name = name;
    }
  }

  class AbstractMesh extends TransformNode {
    constructor(name: string) {
      super(name);
    }
  }

  async function LoadAssetContainerAsync() {
    return {
      instantiateModelsToScene: () => ({
        rootNodes: [],
        dispose: () => {},
      }),
    };
  }

  return { TransformNode, AbstractMesh, LoadAssetContainerAsync };
});

vi.mock("@babylonjs/loaders/glTF", () => ({}));

vi.mock("@vived/app", () => ({
  getAssetBlobURL: vi.fn(),
  BabylonEntity: {
    get: vi.fn(),
    getOrCreate: vi.fn(),
  },
}));

// Import after mocks
import { BabylonEntity } from "@vived/app";
import { createBabylonABB6700 } from "./createBabylonABB6700";
import { makeABB6700FeatureFactory } from "./Factory/ABB6700FeatureFactory";
import { ABB6700BabylonView } from "./Views/ABB6700BabylonView";

describe("createBabylonABB6700", () => {
  let appObjects: AppObjectRepo;

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
    const factoryRepo = makeDomainFactoryRepo(appObjects);
    makeABB6700FeatureFactory(appObjects);
    factoryRepo.setupDomain();
  });

  it("returns undefined when ABB6700Repo is not found", async () => {
    // Create a fresh appObjects without the factory setup
    const emptyAppObjects = makeAppObjectRepo();
    const result = await createBabylonABB6700("test-id", emptyAppObjects);
    expect(result).toBeUndefined();
  });

  it("creates an AppObject with both domain and Babylon view", async () => {
    // Mock BabylonEntity to allow load() to succeed
    const mockScene = {
      /* minimal mock */
    } as never;
    vi.mocked(BabylonEntity.get).mockReturnValue({
      scene: mockScene,
    } as never);

    const result = await createBabylonABB6700("test-instance", appObjects);

    expect(result).toBeDefined();
    expect(result?.id).toBe("test-instance");
  });

  it("creates a Babylon view on the returned AppObject", async () => {
    // Mock BabylonEntity to allow load() to succeed
    const mockScene = {
      /* minimal mock */
    } as never;
    vi.mocked(BabylonEntity.get).mockReturnValue({
      scene: mockScene,
    } as never);

    const result = await createBabylonABB6700("test-instance", appObjects);

    const view = ABB6700BabylonView.get(result!);
    expect(view).toBeDefined();
  });

  it("returns the same AppObject instance from the domain creation path", async () => {
    // Mock BabylonEntity to allow load() to succeed
    const mockScene = {
      /* minimal mock */
    } as never;
    vi.mocked(BabylonEntity.get).mockReturnValue({
      scene: mockScene,
    } as never);

    const result = await createBabylonABB6700("test-instance-2", appObjects);

    // The returned AppObject should be the one created by the repo
    expect(result?.id).toBe("test-instance-2");
  });
});
