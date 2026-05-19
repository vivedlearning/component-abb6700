import "@babylonjs/inspector";
import { makeAppObjectRepo, makeDomainFactoryRepo } from "@vived/core";
import {
  ABB6700BabylonView,
  createABB6700,
  makeABB6700FeatureFactory,
  setupABB6700InstanceFactory,
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
setupABB6700InstanceFactory(appObjects);

makeDevGetAssetBlobURLUC(appObjects);

// ─── Babylon.js Scene Setup ────────────────────────────────────────────────────

const { engine, scene } = setupBabylon(canvas);

// ─── Create Component Instance ───────────────────────────────────────────────

const instanceAO = createABB6700(INSTANCE_ID, appObjects);
if (!instanceAO) {
  throw new Error("Unable to create ABB6700 instance");
}

const view = ABB6700BabylonView.get(instanceAO);
if (!view) {
  throw new Error("Unable to get ABB6700BabylonView");
}

// ─── Load 3D Asset ───────────────────────────────────────────────────────────

await view.load(scene);

// ─── Inspector Sliders ───────────────────────────────────────────────────────

setupInspector(INSTANCE_ID, scene, appObjects);

// ─── Inspector & Render Loop ─────────────────────────────────────────────────

await scene.debugLayer.show();

engine.runRenderLoop(() => {
  scene.render();
});
