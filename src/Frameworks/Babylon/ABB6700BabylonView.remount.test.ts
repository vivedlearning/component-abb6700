import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeAppObjectRepo } from "@vived/core";
import { makeABB6700Entity } from "../../Domain/Entities/ABB6700Entity";
import { MockABB6700PM } from "../../Domain/Mocks/MockABB6700PM";

/**
 * The Host mounts the app more than once per page life. Each mount is a new
 * engine and scene; the component module lives on. This test drives that with
 * real Babylon (NullEngine) and a stand-in loader that builds an AssetContainer
 * in whichever scene it is asked for — exactly what the real glTF loader does.
 *
 * The bug it guards: a cache keyed by asset id alone handed the second scene a
 * container from the first, so `instantiateModelsToScene` cloned the arm into
 * the dead scene and nothing drew, even though the transform hierarchy existed.
 */

// Partial mock: real Babylon, with only the loader replaced.
vi.mock("@babylonjs/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@babylonjs/core")>();
  return {
    ...actual,
    LoadAssetContainerAsync: vi.fn(async (_url: string, scene: unknown) => {
      const target = scene as import("@babylonjs/core").Scene;
      const container = new actual.AssetContainer(target);
      const root = new actual.TransformNode("abb_6700_root", target);
      const base = new actual.Mesh("base", target);
      base.parent = root;
      const eot = new actual.TransformNode("eot", target);
      eot.parent = base;
      // Not in the scene until instantiated — as a container load leaves them.
      target.removeTransformNode(root);
      target.removeMesh(base);
      target.removeTransformNode(eot);
      container.transformNodes.push(root, eot);
      container.meshes.push(base);
      return container;
    }),
  };
});

vi.mock("@babylonjs/loaders/glTF", () => ({}));

vi.mock("@vived/app", () => ({
  getAssetBlobURL: vi.fn().mockResolvedValue("blob:arm"),
  BabylonEntity: { get: vi.fn(), getOrCreate: vi.fn() },
}));

import { NullEngine, Scene } from "@babylonjs/core";
import { BabylonEntity } from "@vived/app";
import { makeABB6700BabylonView } from "./ABB6700BabylonView";
import { clearABB6700AssetCache } from "./ABB6700AssetCache";

describe("ABB6700BabylonView across a Host remount", () => {
  let engine: NullEngine;
  let appObjects: ReturnType<typeof makeAppObjectRepo>;

  beforeEach(() => {
    engine = new NullEngine();
    appObjects = makeAppObjectRepo();
    clearABB6700AssetCache();
  });

  afterEach(() => {
    engine.dispose();
  });

  async function mountArmInto(scene: Scene, id: string) {
    const appObject = appObjects.getOrCreate(id);
    makeABB6700Entity(appObject);
    new MockABB6700PM(appObject);
    vi.mocked(BabylonEntity.get).mockReturnValue({ scene } as never);
    return makeABB6700BabylonView(appObject);
  }

  it("puts the arm's nodes in the scene of the mount that loaded it, after a previous mount used another scene", async () => {
    const firstScene = new Scene(engine);
    await mountArmInto(firstScene, "arm-first-mount");
    firstScene.dispose();

    const secondScene = new Scene(engine);
    const view = await mountArmInto(secondScene, "arm-second-mount");

    expect(view.rootTransformNode?.getScene()).toBe(secondScene);
    expect(view.eotTransformNode?.getScene()).toBe(secondScene);
    expect(secondScene.meshes.map((m) => m.name)).toContain("base");
    expect(view.shadowCasters.every((m) => m.getScene() === secondScene)).toBe(
      true,
    );
  });

  it("gives four arms in one scene their own nodes from a single shared load", async () => {
    const scene = new Scene(engine);
    const views = await Promise.all(
      [1, 2, 3, 4].map((n) => mountArmInto(scene, `arm-${n}`)),
    );

    const roots = views.map((v) => v.rootTransformNode);
    expect(new Set(roots).size).toBe(4);
    expect(roots.every((r) => r?.getScene() === scene)).toBe(true);
    expect(scene.meshes.filter((m) => m.name === "base")).toHaveLength(4);
  });
});
