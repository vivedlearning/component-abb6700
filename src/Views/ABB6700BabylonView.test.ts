import { describe, it, expect, beforeEach, vi } from "vitest";
import { Angle, makeAppObjectRepo } from "@vived/core";
import { ABB6700VM } from "../PMs/ABB6700PM";
import { makeABB6700Entity } from "../Entities/ABB6700Entity";
import { MockABB6700PM } from "../Mocks/MockABB6700PM";

// ── Babylon.js mocks ──────────────────────────────────────────────────────
vi.mock("@babylonjs/core", () => {
  class TransformNode {
    name: string;
    metadata: unknown;
    rotation = { x: 0, y: 0, z: 0 };
    position = { x: 0, y: 0, z: 0 };
    rotationQuaternion: { x: number; y: number; z: number; w: number } | null =
      null;

    constructor(name: string) {
      this.name = name;
    }
  }

  class AbstractMesh extends TransformNode {
    constructor(name: string) {
      super(name);
    }
  }

  return { TransformNode, AbstractMesh };
});

// Must import AFTER vi.mock so the mock is active
import { AbstractMesh, TransformNode } from "@babylonjs/core";
import {
  ABB6700BabylonView,
  makeABB6700BabylonView,
} from "./ABB6700BabylonView";

// ── Helpers ───────────────────────────────────────────────────────────────

/** Access the protected `bindMeshes` method for testing */
function callBindMeshes(
  view: ABB6700BabylonView,
  meshes: AbstractMesh[],
  transformNodes?: TransformNode[],
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (view as any).bindMeshes(meshes, transformNodes);
}

function makeNode(
  name: string,
  opts?: { meshId?: string; hasQuaternion?: boolean },
): TransformNode {
  const node = new TransformNode(name);
  if (opts?.meshId) {
    node.metadata = { gltf: { extras: { meshId: opts.meshId } } };
  }
  if (opts?.hasQuaternion) {
    node.rotationQuaternion = { x: 0, y: 0, z: 0, w: 1 } as never;
  }
  return node;
}

function makeMesh(
  name: string,
  opts?: { meshId?: string; hasQuaternion?: boolean },
): AbstractMesh {
  // vi.mock replaces AbstractMesh with a concrete class at runtime
  const mesh = new (AbstractMesh as unknown as new (n: string) => AbstractMesh)(
    name,
  );
  if (opts?.meshId) {
    mesh.metadata = { gltf: { extras: { meshId: opts.meshId } } };
  }
  if (opts?.hasQuaternion) {
    mesh.rotationQuaternion = { x: 0, y: 0, z: 0, w: 1 } as never;
  }
  return mesh;
}

