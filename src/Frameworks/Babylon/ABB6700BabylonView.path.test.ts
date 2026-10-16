import { describe, it, expect, beforeEach, vi } from "vitest";
import { Angle } from "@vived/core";
import type { ABB6700VM } from "../../Domain/PMs/ABB6700PM";
import type { ABB6700Pose } from "../../Domain/UCs/SetPoseUC";
import type { ABB6700PathSegment } from "../../Domain/Entities/ABB6700Path";

/**
 * Path-playback contract for ABB6700BabylonView (PRD: path-playback, the
 * view-only rows; ADR-0007: the view's render loop is the path's clock).
 *
 * The view is driven by the real domain through a facade, so its reports
 * (segment reached, dwell ended, rested at) reach the use cases and come back
 * as VMs and events. Time is driven by a mock scene whose
 * onBeforeRenderObservable the test fires by hand, with the engine's delta
 * time set per frame. Joint angles are read off the Babylon joint nodes.
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
import { makeDomainForTesting } from "../../Domain/makeDomainForTesting";
import { ABB6700Facade } from "../../ABB6700Facade";
import { aBB6700PMAdapter } from "../../Domain/Adapters/aBB6700PMAdapter";

// ── Mock scene with a hand-driven render loop ─────────────────────────────

type RenderCallback = (eventData: unknown, eventState: unknown) => void;

interface MockScene {
  /** The object handed to the view as the Babylon Scene. */
  scene: never;
  /** Advance one frame with the given delta time (ms). */
  frame(deltaMs: number): void;
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

function pose(
  j1: number,
  j2: number,
  j3: number,
  j4: number,
  j5: number,
  j6: number,
): ABB6700Pose {
  return {
    j1: Angle.FromDegrees(j1),
    j2: Angle.FromDegrees(j2),
    j3: Angle.FromDegrees(j3),
    j4: Angle.FromDegrees(j4),
    j5: Angle.FromDegrees(j5),
    j6: Angle.FromDegrees(j6),
  };
}

/** The entity default: every joint at 0°. */
const POSE_A = pose(0, 0, 0, 0, 0, 0);
const POSE_B = pose(90, 40, -30, 60, -45, 120);
const POSE_C = pose(-60, 10, 20, -20, 30, -90);

function seg(
  target: ABB6700Pose,
  durationMs: number,
  dwellMs?: number,
): ABB6700PathSegment {
  return dwellMs === undefined
    ? { pose: target, durationMs }
    : { pose: target, durationMs, dwellMs };
}

function radiansOf(p: ABB6700Pose): number[] {
  return [p.j1, p.j2, p.j3, p.j4, p.j5, p.j6].map((a) => a.radians);
}

