import "@babylonjs/loaders/glTF";
import "@babylonjs/inspector";
import {
  ArcRotateCamera,
  Color4,
  Engine,
  HemisphericLight,
  Scene,
  SceneLoader,
  Vector3,
} from "@babylonjs/core";
import { makeAppObjectRepo, makeDomainFactoryRepo } from "@vived/core";
import { getAssetBlobURL } from "@vived/app";
import {
  ABB6700Repo,
  makeABB6700BabylonView,
  makeABB6700FeatureFactory,
  componentConfig,
} from "../src";
import { makeDevGetAssetBlobURLUC } from "./DevGetAssetBlobURLUC";

const INSTANCE_ID = "dev-aBB6700-1";

const canvas = document.getElementById(
  "renderCanvas",
) as HTMLCanvasElement | null;

if (!canvas) {
  throw new Error("Missing required playground DOM elements");
}

// ─── Babylon.js Scene Setup ────────────────────────────────────────────────────

const engine = new Engine(canvas, true);
const scene = new Scene(engine);
scene.clearColor = new Color4(0.18, 0.18, 0.2, 1);

const camera = new ArcRotateCamera(
  "camera",
  Math.PI / 2,
  Math.PI / 3,
  5,
  Vector3.Zero(),
  scene,
);
camera.attachControl(canvas, true);

const mainLight = new HemisphericLight(
  "mainLight",
  new Vector3(0, 1, 0),
  scene,
);
mainLight.intensity = 0.6;

// ─── Domain Setup ────────────────────────────────────────────────────────────

const appObjects = makeAppObjectRepo();
const domainFactoryRepo = makeDomainFactoryRepo(appObjects);
makeABB6700FeatureFactory(appObjects);
domainFactoryRepo.setupDomain();

makeDevGetAssetBlobURLUC(appObjects);

// ─── Create Component Instance ───────────────────────────────────────────────

const repo = ABB6700Repo.get(appObjects);
if (!repo) {
  throw new Error("Unable to initialize ABB6700Repo");
}
repo.createABB6700Entity(INSTANCE_ID);

const instanceAO = appObjects.getOrCreate(INSTANCE_ID);
const view = makeABB6700BabylonView(instanceAO);
await view.setupView();

// ─── Load 3D Asset ───────────────────────────────────────────────────────────

// TODO: Add your .glb file to the public/ directory and update component.config.ts
// with the asset ID. Then uncomment the lines below:
//
// const defaultAsset = componentConfig.assets[0];
// const blobURL = await getAssetBlobURL(defaultAsset.id, appObjects);
// const importResult = await SceneLoader.ImportMeshAsync(
//   "",
//   blobURL,
//   "",
//   scene,
//   undefined,
//   ".glb",
// );
// view.bindMeshes(importResult.meshes);

// ─── Inspector & Render Loop ─────────────────────────────────────────────────

await scene.debugLayer.show();

engine.runRenderLoop(() => {
  scene.render();
});