function makeVM(overrides: Partial<ABB6700VM> = {}): ABB6700VM {
  return {
    j1: Angle.FromDegrees(0),
    j2: Angle.FromDegrees(0),
    j3: Angle.FromDegrees(0),
    j4: Angle.FromDegrees(0),
    j5: Angle.FromDegrees(0),
    j6: Angle.FromDegrees(0),
    stabilizerAngle: Angle.FromDegrees(0),
    stabilizerExtension: 0,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("ABB6700BabylonView", () => {
  let appObjects: ReturnType<typeof makeAppObjectRepo>;

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
  });

  describe("Construction", () => {
    it("creates the view and registers it on the AppObject", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      new MockABB6700PM(appObject);

      const view = makeABB6700BabylonView(appObject);

      expect(view).toBeDefined();
      expect(ABB6700BabylonView.get(appObject)).toBe(view);
    });

    it("subscribes to the PM adapter on construction", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      const pm = new MockABB6700PM(appObject);
      const addViewSpy = vi.spyOn(pm, "addView");

      makeABB6700BabylonView(appObject);

      expect(addViewSpy).toHaveBeenCalledOnce();
    });
  });

  describe("Static get()", () => {
    it("returns undefined when no view exists", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      expect(ABB6700BabylonView.get(appObject)).toBeUndefined();
    });

    it("returns the view when it exists", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      new MockABB6700PM(appObject);
      const view = makeABB6700BabylonView(appObject);

      expect(ABB6700BabylonView.get(appObject)).toBe(view);
    });
  });

  describe("bindMeshes", () => {
    it("assigns joint nodes by name", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      const pm = new MockABB6700PM(appObject);
      const view = makeABB6700BabylonView(appObject);

      const j1 = makeMesh("joint_1");
      const j2 = makeMesh("joint_2");
      const j3 = makeMesh("joint_3");
      const j4 = makeMesh("joint_4");
      const j5 = makeMesh("joint_5");
      const j6 = makeMesh("joint_6");

      callBindMeshes(view, [j1, j2, j3, j4, j5, j6]);

      // Trigger a VM update to verify nodes are bound
      const vm = makeVM({
        j1: Angle.FromDegrees(10),
        j2: Angle.FromDegrees(20),
        j3: Angle.FromDegrees(30),
        j4: Angle.FromDegrees(40),
        j5: Angle.FromDegrees(50),
        j6: Angle.FromDegrees(60),
      });
      pm.doUpdateView(vm);

      expect(j1.rotation.z).toBeCloseTo(Angle.FromDegrees(10).radians);
      expect(j2.rotation.z).toBeCloseTo(Angle.FromDegrees(20).radians);
      expect(j3.rotation.z).toBeCloseTo(Angle.FromDegrees(30).radians);
      expect(j4.rotation.z).toBeCloseTo(Angle.FromDegrees(40).radians);
      expect(j5.rotation.z).toBeCloseTo(Angle.FromDegrees(50).radians);
      expect(j6.rotation.z).toBeCloseTo(Angle.FromDegrees(60).radians);
    });

    it("assigns joint nodes by gltf metadata meshId", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      const pm = new MockABB6700PM(appObject);
      const view = makeABB6700BabylonView(appObject);

      const j1 = makeMesh("some_arbitrary_name", { meshId: "Joint_1" });
      callBindMeshes(view, [j1]);

      const vm = makeVM({ j1: Angle.FromDegrees(45) });
      pm.doUpdateView(vm);

      expect(j1.rotation.z).toBeCloseTo(Angle.FromDegrees(45).radians);
    });

    it("assigns stabilizer nodes from transform nodes", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      const pm = new MockABB6700PM(appObject);
      const view = makeABB6700BabylonView(appObject);

      const stabRot = makeNode("stabilizer_joint_1");
      const stabPrismatic = makeNode("stabilizer_joint_2");

      callBindMeshes(view, [], [stabRot, stabPrismatic]);

      const vm = makeVM({
        stabilizerAngle: Angle.FromDegrees(15),
        stabilizerExtension: 0.05,
      });
      pm.doUpdateView(vm);

      expect(stabRot.rotation.z).toBeCloseTo(Angle.FromDegrees(15).radians);
      expect(stabPrismatic.position.z).toBeCloseTo(0.05);
    });

    it("nulls rotationQuaternion on joint nodes", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      new MockABB6700PM(appObject);
      const view = makeABB6700BabylonView(appObject);

      const j1 = makeMesh("joint_1", { hasQuaternion: true });
      const j2 = makeMesh("joint_2", { hasQuaternion: true });
      const stabRot = makeNode("stabilizer_joint_1", {
        hasQuaternion: true,
      });

      expect(j1.rotationQuaternion).not.toBeNull();

      callBindMeshes(view, [j1, j2], [stabRot]);

      expect(j1.rotationQuaternion).toBeNull();
      expect(j2.rotationQuaternion).toBeNull();
      expect(stabRot.rotationQuaternion).toBeNull();
    });

    it("does NOT null rotationQuaternion on the prismatic stabilizer node", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      new MockABB6700PM(appObject);
      const view = makeABB6700BabylonView(appObject);

      const stabPrismatic = makeNode("stabilizer_joint_2", {
        hasQuaternion: true,
      });

      callBindMeshes(view, [], [stabPrismatic]);

      // stabilizerPrismaticNode is not in the jointNodes list that gets nulled
      expect(stabPrismatic.rotationQuaternion).not.toBeNull();
    });

    it("re-applies the last VM when new meshes are bound", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      const pm = new MockABB6700PM(appObject);
      const view = makeABB6700BabylonView(appObject);

      // First, send a VM update with no meshes bound
      const vm = makeVM({ j1: Angle.FromDegrees(30) });
      pm.doUpdateView(vm);

      // Now bind meshes — the last VM should be re-applied
      const j1 = makeMesh("joint_1");
      callBindMeshes(view, [j1]);

      expect(j1.rotation.z).toBeCloseTo(Angle.FromDegrees(30).radians);
    });

    it("resets node assignments when called again", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      const pm = new MockABB6700PM(appObject);
      const view = makeABB6700BabylonView(appObject);

      const j1Old = makeMesh("joint_1");
      callBindMeshes(view, [j1Old]);

      // Re-bind with a new set of meshes (no j1 this time)
      const j2 = makeMesh("joint_2");
      callBindMeshes(view, [j2]);

      const vm = makeVM({
        j1: Angle.FromDegrees(45),
        j2: Angle.FromDegrees(90),
      });
      pm.doUpdateView(vm);

      // Old j1 should NOT have been updated
      expect(j1Old.rotation.z).toBe(0);
      // New j2 should be updated
      expect(j2.rotation.z).toBeCloseTo(Angle.FromDegrees(90).radians);
    });

    it("handles case-insensitive node name matching", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      const pm = new MockABB6700PM(appObject);
      const view = makeABB6700BabylonView(appObject);

      const j1 = makeMesh("JOINT_1");
      callBindMeshes(view, [j1]);

      const vm = makeVM({ j1: Angle.FromDegrees(25) });
      pm.doUpdateView(vm);

      expect(j1.rotation.z).toBeCloseTo(Angle.FromDegrees(25).radians);
    });
  });

  describe("applyView", () => {
    it("applies all joint rotations from the VM", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      const pm = new MockABB6700PM(appObject);
      const view = makeABB6700BabylonView(appObject);

      const j1 = makeMesh("joint_1");
      const j2 = makeMesh("joint_2");
      const j3 = makeMesh("joint_3");
      const j4 = makeMesh("joint_4");
      const j5 = makeMesh("joint_5");
      const j6 = makeMesh("joint_6");
      const stabRot = makeNode("stabilizer_joint_1");
      const stabPrismatic = makeNode("stabilizer_joint_2");

      callBindMeshes(view, [j1, j2, j3, j4, j5, j6], [stabRot, stabPrismatic]);

      const vm = makeVM({
        j1: Angle.FromDegrees(10),
        j2: Angle.FromDegrees(20),
        j3: Angle.FromDegrees(30),
        j4: Angle.FromDegrees(40),
        j5: Angle.FromDegrees(50),
        j6: Angle.FromDegrees(60),
        stabilizerAngle: Angle.FromDegrees(5),
        stabilizerExtension: 0.02,
      });
      pm.doUpdateView(vm);

      expect(j1.rotation.z).toBeCloseTo(Angle.FromDegrees(10).radians);
      expect(j2.rotation.z).toBeCloseTo(Angle.FromDegrees(20).radians);
      expect(j3.rotation.z).toBeCloseTo(Angle.FromDegrees(30).radians);
      expect(j4.rotation.z).toBeCloseTo(Angle.FromDegrees(40).radians);
      expect(j5.rotation.z).toBeCloseTo(Angle.FromDegrees(50).radians);
      expect(j6.rotation.z).toBeCloseTo(Angle.FromDegrees(60).radians);
      expect(stabRot.rotation.z).toBeCloseTo(Angle.FromDegrees(5).radians);
      expect(stabPrismatic.position.z).toBeCloseTo(0.02);
    });

    it("safely handles unbound nodes (no crash)", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      const pm = new MockABB6700PM(appObject);
      makeABB6700BabylonView(appObject);

      // No meshes bound — should not throw
      expect(() => {
        pm.doUpdateView(makeVM({ j1: Angle.FromDegrees(45) }));
      }).not.toThrow();
    });
  });

  describe("Disposal", () => {
    it("unsubscribes from the PM adapter on dispose", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      const pm = new MockABB6700PM(appObject);
      const removeViewSpy = vi.spyOn(pm, "removeView");

      const view = makeABB6700BabylonView(appObject);
      view.dispose();

      expect(removeViewSpy).toHaveBeenCalledOnce();
    });

    it("stops applying VM updates after disposal", () => {
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      const pm = new MockABB6700PM(appObject);
      const view = makeABB6700BabylonView(appObject);

      const j1 = makeMesh("joint_1");
      callBindMeshes(view, [j1]);

      view.dispose();

      pm.doUpdateView(makeVM({ j1: Angle.FromDegrees(99) }));

      // j1 should remain at 0 since the view was disposed
      expect(j1.rotation.z).toBe(0);
    });
  });
});
