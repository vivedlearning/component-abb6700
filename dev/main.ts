import "@babylonjs/inspector";
import { makeAppObjectRepo, makeDomainFactoryRepo } from "@vived/core";
import { createBabylonABB6700, makeABB6700FeatureFactory } from "../src";
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

const { engine, scene } = setupBabylon(canvas, appObjects);

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
