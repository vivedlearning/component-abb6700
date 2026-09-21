import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@babylonjs/core", () => {
  const LoadAssetContainerAsync = vi.fn();
  return { LoadAssetContainerAsync };
});

vi.mock("@babylonjs/loaders/glTF", () => ({}));

vi.mock("@vived/app", () => ({
  getAssetBlobURL: vi.fn(),
}));

import { LoadAssetContainerAsync } from "@babylonjs/core";
import { getAssetBlobURL } from "@vived/app";
import { makeAppObjectRepo } from "@vived/core";
import {
  clearABB6700AssetCache,
  getABB6700AssetContainer,
} from "./ABB6700AssetCache";

const fakeScene = {} as never;
const fakeAssetId = "test-asset-id";

describe("ABB6700AssetCache", () => {
  let appObjects: ReturnType<typeof makeAppObjectRepo>;

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
    vi.clearAllMocks();
    clearABB6700AssetCache();
  });

  it("loads the asset on first call", async () => {
    const fakeContainer = { id: "container-1" };
    vi.mocked(getAssetBlobURL).mockResolvedValue("blob:test");
    vi.mocked(LoadAssetContainerAsync).mockResolvedValue(
      fakeContainer as never,
    );

    const result = await getABB6700AssetContainer(
      fakeScene,
      appObjects,
      fakeAssetId,
    );

    expect(result).toBe(fakeContainer);
    expect(getAssetBlobURL).toHaveBeenCalledWith(fakeAssetId, appObjects);
    expect(LoadAssetContainerAsync).toHaveBeenCalledWith(
      "blob:test",
      fakeScene,
      { pluginExtension: ".glb" },
    );
  });

  it("returns the cached container on second call for the same scene and asset", async () => {
    const fakeContainer = { id: "container-2" };
    vi.mocked(getAssetBlobURL).mockResolvedValue("blob:test");
    vi.mocked(LoadAssetContainerAsync).mockResolvedValue(
      fakeContainer as never,
    );

    const first = await getABB6700AssetContainer(
      fakeScene,
      appObjects,
      fakeAssetId,
    );
    const second = await getABB6700AssetContainer(
      fakeScene,
      appObjects,
      fakeAssetId,
    );

    expect(first).toBe(fakeContainer);
    expect(second).toBe(fakeContainer);
    expect(LoadAssetContainerAsync).toHaveBeenCalledTimes(1);
  });

  it("deduplicates in-flight requests for the same scene and asset", async () => {
    const fakeContainer = { id: "container-3" };
    vi.mocked(getAssetBlobURL).mockResolvedValue("blob:test");
    vi.mocked(LoadAssetContainerAsync).mockResolvedValue(
      fakeContainer as never,
    );

    const [first, second] = await Promise.all([
      getABB6700AssetContainer(fakeScene, appObjects, fakeAssetId),
      getABB6700AssetContainer(fakeScene, appObjects, fakeAssetId),
    ]);

    expect(first).toBe(fakeContainer);
    expect(second).toBe(fakeContainer);
    expect(LoadAssetContainerAsync).toHaveBeenCalledTimes(1);
  });

  it("loads separately for different scenes", async () => {
    const fakeContainer = { id: "container-4" };
    const scene2 = {} as never;
    vi.mocked(getAssetBlobURL).mockResolvedValue("blob:test");
    vi.mocked(LoadAssetContainerAsync).mockResolvedValue(
      fakeContainer as never,
    );

    await getABB6700AssetContainer(fakeScene, appObjects, fakeAssetId);
    await getABB6700AssetContainer(scene2, appObjects, fakeAssetId);

    expect(LoadAssetContainerAsync).toHaveBeenCalledTimes(2);
    expect(vi.mocked(LoadAssetContainerAsync).mock.calls[1][1]).toBe(scene2);
  });

  it("retries after a failed load", async () => {
    vi.mocked(getAssetBlobURL).mockResolvedValue("blob:test");
    vi.mocked(LoadAssetContainerAsync)
      .mockRejectedValueOnce(new Error("load failed"))
      .mockResolvedValueOnce({ id: "container-5" } as never);

    await expect(
      getABB6700AssetContainer(fakeScene, appObjects, fakeAssetId),
    ).rejects.toThrow("load failed");

    const result = await getABB6700AssetContainer(
      fakeScene,
      appObjects,
      fakeAssetId,
    );
    expect((result as { id: string }).id).toBe("container-5");
    expect(LoadAssetContainerAsync).toHaveBeenCalledTimes(2);
  });

  it("clears all cache entries", async () => {
    const fakeContainer = { id: "container-6" };
    vi.mocked(getAssetBlobURL).mockResolvedValue("blob:test");
    vi.mocked(LoadAssetContainerAsync).mockResolvedValue(
      fakeContainer as never,
    );

    await getABB6700AssetContainer(fakeScene, appObjects, fakeAssetId);
    clearABB6700AssetCache();
    await getABB6700AssetContainer(fakeScene, appObjects, fakeAssetId);

    expect(LoadAssetContainerAsync).toHaveBeenCalledTimes(2);
  });
});
