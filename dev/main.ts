import "@babylonjs/loaders/glTF";
import "@babylonjs/inspector";
import {
  ArcRotateCamera,
  Color4,
  CubeTexture,
  Engine,
  HemisphericLight,
  InspectableType,
  Scene,
  SceneLoader,
  Vector3,
} from "@babylonjs/core";
import { Angle, makeAppObjectRepo, makeDomainFactoryRepo } from "@vived/core";
import { getAssetBlobURL } from "@vived/app";
import {
  ABB6700Entity,
  ABB6700Repo,
  SetJointAngleUC,
  makeABB6700BabylonView,
  makeABB6700FeatureFactory,
  componentConfig,
  type ABB6700Joint,
} from "../src";
import { setJointAngle } from "../src/Controllers/setJointAngle";
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
camera.wheelPrecision = 50;

const envTexture = CubeTexture.CreateFromPrefilteredData("/studio.env", scene);
scene.environmentTexture = envTexture;

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

const defaultAsset = componentConfig.assets[0];
const blobURL = await getAssetBlobURL(defaultAsset.id, appObjects);
const importResult = await SceneLoader.ImportMeshAsync(
  "",
  blobURL,
  "",
  scene,
  undefined,
  ".glb",
);
view.bindMeshes(importResult.meshes, importResult.transformNodes);

// ─── Inspector Sliders ───────────────────────────────────────────────────────

const uc = SetJointAngleUC.getById(INSTANCE_ID, appObjects);
const entity = ABB6700Entity.getById(INSTANCE_ID, appObjects);

if (uc && entity) {
  const joints = ["j1", "j2", "j3", "j4", "j5", "j6"] as const;

  for (const joint of joints) {
    Object.defineProperty(scene, `abb6700_${joint}`, {
      configurable: true,
      enumerable: true,
      get: () => entity[joint].degrees,
      set: (deg: number) => {
        setJointAngle(
          INSTANCE_ID,
          joint as ABB6700Joint,
          Angle.FromDegrees(deg),
          appObjects,
        );
      },
    });
  }

  (scene as unknown as Record<string, unknown>).inspectableCustomProperties = [
    {
      label: "ABB 6700 Joints",
      propertyName: "abb6700_joints_tab",
      type: InspectableType.Tab,
    },
    {
      label: "Joint 1",
      propertyName: "abb6700_j1",
      type: InspectableType.Slider,
      min: -180,
      max: 180,
      step: 1,
    },
    {
      label: "Joint 2",
      propertyName: "abb6700_j2",
      type: InspectableType.Slider,
      min: -180,
      max: 180,
      step: 1,
    },
    {
      label: "Joint 3",
      propertyName: "abb6700_j3",
      type: InspectableType.Slider,
      min: -180,
      max: 180,
      step: 1,
    },
    {
      label: "Joint 4",
      propertyName: "abb6700_j4",
      type: InspectableType.Slider,
      min: -180,
      max: 180,
      step: 1,
    },
    {
      label: "Joint 5",
      propertyName: "abb6700_j5",
      type: InspectableType.Slider,
      min: -180,
      max: 180,
      step: 1,
    },
    {
      label: "Joint 6",
      propertyName: "abb6700_j6",
      type: InspectableType.Slider,
      min: -180,
      max: 180,
      step: 1,
    },
  ];
}

// ─── Inspector & Render Loop ─────────────────────────────────────────────────

await scene.debugLayer.show();

engine.runRenderLoop(() => {
  scene.render();
});
