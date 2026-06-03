import { AppObjectRepo } from "@vived/core";
import {
  ArcRotateCamera,
  Color4,
  CubeTexture,
  Engine,
  HemisphericLight,
  Scene,
  Vector3,
} from "@babylonjs/core";
import { BabylonEntity, makeBabylonEntity } from "@vived/app";

export function setupBabylon(
  canvas: HTMLCanvasElement,
  appObjects: AppObjectRepo,
): {
  engine: Engine;
  scene: Scene;
} {
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

  const envTexture = CubeTexture.CreateFromPrefilteredData(
    "/studio.env",
    scene,
  );
  scene.environmentTexture = envTexture;

  const mainLight = new HemisphericLight(
    "mainLight",
    new Vector3(0, 1, 0),
    scene,
  );
  mainLight.intensity = 0.6;

  // Register the scene on BabylonEntity so components can resolve it
  const babylonAppObject = appObjects.getOrCreate("BabylonEntity");
  const babylonEntity = makeBabylonEntity(babylonAppObject);
  babylonEntity.scene = scene;
  babylonEntity.engine = engine;

  return { engine, scene };
}
