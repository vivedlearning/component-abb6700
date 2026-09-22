import { describe, it, expect, beforeEach, vi } from "vitest";
import { Angle, makeAppObjectRepo } from "@vived/core";
import { ABB6700VM } from "../../Domain/PMs/ABB6700PM";
import {
  makeABB6700Entity,
  ABB_6700_DEFAULT_TRANSITION_DURATION_MS,
} from "../../Domain/Entities/ABB6700Entity";
import { MockABB6700PM } from "../../Domain/Mocks/MockABB6700PM";

/**
 * Pose-transition contract for ABB6700BabylonView (PRD: pose-interpolation,
 * view-only stories). The view is driven through the PM adapter (a new VM per
 * command) and observed on Babylon joint nodes. Time is driven by a mock
 * scene whose onBeforeRenderObservable the test fires by hand, with the
 * engine's delta time set per frame.
 */

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

  const LoadAssetContainerAsync = vi.fn(
    async (_url: string, scene: unknown) => ({
      scene,
      instantiateModelsToScene: () => ({
        rootNodes: [],
        dispose: () => {},
      }),
    }),
  );

  return { TransformNode, AbstractMesh, LoadAssetContainerAsync };
});

vi.mock("@babylonjs/loaders/glTF", () => ({}));

// ── @vived/app mocks ──────────────────────────────────────────────────────
vi.mock("@vived/app", () => ({
  getAssetBlobURL: vi.fn(),
  BabylonEntity: {
    get: vi.fn(),
    getOrCreate: vi.fn(),
  },
}));

// Must import AFTER vi.mock so the mock is active
import { AbstractMesh, TransformNode } from "@babylonjs/core";
import { BabylonEntity } from "@vived/app";
import {
  ABB6700BabylonView,
  makeABB6700BabylonView,
} from "./ABB6700BabylonView";
import { clearABB6700AssetCache } from "./ABB6700AssetCache";
import { calcStabilizer } from "../../Domain/UCs/CalcStabilizerUC";

// ── Mock scene with a hand-driven render loop ─────────────────────────────

type RenderCallback = (eventData: unknown, eventState: unknown) => void;

interface MockScene {
  /** The object handed to the view as the Babylon Scene. */
  scene: never;
  /** Advance one frame with the given delta time (ms). */
  frame(deltaMs: number): void;
  /** How many render observers the view currently holds on this scene. */
  observerCount(): number;
}

