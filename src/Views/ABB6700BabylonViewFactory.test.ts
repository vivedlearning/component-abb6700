import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppObjectRepo, makeAppObjectRepo } from "@vived/core";
import { makeABB6700Repo } from "../Entities/ABB6700Repo";
import { makeABB6700RepoPM } from "../PMs/ABB6700RepoPM";

const mockLoadAssetContainerAsync = vi.hoisted(() => vi.fn());
const mockGetAssetBlobURL = vi.hoisted(() => vi.fn());
const mockMakeABB6700BabylonView = vi.hoisted(() => vi.fn());

vi.mock("@babylonjs/loaders/glTF", () => ({}));
vi.mock("@babylonjs/core", () => ({
  Scene: class Scene {},
  Node: class Node {},
  AssetContainer: class AssetContainer {},
  AbstractMesh: class AbstractMesh {},
  SceneLoader: {
    LoadAssetContainerAsync: mockLoadAssetContainerAsync,
  },
}));
vi.mock("@vived/app", () => ({
  getAssetBlobURL: mockGetAssetBlobURL,
}));
vi.mock("../component.config", () => ({
  default: {
    assets: [{ id: "asset-1" }],
  },
}));
vi.mock("./ABB6700BabylonView", () => ({
  makeABB6700BabylonView: mockMakeABB6700BabylonView,
}));

import {
  ABB6700BabylonViewFactory,
  makeABB6700BabylonViewFactory,
  setupABB6700Framework,
} from "./ABB6700BabylonViewFactory";

describe("ABB6700BabylonViewFactory", () => {
  let appObjects: AppObjectRepo;

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
    mockLoadAssetContainerAsync.mockReset();
    mockGetAssetBlobURL.mockReset();
    mockMakeABB6700BabylonView.mockReset();

    mockGetAssetBlobURL.mockResolvedValue("blob:asset-url");
  });

  it("creates views for existing repo entities on setup", async () => {
    const repoAppObject = appObjects.getOrCreate("ABB6700s");
    const repo = makeABB6700Repo(repoAppObject);
    makeABB6700RepoPM(repoAppObject);
    repo.createABB6700Entity("arm-a");

    const mesh = {};
    const rootNode = {
      getChildMeshes: vi.fn(() => [mesh]),
      dispose: vi.fn(),
    };
    const assetContainer = {
      instantiateModelsToScene: vi.fn(() => ({ rootNodes: [rootNode] })),
      dispose: vi.fn(),
    };
    mockLoadAssetContainerAsync.mockResolvedValue(assetContainer);

    const view = {
      setupView: vi.fn().mockResolvedValue(undefined),
      bindMeshes: vi.fn(),
      dispose: vi.fn(),
    };
    mockMakeABB6700BabylonView.mockReturnValue(view);

    const factory = makeABB6700BabylonViewFactory(repoAppObject);
    await factory.setupView({} as never);
    await Promise.resolve();

    expect(mockLoadAssetContainerAsync).toHaveBeenCalledWith(
      "blob:asset-url",
      "",
      expect.anything(),
      undefined,
      ".glb",
    );
    expect(mockMakeABB6700BabylonView).toHaveBeenCalledTimes(1);
    expect(view.setupView).toHaveBeenCalledTimes(1);
    expect(view.bindMeshes).toHaveBeenCalledWith([mesh]);
  });

  it("adds and removes entity views based on VM diffs", async () => {
    const repoAppObject = appObjects.getOrCreate("ABB6700s");
    const repo = makeABB6700Repo(repoAppObject);
    makeABB6700RepoPM(repoAppObject);

    const mesh = {};
    const rootNode = {
      getChildMeshes: vi.fn(() => [mesh]),
      dispose: vi.fn(),
    };
    const assetContainer = {
      instantiateModelsToScene: vi.fn(() => ({ rootNodes: [rootNode] })),
      dispose: vi.fn(),
    };
    mockLoadAssetContainerAsync.mockResolvedValue(assetContainer);

    const view = {
      setupView: vi.fn().mockResolvedValue(undefined),
      bindMeshes: vi.fn(),
      dispose: vi.fn(),
    };
    mockMakeABB6700BabylonView.mockReturnValue(view);

    const factory = makeABB6700BabylonViewFactory(repoAppObject);
    await factory.setupView({} as never);

    repo.createABB6700Entity("arm-a");
    await Promise.resolve();
    await Promise.resolve();

    expect(mockMakeABB6700BabylonView).toHaveBeenCalledTimes(1);

    repo.deleteABB6700Entity("arm-a");

    expect(rootNode.dispose).toHaveBeenCalledTimes(1);
    expect(view.dispose).toHaveBeenCalledTimes(1);

    factory.dispose();
    expect(assetContainer.dispose).toHaveBeenCalledTimes(1);
  });

  it("setupABB6700Framework returns the factory on ABB6700s AppObject", async () => {
    const repoAppObject = appObjects.getOrCreate("ABB6700s");
    makeABB6700Repo(repoAppObject);
    makeABB6700RepoPM(repoAppObject);

    const assetContainer = {
      instantiateModelsToScene: vi.fn(() => ({ rootNodes: [] })),
      dispose: vi.fn(),
    };
    mockLoadAssetContainerAsync.mockResolvedValue(assetContainer);

    const factory = await setupABB6700Framework(appObjects, {} as never);

    expect(factory).toBeInstanceOf(ABB6700BabylonViewFactory);
    expect(ABB6700BabylonViewFactory.get(repoAppObject)).toBe(factory);
  });
});