/** Fraction of the way from `a` to `b` that `value` sits, in radians. */
function progress(value: number, a: Angle, b: Angle): number {
  return (value - a.radians) / (b.radians - a.radians);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function expectAt(joints: AbstractMesh[], p: ABB6700Pose): void {
  const targets = radiansOf(p);
  joints.forEach((node, i) => expect(node.rotation.z).toBe(targets[i]));
}

function rendered(joints: AbstractMesh[]): number[] {
  return joints.map((node) => node.rotation.z);
}

/** The facade's committed pose, in radians. */
function committed(facade: ABB6700Facade): number[] {
  const s = facade.getState();
  return [s.j1, s.j2, s.j3, s.j4, s.j5, s.j6].map((d) => (d * Math.PI) / 180);
}

function expectCommitted(facade: ABB6700Facade, radians: number[]): void {
  committed(facade).forEach((r, i) => expect(r).toBeCloseTo(radians[i], 9));
}

interface PathRig {
  facade: ABB6700Facade;
  view: ABB6700BabylonView;
  joints: AbstractMesh[];
  stabRot: TransformNode;
  stabPrismatic: TransformNode;
  /** "reached:<segmentIndex>", "completed", "stopped" — in order. */
  events: string[];
  vm(): ABB6700VM | undefined;
}

/** The domain and its facade, with VM and event recorders; no view yet. */
function makeArm(id = "arm-1") {
  const domain = makeDomainForTesting();
  const facade = new ABB6700Facade(id, domain.appObjects);

  let latest: ABB6700VM | undefined;
  aBB6700PMAdapter.subscribe(id, domain.appObjects, (v) => {
    latest = v;
  });
  const vm = () => latest;

  const events: string[] = [];
  facade.onEvent("pathSegmentReached", () =>
    events.push(`reached:${vm()?.path?.segmentIndex}`),
  );
  facade.onEvent("pathCompleted", () => events.push("completed"));
  facade.onEvent("pathStopped", () => events.push("stopped"));

  return { domain, facade, events, vm };
}

/** Attach the view to `mock`, then bind a fresh six-joint rig to it. */
async function attachView(
  arm: ReturnType<typeof makeArm>,
  mock: MockScene,
  id = "arm-1",
): Promise<PathRig> {
  const appObject = arm.domain.appObjects.get(id)!;
  vi.mocked(BabylonEntity.get).mockReturnValue({ scene: mock.scene } as never);
  const view = await makeABB6700BabylonView(appObject);
  const joints = [1, 2, 3, 4, 5, 6].map((n) => makeMesh(`joint_${n}`));
  const stabRot = makeNode("stabilizer_joint_1");
  const stabPrismatic = makeNode("stabilizer_joint_2");
  callBindMeshes(view, joints, [stabRot, stabPrismatic]);
  return {
    facade: arm.facade,
    view,
    joints,
    stabRot,
    stabPrismatic,
    events: arm.events,
    vm: arm.vm,
  };
}

async function mountPathArm(mock: MockScene): Promise<PathRig> {
  return attachView(makeArm(), mock);
}

/** Remount: reload the view into a fresh scene and bind fresh nodes. */
async function remount(rig: PathRig): Promise<MockScene> {
  const second = makeMockScene();
  vi.mocked(BabylonEntity.get).mockReturnValue({
    scene: second.scene,
  } as never);
  await rig.view.load();
  rig.joints = [1, 2, 3, 4, 5, 6].map((n) => makeMesh(`joint_${n}`));
  rig.stabRot = makeNode("stabilizer_joint_1");
  rig.stabPrismatic = makeNode("stabilizer_joint_2");
  callBindMeshes(rig.view, rig.joints, [rig.stabRot, rig.stabPrismatic]);
  return second;
}

function expectStabilizerFollowsJ2(rig: PathRig): void {
  const stab = calcStabilizer(Angle.FromRadians(rig.joints[1].rotation.z));
  expect(rig.stabRot.rotation.z).toBeCloseTo(stab.angle.radians, 12);
  expect(rig.stabPrismatic.position.z).toBeCloseTo(stab.extension, 12);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("ABB6700BabylonView path playback", () => {
  beforeEach(() => {
    clearABB6700AssetCache();
  });

  describe("story-5: the travel times and dwells handed in are honoured as given", () => {
    it("travel-time: a segment takes its own travel time, whatever transition duration is set", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);
      rig.facade.setTransitionDuration(5000);

      rig.facade.playPath([seg(POSE_B, 400)]);

      mock.frame(200);
      expect(progress(rig.joints[0].rotation.z, POSE_A.j1, POSE_B.j1)).toBeCloseTo(0.5, 6);
      mock.frame(199);
      expect(rig.events).toEqual([]);
      mock.frame(1);
      expectAt(rig.joints, POSE_B);
      expect(rig.events).toEqual(["reached:0", "completed"]);
    });

    it("dwell: the arm holds still at a segment's pose for its dwell before the next segment starts", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);

      rig.facade.playPath([seg(POSE_B, 400, 1000), seg(POSE_C, 400)]);

      mock.frame(400);
      expect(rig.events).toEqual(["reached:0"]);
      expectAt(rig.joints, POSE_B);

      mock.frame(500);
      mock.frame(499);
      expectAt(rig.joints, POSE_B);
      expect(rig.vm()?.path).toMatchObject({ segmentIndex: 0, phase: "dwelling" });

      mock.frame(1);
      expect(rig.vm()?.path).toMatchObject({ segmentIndex: 1, phase: "moving" });
      expectAt(rig.joints, POSE_B);

      mock.frame(200);
      expect(progress(rig.joints[0].rotation.z, POSE_B.j1, POSE_C.j1)).toBeCloseTo(0.5, 6);
      mock.frame(200);
      expectAt(rig.joints, POSE_C);
      expect(rig.events).toEqual(["reached:0", "reached:1", "completed"]);
    });

    it("same-pose: a segment whose pose equals the one before it still takes its travel time", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);

      rig.facade.playPath([seg(POSE_A, 400)]);

      mock.frame(399);
      expect(rig.events).toEqual([]);
      mock.frame(1);
      expect(rig.events).toEqual(["reached:0", "completed"]);
      expectAt(rig.joints, POSE_A);
    });

    it("zero-travel: a segment with a travel time of zero snaps to its pose on the next frame", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);

      rig.facade.playPath([seg(POSE_B, 0)]);

      mock.frame(16);
      expectAt(rig.joints, POSE_B);
      expect(rig.events).toEqual(["reached:0", "completed"]);
    });

    it("overrun: a long frame carries its overrun into the next segment instead of dropping it", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);

      rig.facade.playPath([seg(POSE_B, 400), seg(POSE_C, 400)]);

      mock.frame(600); // 200 ms past segment 0
      expect(rig.events).toEqual(["reached:0"]);
      mock.frame(100); // 300 ms into segment 1
      expect(progress(rig.joints[0].rotation.z, POSE_B.j1, POSE_C.j1)).toBeCloseTo(
        smoothstep(300 / 400),
        6,
      );
    });
  });

  describe("story-7: the arm moves through a path as one continuous motion", () => {
    it("from-screen: the first segment starts from the angles on screen, even mid-transition", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);
      rig.facade.setPose(POSE_B); // 1000 ms transition from A
      mock.frame(500);
      const mid = rendered(rig.joints);

      rig.facade.playPath([seg(POSE_C, 600)]);

      mock.frame(1);
      rig.joints.forEach((node, i) =>
        expect(Math.abs(node.rotation.z - mid[i])).toBeLessThan(0.01),
      );
      mock.frame(599);
      expectAt(rig.joints, POSE_C);
    });

    it("eased: each segment eases in and out between its two poses", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);

      rig.facade.playPath([seg(POSE_B, 800)]);

      mock.frame(200);
      const early = progress(rig.joints[0].rotation.z, POSE_A.j1, POSE_B.j1);
      expect(early).toBeGreaterThan(0);
      expect(early).toBeLessThan(0.25);
      mock.frame(200);
      expect(progress(rig.joints[0].rotation.z, POSE_A.j1, POSE_B.j1)).toBeCloseTo(0.5, 6);
      mock.frame(200);
      const late = progress(rig.joints[0].rotation.z, POSE_A.j1, POSE_B.j1);
      expect(late).toBeGreaterThan(0.75);
      expect(late).toBeLessThan(1);
    });

    it("exact: the arm arrives exactly on each segment's pose", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);

      rig.facade.playPath([seg(POSE_B, 400), seg(POSE_C, 400)]);

      mock.frame(400);
      expectAt(rig.joints, POSE_B);
      mock.frame(400);
      expectAt(rig.joints, POSE_C);
      mock.frame(100);
      expectAt(rig.joints, POSE_C);
    });

    it("stabilizer: the stabilizer linkage stays attached throughout", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);

      rig.facade.playPath([seg(POSE_B, 1000)]);

      mock.frame(300);
      expectStabilizerFollowsJ2(rig);
      mock.frame(700);
      expect(rig.stabRot.rotation.z).toBeCloseTo(calcStabilizer(POSE_B.j2).angle.radians, 12);
    });
  });

  describe("story-10: a stopped arm slows to rest from where it is on screen", () => {
    it("decelerates: the arm slows from its on-screen speed and comes to rest within the stop duration", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);
      rig.facade.playPath([seg(POSE_B, 1000), seg(POSE_C, 1000)]);
      mock.frame(500); // full speed, halfway to B

      rig.facade.stopPath({ durationMs: 400 });

      const steps: number[] = [];
      let prev = rig.joints[0].rotation.z;
      for (let k = 0; k < 4; k++) {
        mock.frame(100);
        steps.push(rig.joints[0].rotation.z - prev);
        prev = rig.joints[0].rotation.z;
      }
      expect(steps[0]).toBeGreaterThan(0); // still heading for B
      for (let k = 1; k < steps.length; k++) {
        expect(steps[k]).toBeLessThan(steps[k - 1]); // slower every frame
      }
      expect(rig.events).toEqual(["stopped"]);

      const rest = rendered(rig.joints);
      mock.frame(100);
      rig.joints.forEach((node, i) => expect(node.rotation.z).toBe(rest[i]));
      expectCommitted(rig.facade, rest);
      expect(rig.vm()?.path).toBeUndefined();
    });

    it("on-segment: the arm slows along its current segment and never passes the segment's pose", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);
      const targets = radiansOf(POSE_B);
      rig.facade.playPath([seg(POSE_B, 400), seg(POSE_C, 400)]);
      mock.frame(300); // late in the segment, still moving

      rig.facade.stopPath({ durationMs: 2000 }); // long enough to overshoot unchecked

      for (let k = 0; k < 25; k++) {
        mock.frame(100);
        const p0 = rig.joints[0].rotation.z / targets[0]; // A is all zeros
        expect(p0).toBeLessThanOrEqual(1 + 1e-12);
        rig.joints.forEach((node, i) =>
          expect(node.rotation.z / targets[i]).toBeCloseTo(p0, 9),
        );
      }
      expect(rig.events).toEqual(["stopped"]);
      expectCommitted(rig.facade, rendered(rig.joints));
    });

    it("at-rest (dwell): an arm in a dwell stops where it is", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);
      rig.facade.playPath([seg(POSE_B, 400, 1000), seg(POSE_C, 400)]);
      mock.frame(400);
      mock.frame(300);

      rig.facade.stopPath();

      mock.frame(16);
      expect(rig.events).toEqual(["reached:0", "stopped"]);
      expectAt(rig.joints, POSE_B);
      expectCommitted(rig.facade, radiansOf(POSE_B));
      mock.frame(2000);
      expectAt(rig.joints, POSE_B);
    });

    it("at-rest (segment start): an arm at the very start of a segment stops where it is", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);
      rig.facade.playPath([seg(POSE_B, 1000)]);

      rig.facade.stopPath();

      mock.frame(16);
      expect(rig.events).toEqual(["stopped"]);
      expectAt(rig.joints, POSE_A);
      expectCommitted(rig.facade, radiansOf(POSE_A));
    });

    it("stabilizer: the stabilizer linkage stays attached while the arm slows", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);
      rig.facade.playPath([seg(POSE_B, 1000)]);
      mock.frame(500);

      rig.facade.stopPath({ durationMs: 400 });

      mock.frame(100);
      expectStabilizerFollowsJ2(rig);
      mock.frame(300);
      expectStabilizerFollowsJ2(rig);
    });
  });

  describe("story-12: the stop duration", () => {
    it("zero: a stop duration of zero stops the arm where it is", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);
      rig.facade.playPath([seg(POSE_B, 1000)]);
      mock.frame(500);
      const at = rendered(rig.joints);

      rig.facade.stopPath({ durationMs: 0 });

      mock.frame(16);
      expect(rig.events).toEqual(["stopped"]);
      rig.joints.forEach((node, i) => expect(node.rotation.z).toBe(at[i]));
      expectCommitted(rig.facade, at);
    });
  });

  describe("story-14: a pose command takes over from a running path", () => {
    it("set-pose: the arm transitions to the commanded pose from the angles on screen", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);
      rig.facade.playPath([seg(POSE_B, 1000), seg(POSE_A, 1000)]);
      mock.frame(500);
      const mid = rendered(rig.joints);

      rig.facade.setPose(POSE_C); // default 1000 ms transition

      mock.frame(1);
      rig.joints.forEach((node, i) =>
        expect(Math.abs(node.rotation.z - mid[i])).toBeLessThan(0.01),
      );
      mock.frame(999);
      expectAt(rig.joints, POSE_C);
      mock.frame(2000);
      expectAt(rig.joints, POSE_C);
      expect(rig.events).toEqual([]);
    });

    it("snap: a snap mid-path lands the arm on the commanded pose at once and the path never resumes", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);
      rig.facade.playPath([seg(POSE_B, 1000), seg(POSE_A, 1000)]);
      mock.frame(500);

      rig.facade.setPose(POSE_C, { transition: "none" });

      expectAt(rig.joints, POSE_C);
      mock.frame(3000);
      expectAt(rig.joints, POSE_C);
      expect(rig.events).toEqual([]);
    });

    it("after a path: a pose command transitions over the transition duration as before", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);
      rig.facade.playPath([seg(POSE_B, 400)]);
      mock.frame(400);
      expect(rig.events).toEqual(["reached:0", "completed"]);

      rig.facade.setTransitionDuration(200);
      rig.facade.setPose(POSE_C);

      mock.frame(100);
      expect(progress(rig.joints[0].rotation.z, POSE_B.j1, POSE_C.j1)).toBeCloseTo(0.5, 6);
      mock.frame(100);
      expectAt(rig.joints, POSE_C);
    });
  });

  describe("story-15: a new path replaces the one in progress", () => {
    it("from-screen: the new path starts from the angles on screen", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);
      rig.facade.playPath([seg(POSE_B, 1000)]);
      mock.frame(500);
      const mid = rendered(rig.joints);

      rig.facade.playPath([seg(POSE_C, 1000)]);

      mock.frame(1);
      rig.joints.forEach((node, i) =>
        expect(Math.abs(node.rotation.z - mid[i])).toBeLessThan(0.01),
      );
      mock.frame(999);
      expectAt(rig.joints, POSE_C);
      expect(rig.events).toEqual(["reached:0", "completed"]);
    });
  });

  describe("story-17: a path requested before the view loads plays once it loads", () => {
    it("plays-on-load: the arm appears on the committed pose, that segment counts as reached, and the path plays on", async () => {
      const mock = makeMockScene();
      const arm = makeArm();
      arm.facade.playPath([seg(POSE_B, 1000, 500), seg(POSE_C, 400)]);

      const rig = await attachView(arm, mock);

      expectAt(rig.joints, POSE_B);
      expect(rig.events).toEqual([]);
      mock.frame(16);
      expect(rig.events).toEqual(["reached:0"]);
      expectAt(rig.joints, POSE_B);
      mock.frame(500);
      expect(rig.vm()?.path).toMatchObject({ segmentIndex: 1, phase: "moving" });
      mock.frame(400);
      expectAt(rig.joints, POSE_C);
      expect(rig.events).toEqual(["reached:0", "reached:1", "completed"]);
    });
  });

  describe("story-18: destroy or remount during a path ends cleanly", () => {
    it("remount (path): the arm appears on the committed pose and the path plays on", async () => {
      const first = makeMockScene();
      const rig = await mountPathArm(first);
      rig.facade.playPath([seg(POSE_B, 1000), seg(POSE_C, 400)]);
      first.frame(500);

      const second = await remount(rig);

      expectAt(rig.joints, POSE_B);
      first.frame(2000); // the old scene no longer drives the view
      expect(rig.events).toEqual([]);
      second.frame(16);
      expect(rig.events).toEqual(["reached:0"]);
      second.frame(400);
      expectAt(rig.joints, POSE_C);
      expect(rig.events).toEqual(["reached:0", "reached:1", "completed"]);
    });

    it("remount (stop): during a stop, the stop ends on the committed pose", async () => {
      const first = makeMockScene();
      const rig = await mountPathArm(first);
      rig.facade.playPath([seg(POSE_B, 1000)]);
      first.frame(500);
      rig.facade.stopPath();
      first.frame(100);
      expect(rig.events).toEqual([]);

      const second = await remount(rig);

      expectAt(rig.joints, POSE_B);
      second.frame(16);
      expect(rig.events).toEqual(["stopped"]);
      expectCommitted(rig.facade, radiansOf(POSE_B));
      expect(rig.vm()?.path).toBeUndefined();
    });

    it("destroy: destroy() mid-path never throws and no event fires afterwards", async () => {
      const mock = makeMockScene();
      const rig = await mountPathArm(mock);
      rig.facade.playPath([seg(POSE_B, 1000)]);
      mock.frame(100);

      rig.facade.destroy();

      expect(() => mock.frame(2000)).not.toThrow();
      expect(rig.events).toEqual([]);
    });
  });
});