function makeMockScene(): MockScene {
  const observers: RenderCallback[] = [];
  let deltaMs = 0;

  const observable = {
    add: vi.fn((cb: RenderCallback) => {
      observers.push(cb);
      return { callback: cb };
    }),
    remove: vi.fn((observer: { callback: RenderCallback } | null) => {
      if (!observer) return false;
      const i = observers.indexOf(observer.callback);
      if (i < 0) return false;
      observers.splice(i, 1);
      return true;
    }),
    removeCallback: vi.fn((cb: RenderCallback) => {
      const i = observers.indexOf(cb);
      if (i < 0) return false;
      observers.splice(i, 1);
      return true;
    }),
  };

  const scene = {
    onBeforeRenderObservable: observable,
    getEngine: () => ({ getDeltaTime: () => deltaMs }),
  };

  return {
    scene: scene as never,
    frame(ms: number) {
      deltaMs = ms;
      for (const cb of [...observers]) cb(scene, {});
    },
    observerCount: () => observers.length,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function callBindMeshes(
  view: ABB6700BabylonView,
  meshes: AbstractMesh[],
  transformNodes?: TransformNode[],
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (view as any).bindMeshes(meshes, transformNodes);
}

function makeMesh(name: string): AbstractMesh {
  return new (AbstractMesh as unknown as new (n: string) => AbstractMesh)(name);
}

function makeNode(name: string): TransformNode {
  return new TransformNode(name);
}

/** A VM whose stabilizer values are consistent with its J2, as the domain emits. */
function makeVM(overrides: Partial<ABB6700VM> = {}): ABB6700VM {
  const j2 = overrides.j2 ?? Angle.FromDegrees(0);
  const stab = calcStabilizer(j2);
  return {
    j1: Angle.FromDegrees(0),
    j2,
    j3: Angle.FromDegrees(0),
    j4: Angle.FromDegrees(0),
    j5: Angle.FromDegrees(0),
    j6: Angle.FromDegrees(0),
    stabilizerAngle: stab.angle,
    stabilizerExtension: stab.extension,
    transitionDurationMs: ABB_6700_DEFAULT_TRANSITION_DURATION_MS,
    ...overrides,
  };
}

const POSE_A = {
  j1: Angle.FromDegrees(0),
  j2: Angle.FromDegrees(0),
  j3: Angle.FromDegrees(0),
  j4: Angle.FromDegrees(0),
  j5: Angle.FromDegrees(0),
  j6: Angle.FromDegrees(0),
};

const POSE_B = {
  j1: Angle.FromDegrees(90),
  j2: Angle.FromDegrees(40),
  j3: Angle.FromDegrees(-30),
  j4: Angle.FromDegrees(60),
  j5: Angle.FromDegrees(-45),
  j6: Angle.FromDegrees(120),
};

const POSE_C = {
  j1: Angle.FromDegrees(-60),
  j2: Angle.FromDegrees(10),
  j3: Angle.FromDegrees(20),
  j4: Angle.FromDegrees(-20),
  j5: Angle.FromDegrees(30),
  j6: Angle.FromDegrees(-90),
};

interface Rig {
  view: ABB6700BabylonView;
  pm: MockABB6700PM;
  joints: AbstractMesh[];
  stabRot: TransformNode;
  stabPrismatic: TransformNode;
}

/** Fraction of the way from `a` to `b` that `value` sits, in radians. */
function progress(value: number, a: Angle, b: Angle): number {
  return (value - a.radians) / (b.radians - a.radians);
}

describe("ABB6700BabylonView pose transitions", () => {
  let appObjects: ReturnType<typeof makeAppObjectRepo>;

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
    clearABB6700AssetCache();
  });

  /**
   * MockABB6700PM suppresses every VM after the first (vmsAreEqual is always
   * true). These tests sequence several VMs per arm, so each rig's PM passes
   * every VM straight through to the view.
   */
  function makePassThroughPM(appObject: ReturnType<typeof appObjects.getOrCreate>) {
    const pm = new MockABB6700PM(appObject);
    pm.vmsAreEqual = () => false;
    return pm;
  }

  async function mountArm(id: string, mock: MockScene): Promise<Rig> {
    const appObject = appObjects.getOrCreate(id);
    makeABB6700Entity(appObject);
    const pm = makePassThroughPM(appObject);
    vi.mocked(BabylonEntity.get).mockReturnValue({ scene: mock.scene } as never);
    const view = await makeABB6700BabylonView(appObject);

    const joints = [1, 2, 3, 4, 5, 6].map((n) => makeMesh(`joint_${n}`));
    const stabRot = makeNode("stabilizer_joint_1");
    const stabPrismatic = makeNode("stabilizer_joint_2");
    callBindMeshes(view, joints, [stabRot, stabPrismatic]);

    return { view, pm, joints, stabRot, stabPrismatic };
  }

  /** Mount, snap to POSE_A, then command POSE_B at the default duration. */
  async function mountInTransition(
    mock: MockScene,
    id = "arm-1",
    durationMs = ABB_6700_DEFAULT_TRANSITION_DURATION_MS,
  ): Promise<Rig> {
    const rig = await mountArm(id, mock);
    rig.pm.doUpdateView(makeVM({ ...POSE_A, transitionDurationMs: durationMs }));
    rig.pm.doUpdateView(makeVM({ ...POSE_B, transitionDurationMs: durationMs }));
    return rig;
  }

  // ── story-5: first pose snaps ─────────────────────────────────────────

  describe("story-5: appears directly in the authored pose on first load", () => {
    it("no-transition-on-load: the first VM after load is rendered with no transition", async () => {
      const mock = makeMockScene();
      const rig = await mountArm("arm-1", mock);

      rig.pm.doUpdateView(makeVM(POSE_B));

      expect(rig.joints[0].rotation.z).toBe(POSE_B.j1.radians);
      expect(rig.joints[1].rotation.z).toBe(POSE_B.j2.radians);
      expect(rig.joints[5].rotation.z).toBe(POSE_B.j6.radians);
      expect(rig.stabRot.rotation.z).toBe(calcStabilizer(POSE_B.j2).angle.radians);
    });

    it("pre-load-pose-direct: a pose commanded before meshes bind is rendered directly once they attach", async () => {
      const mock = makeMockScene();
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      const pm = makePassThroughPM(appObject);
      vi.mocked(BabylonEntity.get).mockReturnValue({ scene: mock.scene } as never);
      const view = await makeABB6700BabylonView(appObject);

      pm.doUpdateView(makeVM(POSE_B)); // before any nodes exist

      const j1 = makeMesh("joint_1");
      callBindMeshes(view, [j1]);

      expect(j1.rotation.z).toBe(POSE_B.j1.radians);
      mock.frame(16);
      expect(j1.rotation.z).toBe(POSE_B.j1.radians);
    });
  });

  // ── story-1: smooth travel, eased, exact arrival ──────────────────────

  describe("story-1: moves smoothly from the current pose to the new pose", () => {
    it("all-joints-travel: every joint is between start and target halfway through the transition", async () => {
      const mock = makeMockScene();
      const rig = await mountInTransition(mock);

      mock.frame(500);

      const targets = [POSE_B.j1, POSE_B.j2, POSE_B.j3, POSE_B.j4, POSE_B.j5, POSE_B.j6];
      const starts = [POSE_A.j1, POSE_A.j2, POSE_A.j3, POSE_A.j4, POSE_A.j5, POSE_A.j6];
      rig.joints.forEach((node, i) => {
        const p = progress(node.rotation.z, starts[i], targets[i]);
        expect(p).toBeGreaterThan(0);
        expect(p).toBeLessThan(1);
      });
    });

    it("eased: progress lags a linear clock early, leads it late, and is symmetric at the midpoint", async () => {
      const mock = makeMockScene();
      const rig = await mountInTransition(mock);
      const j1 = rig.joints[0];

      mock.frame(250);
      const early = progress(j1.rotation.z, POSE_A.j1, POSE_B.j1);
      expect(early).toBeGreaterThan(0);
      expect(early).toBeLessThan(0.25);

      mock.frame(250);
      const mid = progress(j1.rotation.z, POSE_A.j1, POSE_B.j1);
      expect(mid).toBeCloseTo(0.5, 6);

      mock.frame(250);
      const late = progress(j1.rotation.z, POSE_A.j1, POSE_B.j1);
      expect(late).toBeGreaterThan(0.75);
      expect(late).toBeLessThan(1);
    });

    it("arrives-exactly: the final frame writes the target radians verbatim and further frames change nothing", async () => {
      const mock = makeMockScene();
      const rig = await mountInTransition(mock);

      mock.frame(600);
      mock.frame(600); // overshoots the 1000 ms duration

      expect(rig.joints[0].rotation.z).toBe(POSE_B.j1.radians);
      expect(rig.joints[1].rotation.z).toBe(POSE_B.j2.radians);
      expect(rig.joints[2].rotation.z).toBe(POSE_B.j3.radians);
      expect(rig.joints[3].rotation.z).toBe(POSE_B.j4.radians);
      expect(rig.joints[4].rotation.z).toBe(POSE_B.j5.radians);
      expect(rig.joints[5].rotation.z).toBe(POSE_B.j6.radians);

      mock.frame(16);
      expect(rig.joints[0].rotation.z).toBe(POSE_B.j1.radians);
    });
  });

  // ── story-2: stabilizer stays attached ────────────────────────────────

  describe("story-2: the stabilizer linkage stays attached throughout", () => {
    it("moves-with-j2: mid-transition the stabilizer nodes match the linkage derived from the interpolated J2", async () => {
      const mock = makeMockScene();
      const rig = await mountInTransition(mock);

      mock.frame(400);

      const renderedJ2 = Angle.FromRadians(rig.joints[1].rotation.z);
      expect(renderedJ2.radians).not.toBe(POSE_A.j2.radians);
      expect(renderedJ2.radians).not.toBe(POSE_B.j2.radians);

      const expected = calcStabilizer(renderedJ2);
      expect(rig.stabRot.rotation.z).toBeCloseTo(expected.angle.radians, 10);
      expect(rig.stabPrismatic.position.z).toBeCloseTo(expected.extension, 10);
    });

    it("arrives-with-j2: on the frame J2 reaches its target the stabilizer holds the VM's derived values exactly", async () => {
      const mock = makeMockScene();
      const rig = await mountInTransition(mock);
      const target = makeVM(POSE_B);

      mock.frame(1000);

      expect(rig.joints[1].rotation.z).toBe(POSE_B.j2.radians);
      expect(rig.stabRot.rotation.z).toBe(target.stabilizerAngle.radians);
      expect(rig.stabPrismatic.position.z).toBe(target.stabilizerExtension);
    });
  });

  // ── story-3: retarget mid-transition ──────────────────────────────────

  describe("story-3: a pose commanded mid-transition redirects from the current position", () => {
    it("starts-from-current: the redirect begins at the rendered angles, not the superseded target", async () => {
      const mock = makeMockScene();
      const rig = await mountInTransition(mock);
      const j1 = rig.joints[0];

      mock.frame(500);
      const midway = j1.rotation.z;
      expect(progress(midway, POSE_A.j1, POSE_B.j1)).toBeCloseTo(0.5, 6);

      rig.pm.doUpdateView(makeVM(POSE_C));

      // No frame yet: nothing moves on the command itself.
      expect(j1.rotation.z).toBe(midway);

      // Halfway through the new transition we are halfway from midway to C.
      mock.frame(500);
      const fromMidway = (j1.rotation.z - midway) / (POSE_C.j1.radians - midway);
      expect(fromMidway).toBeCloseTo(0.5, 6);
    });

    it("full-duration: the redirected transition takes the full duration from the moment of the new command", async () => {
      const mock = makeMockScene();
      const rig = await mountInTransition(mock);
      const j1 = rig.joints[0];

      mock.frame(500);
      rig.pm.doUpdateView(makeVM(POSE_C));

      mock.frame(500); // 500 of the new 1000 elapsed
      expect(j1.rotation.z).not.toBe(POSE_C.j1.radians);

      mock.frame(500); // 1000 of 1000
      expect(j1.rotation.z).toBe(POSE_C.j1.radians);
    });

    it("latest-wins: the superseded target is never visited", async () => {
      const mock = makeMockScene();
      const rig = await mountInTransition(mock);
      const j1 = rig.joints[0];

      mock.frame(300);
      rig.pm.doUpdateView(makeVM(POSE_C));

      const samples: number[] = [];
      for (let i = 0; i < 20; i++) {
        mock.frame(100);
        samples.push(j1.rotation.z);
      }

      expect(samples).not.toContain(POSE_B.j1.radians);
      expect(samples[samples.length - 1]).toBe(POSE_C.j1.radians);
    });
  });

  // ── story-4: independent instances ────────────────────────────────────

  it("story-4: each arm transitions independently with its own render observer", async () => {
    const mock = makeMockScene();
    const arm1 = await mountArm("arm-1", mock);
    const arm2 = await mountArm("arm-2", mock);
    expect(mock.observerCount()).toBe(2);

    arm1.pm.doUpdateView(makeVM(POSE_A));
    arm2.pm.doUpdateView(makeVM(POSE_A));
    arm1.pm.doUpdateView(makeVM(POSE_B));

    mock.frame(500);

    expect(arm1.joints[0].rotation.z).not.toBe(POSE_A.j1.radians);
    expect(arm2.joints[0].rotation.z).toBe(POSE_A.j1.radians);
  });

  // ── story-6 / story-7: duration and easing controls ───────────────────

  it("story-6 / default-easing: the default transition eases in and out rather than moving linearly", async () => {
    const mock = makeMockScene();
    const rig = await mountInTransition(mock);
    const j1 = rig.joints[0];

    mock.frame(100);
    const p = progress(j1.rotation.z, POSE_A.j1, POSE_B.j1);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(0.1);
  });

  describe("story-7: the transition duration controls pacing", () => {
    it("zero-disables: a zero duration renders the commanded pose immediately with no frames", async () => {
      const mock = makeMockScene();
      const rig = await mountArm("arm-1", mock);

      rig.pm.doUpdateView(makeVM({ ...POSE_A, transitionDurationMs: 0 }));
      rig.pm.doUpdateView(makeVM({ ...POSE_B, transitionDurationMs: 0 }));

      expect(rig.joints[0].rotation.z).toBe(POSE_B.j1.radians);
      expect(rig.joints[5].rotation.z).toBe(POSE_B.j6.radians);
      expect(rig.stabRot.rotation.z).toBe(calcStabilizer(POSE_B.j2).angle.radians);
    });

    it("applies-to-next: a duration-only VM neither retargets nor re-times the transition in flight; the next pose uses the new duration", async () => {
      const mock = makeMockScene();
      const rig = await mountInTransition(mock); // A -> B over 1000
      const j1 = rig.joints[0];

      mock.frame(500);
      const midway = j1.rotation.z;

      // Same joints as the in-flight target, new duration only.
      rig.pm.doUpdateView(makeVM({ ...POSE_B, transitionDurationMs: 200 }));

      expect(j1.rotation.z).toBe(midway);
      mock.frame(250); // 750 of the original 1000: still travelling
      expect(j1.rotation.z).not.toBe(midway);
      expect(j1.rotation.z).not.toBe(POSE_B.j1.radians);
      mock.frame(250); // 1000 of 1000: arrives on the original schedule
      expect(j1.rotation.z).toBe(POSE_B.j1.radians);

      // The next commanded pose runs at the new 200 ms duration.
      rig.pm.doUpdateView(makeVM({ ...POSE_C, transitionDurationMs: 200 }));
      mock.frame(100);
      expect(j1.rotation.z).not.toBe(POSE_C.j1.radians);
      mock.frame(100);
      expect(j1.rotation.z).toBe(POSE_C.j1.radians);
    });

    it("pre-load-honoured: a duration carried by the VM before meshes bind governs the first transition after they attach", async () => {
      const mock = makeMockScene();
      const appObject = appObjects.getOrCreate("arm-1");
      makeABB6700Entity(appObject);
      const pm = makePassThroughPM(appObject);
      vi.mocked(BabylonEntity.get).mockReturnValue({ scene: mock.scene } as never);
      const view = await makeABB6700BabylonView(appObject);

      pm.doUpdateView(makeVM({ ...POSE_A, transitionDurationMs: 400 }));

      const j1 = makeMesh("joint_1");
      callBindMeshes(view, [j1]);
      expect(j1.rotation.z).toBe(POSE_A.j1.radians);

      pm.doUpdateView(makeVM({ ...POSE_B, transitionDurationMs: 400 }));
      mock.frame(200);
      expect(j1.rotation.z).not.toBe(POSE_B.j1.radians);
      mock.frame(200);
      expect(j1.rotation.z).toBe(POSE_B.j1.radians);
    });
  });

  // ── story-9: destroy mid-transition ───────────────────────────────────

  it("story-9: disposing the view mid-transition removes its render observer and stops all node writes", async () => {
    const mock = makeMockScene();
    const rig = await mountInTransition(mock);
    const j1 = rig.joints[0];

    mock.frame(300);
    const frozen = j1.rotation.z;
    expect(mock.observerCount()).toBe(1);

    rig.view.dispose();

    expect(mock.observerCount()).toBe(0);
    expect(() => mock.frame(300)).not.toThrow();
    expect(j1.rotation.z).toBe(frozen);
  });

  // ── story-10: remount snaps ───────────────────────────────────────────

  describe("story-10: a remounted view comes up directly in the current pose", () => {
    it("rebinding meshes mid-transition snaps the new nodes to the commanded pose with no transition", async () => {
      const mock = makeMockScene();
      const rig = await mountInTransition(mock);

      mock.frame(300);

      const freshJ1 = makeMesh("joint_1");
      const freshStab = makeNode("stabilizer_joint_1");
      callBindMeshes(rig.view, [freshJ1], [freshStab]);

      expect(freshJ1.rotation.z).toBe(POSE_B.j1.radians);
      expect(freshStab.rotation.z).toBe(calcStabilizer(POSE_B.j2).angle.radians);
      mock.frame(16);
      expect(freshJ1.rotation.z).toBe(POSE_B.j1.radians);
    });

    it("loading into a new scene moves the single render observer from the old scene to the new one", async () => {
      const first = makeMockScene();
      const rig = await mountInTransition(first);
      expect(first.observerCount()).toBe(1);

      const second = makeMockScene();
      vi.mocked(BabylonEntity.get).mockReturnValue({ scene: second.scene } as never);
      await rig.view.load();

      expect(first.observerCount()).toBe(0);
      expect(second.observerCount()).toBe(1);
    });
  });
});
