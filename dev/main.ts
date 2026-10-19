import "@babylonjs/inspector";
import { Angle, makeAppObjectRepo, makeDomainFactoryRepo } from "@vived/core";
import type { TransformNode } from "@babylonjs/core";
import {
  ABB6700BabylonView,
  aBB6700PMAdapter,
  createBabylonABB6700,
  makeABB6700FeatureFactory,
  playPath,
  setPose,
  stopPath,
  type ABB6700PathVM,
  type ABB6700Pose,
  type ABB6700TransitionOption,
} from "../src";
import { makeDevGetAssetBlobURLUC } from "./DevGetAssetBlobURLUC";
import { setupBabylon } from "./setupBabylon";
import { setupInspector } from "./setupInspector";

const INSTANCE_ID = "dev-aBB6700-1";

const canvas = document.getElementById(
  "renderCanvas",
) as HTMLCanvasElement | null;

if (!canvas) {
  throw new Error("Missing required playground DOM elements");
}

// ─── Domain Setup ────────────────────────────────────────────────────────────

const appObjects = makeAppObjectRepo();
const domainFactoryRepo = makeDomainFactoryRepo(appObjects);
makeABB6700FeatureFactory(appObjects);
domainFactoryRepo.setupDomain();

makeDevGetAssetBlobURLUC(appObjects);

// ─── Babylon.js Scene Setup ────────────────────────────────────────────────────

let { engine, scene } = setupBabylon(canvas, appObjects);

// ─── Create Component Instance with Babylon View ─────────────────────────────

const instanceAO = await createBabylonABB6700(INSTANCE_ID, appObjects);
if (!instanceAO) {
  throw new Error("Unable to create ABB6700 instance");
}

// ─── Inspector Sliders ───────────────────────────────────────────────────────

setupInspector(INSTANCE_ID, scene, appObjects);

// ─── Inspector & Render Loop ─────────────────────────────────────────────────

await scene.debugLayer.show();

engine.runRenderLoop(() => {
  scene.render();
});

// ─── Dev-only: reproduce a Host remount ──────────────────────────────────────
//
// A Host mounts the app more than once per page life. Each mount is a new
// engine and scene while this module (and any module-level cache) lives on.
// `window.__abb6700Playground.remount()` does the same here, so a cache that
// is not scene-scoped shows up as an arm that fails to render after remount.

function renderableMeshCount(): number {
  return scene.meshes.filter((m) => m.getTotalVertices() > 0).length;
}

/** What the live engine and scene are doing right now. */
function renderStats() {
  return {
    frameId: engine.frameId,
    meshesInScene: renderableMeshCount(),
    activeMeshes: scene.getActiveMeshes().length,
    armRootScene: (() => {
      const view = ABB6700BabylonView.get(instanceAO!);
      const root = view?.rootTransformNode;
      return root ? (root.getScene() === scene ? "live" : "stale") : "none";
    })(),
  };
}

/**
 * The inspector is not re-shown after a remount: its UI does not survive the
 * scene it was attached to being disposed. The remounted arm renders in the
 * bare canvas, which is what this hook is for.
 */
async function remount(): Promise<ReturnType<typeof renderStats>> {
  const view = ABB6700BabylonView.get(instanceAO!);
  if (!view) {
    throw new Error("ABB6700BabylonView missing on remount");
  }

  engine.stopRenderLoop();
  scene.debugLayer.hide();
  scene.dispose();
  engine.dispose();

  ({ engine, scene } = setupBabylon(canvas!, appObjects));

  await view.load();

  engine.runRenderLoop(() => {
    scene.render();
  });

  return renderStats();
}

/**
 * Renders one frame synchronously and reports what it drew. Independent of
 * requestAnimationFrame, which a hidden tab does not tick.
 */
function renderOnce() {
  scene.render();
  return renderStats();
}

/**
 * Dev-only: command a pose in degrees, and read back what the view has
 * actually written to the joint nodes (the rendered pose, not the target).
 */
type PoseDegrees = { j1: number; j2: number; j3: number; j4: number; j5: number; j6: number };

function poseFromDegrees(deg: PoseDegrees): ABB6700Pose {
  return {
    j1: Angle.FromDegrees(deg.j1),
    j2: Angle.FromDegrees(deg.j2),
    j3: Angle.FromDegrees(deg.j3),
    j4: Angle.FromDegrees(deg.j4),
    j5: Angle.FromDegrees(deg.j5),
    j6: Angle.FromDegrees(deg.j6),
  };
}

function setPoseDegrees(
  deg: PoseDegrees,
  options?: ABB6700TransitionOption,
): void {
  setPose(INSTANCE_ID, poseFromDegrees(deg), appObjects, options);
}

/** Dev-only: play a path of poses in degrees (the render loop is its clock). */
function playPathDegrees(
  segments: { pose: PoseDegrees; durationMs: number; dwellMs?: number }[],
): void {
  playPath(
    INSTANCE_ID,
    segments.map(({ pose, ...timing }) => ({
      pose: poseFromDegrees(pose),
      ...timing,
    })),
    appObjects,
  );
}

/** Dev-only: stop the path in flight; the default stop duration when omitted. */
function stopPlaygroundPath(durationMs?: number): void {
  stopPath(INSTANCE_ID, appObjects, { durationMs });
}

/** Dev-only: the latest path VM, or undefined when no path is in progress. */
let latestPathVM: ABB6700PathVM | undefined;
aBB6700PMAdapter.subscribe(INSTANCE_ID, appObjects, (vm) => {
  latestPathVM = vm.path;
});

function pathVM(): ABB6700PathVM | undefined {
  return latestPathVM;
}

function renderedJointDegrees(): PoseDegrees & { frameId: number } {
  const view = ABB6700BabylonView.get(instanceAO!);
  const z = (id: string): number => {
    const node = view?.nodesByObjectId.get(id) as TransformNode | undefined;
    return ((node?.rotation.z ?? NaN) * 180) / Math.PI;
  };
  return {
    j1: z("joint_1"),
    j2: z("joint_2"),
    j3: z("joint_3"),
    j4: z("joint_4"),
    j5: z("joint_5"),
    j6: z("joint_6"),
    frameId: engine.frameId,
  };
}

declare global {
  interface Window {
    __abb6700Playground: {
      remount: typeof remount;
      renderStats: typeof renderStats;
      renderOnce: typeof renderOnce;
      setPoseDegrees: typeof setPoseDegrees;
      renderedJointDegrees: typeof renderedJointDegrees;
      playPathDegrees: typeof playPathDegrees;
      stopPath: typeof stopPlaygroundPath;
      pathVM: typeof pathVM;
    };
  }
}

window.__abb6700Playground = {
  remount,
  renderStats,
  renderOnce,
  setPoseDegrees,
  renderedJointDegrees,
  playPathDegrees,
  stopPath: stopPlaygroundPath,
  pathVM,
};
