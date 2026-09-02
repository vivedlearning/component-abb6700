import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Angle,
  type AppObjectRepo,
  makeAppObjectRepo,
  makeDomainFactoryRepo,
} from "@vived/core";

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

    getDescendants(): TransformNode[] {
      return [];
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

import { BabylonEntity } from "@vived/app";
import { makeABB6700FeatureFactory } from "./Domain/Factory/ABB6700FeatureFactory";
import { ABB6700Entity } from "./Domain/Entities/ABB6700Entity";
import { ABB6700BabylonView } from "./Frameworks/Babylon/ABB6700BabylonView";
import {
  ABB6700Facade,
  ABB_6700_STATE_VERSION,
  type ABB6700State,
} from "./ABB6700Facade";

describe("ABB6700Facade", () => {
  let appObjects: AppObjectRepo;

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
    const factoryRepo = makeDomainFactoryRepo(appObjects);
    makeABB6700FeatureFactory(appObjects);
    factoryRepo.setupDomain();
    vi.mocked(BabylonEntity.get).mockReturnValue({
      scene: {} as never,
    } as never);
  });

  it("implements the SmartComponent contract with interfaceVersion 1", () => {
    const facade = new ABB6700Facade("arm-1", appObjects);

    expect(facade.id).toBe("arm-1");
    expect(facade.interfaceVersion).toBe(1);
    expect(typeof facade.onEvent).toBe("function");
    expect(typeof facade.onViewModel).toBe("function");
    expect(typeof facade.load).toBe("function");
    expect(typeof facade.destroy).toBe("function");
    expect(typeof facade.getState).toBe("function");
    expect(typeof facade.applyState).toBe("function");
  });

  it("creates the domain instance headlessly and only attaches the view during load", async () => {
    const facade = new ABB6700Facade("arm-1", appObjects);
    const appObject = appObjects.get("arm-1");

    expect(ABB6700Entity.getById("arm-1", appObjects)).toBeDefined();
    expect(appObject).toBeDefined();
    expect(ABB6700BabylonView.get(appObject!)).toBeUndefined();

    await facade.load();

    expect(ABB6700BabylonView.get(appObject!)).toBeDefined();
  });

  it("round-trips pose state in degrees without serializing stabilizer state", () => {
    const facade = new ABB6700Facade("arm-1", appObjects);
    const state: ABB6700State = {
      version: ABB_6700_STATE_VERSION,
      j1: 10,
      j2: 20,
      j3: 30,
      j4: 40,
      j5: 50,
      j6: 60,
    };

    facade.applyState(state);

    expect(facade.getState()).toEqual(state);
    expect(facade.getState().j1).toBe(10);
    expect(facade.getState().j2).toBe(20);
    expect(facade.getState().j3).toBe(30);
    expect(facade.getState().j4).toBe(40);
    expect(facade.getState().j5).toBe(50);
    expect(facade.getState().j6).toBe(60);
  });

  it("wraps the existing joint controllers", () => {
    const facade = new ABB6700Facade("arm-1", appObjects);

    facade.setJointAngle("j2", Angle.FromDegrees(-15));
    expect(facade.getState().j2).toBe(-15);

    facade.setPose({
      j1: Angle.FromDegrees(1),
      j2: Angle.FromDegrees(2),
      j3: Angle.FromDegrees(3),
      j4: Angle.FromDegrees(4),
      j5: Angle.FromDegrees(5),
      j6: Angle.FromDegrees(6),
    });

    expect(facade.getState()).toEqual({
      version: ABB_6700_STATE_VERSION,
      j1: 1,
      j2: 2,
      j3: 3,
      j4: 4,
      j5: 5,
      j6: 6,
    });
  });

  it("subscribes and unsubscribes view-model listeners through the PM adapter", () => {
    const facade = new ABB6700Facade("arm-1", appObjects);
    const vms: number[] = [];

    const unsubscribe = facade.onViewModel((vm) => {
      vms.push(vm.j1.degrees);
    });

    facade.setJointAngle("j1", Angle.FromDegrees(25));
    unsubscribe();
    facade.setJointAngle("j1", Angle.FromDegrees(35));

    expect(vms).toEqual([0, 25]);
  });

  it("provides a contract-complete no-op event API", () => {
    const facade = new ABB6700Facade("arm-1", appObjects);
    const unsubscribe = facade.onEvent("ignored", () => {});

    expect(unsubscribe).toEqual(expect.any(Function));
    expect(() => unsubscribe()).not.toThrow();
  });

  it("destroys the component instance and attached view cleanly", async () => {
    const facade = new ABB6700Facade("arm-1", appObjects);
    await facade.load();

    facade.destroy();

    expect(ABB6700Entity.getById("arm-1", appObjects)).toBeUndefined();
  });
});
