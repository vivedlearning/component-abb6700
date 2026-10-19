import { InspectableType, Scene } from "@babylonjs/core";
import { Angle, AppObjectRepo } from "@vived/core";
import {
  ABB6700Entity,
  SetJointAngleUC,
  aBB6700PMAdapter,
  onPathCompleted,
  onPathSegmentReached,
  onPathStopped,
  playPath,
  stopPath,
  type ABB6700Joint,
  type ABB6700PathSegment,
  type ABB6700Pose,
} from "../src";
import { setJointAngle } from "../src/Domain/Controllers/setJointAngle";
import { setPose } from "../src/Domain/Controllers/setPose";

export function setupInspector(
  instanceId: string,
  scene: Scene,
  appObjects: AppObjectRepo,
): void {
  const uc = SetJointAngleUC.getById(instanceId, appObjects);
  const entity = ABB6700Entity.getById(instanceId, appObjects);

  if (!uc || !entity) return;

  const deg = Angle.FromDegrees;

  const POSES: Record<string, ABB6700Pose> = {
    home: {
      j1: deg(0),
      j2: deg(0),
      j3: deg(0),
      j4: deg(0),
      j5: deg(0),
      j6: deg(0),
    },
    reachForward: {
      j1: deg(0),
      j2: deg(-45),
      j3: deg(45),
      j4: deg(0),
      j5: deg(30),
      j6: deg(0),
    },
    reachUp: {
      j1: deg(0),
      j2: deg(-90),
      j3: deg(0),
      j4: deg(0),
      j5: deg(0),
      j6: deg(0),
    },
    lowPick: {
      j1: deg(0),
      j2: deg(20),
      j3: deg(-30),
      j4: deg(0),
      j5: deg(80),
      j6: deg(0),
    },
  };

  // A spot weld demo: home, approach, three spots a few degrees apart with a
  // dwell on each, retract, home.
  const spot = (dj1: number, dj2: number): ABB6700Pose => ({
    ...POSES.reachForward,
    j1: deg(POSES.reachForward.j1.degrees + dj1),
    j2: deg(POSES.reachForward.j2.degrees + dj2),
  });
  const weldPath: ABB6700PathSegment[] = [
    { pose: POSES.home, durationMs: 800 },
    { pose: POSES.reachForward, durationMs: 1500 },
    { pose: spot(-3, 0), durationMs: 600, dwellMs: 1000 },
    { pose: spot(0, 2), durationMs: 400, dwellMs: 1000 },
    { pose: spot(3, 0), durationMs: 400, dwellMs: 1000 },
    { pose: POSES.reachUp, durationMs: 1200 },
    { pose: POSES.home, durationMs: 1500 },
  ];

  // The path events carry no payload: read where the path is from the VM.
  let segmentIndex: number | undefined;
  aBB6700PMAdapter.subscribe(instanceId, appObjects, (vm) => {
    segmentIndex = vm.path?.segmentIndex;
  });
  onPathSegmentReached(instanceId, appObjects, () =>
    console.log("path segment reached", { segmentIndex }),
  );
  onPathCompleted(instanceId, appObjects, () =>
    console.log("path completed", { segmentIndex }),
  );
  onPathStopped(instanceId, appObjects, () =>
    console.log("path stopped", { segmentIndex }),
  );

  const joints = ["j1", "j2", "j3", "j4", "j5", "j6"] as const;

  for (const joint of joints) {
    Object.defineProperty(scene, `abb6700_${joint}`, {
      configurable: true,
      enumerable: true,
      get: () => entity[joint].degrees,
      set: (deg: number) => {
        setJointAngle(
          instanceId,
          joint as ABB6700Joint,
          Angle.FromDegrees(deg),
          appObjects,
          // A slider drag is direct manipulation: snap each tick instead of
          // starting a new transition, so the arm tracks the slider exactly.
          { transition: "none" },
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
    {
      label: "Poses",
      propertyName: "abb6700_poses_tab",
      type: InspectableType.Tab,
    },
    {
      label: "Home",
      propertyName: "abb6700_pose_home",
      type: InspectableType.Button,
      callback: () => setPose(instanceId, POSES.home, appObjects),
    },
    {
      label: "Reach Forward",
      propertyName: "abb6700_pose_reach_forward",
      type: InspectableType.Button,
      callback: () => setPose(instanceId, POSES.reachForward, appObjects),
    },
    {
      label: "Reach Up",
      propertyName: "abb6700_pose_reach_up",
      type: InspectableType.Button,
      callback: () => setPose(instanceId, POSES.reachUp, appObjects),
    },
    {
      label: "Low Pick",
      propertyName: "abb6700_pose_low_pick",
      type: InspectableType.Button,
      callback: () => setPose(instanceId, POSES.lowPick, appObjects),
    },
    {
      label: "Play weld path",
      propertyName: "abb6700_path_play_weld",
      type: InspectableType.Button,
      callback: () => playPath(instanceId, weldPath, appObjects),
    },
    {
      label: "Stop path (0.4 s)",
      propertyName: "abb6700_path_stop",
      type: InspectableType.Button,
      callback: () => stopPath(instanceId, appObjects, { durationMs: 400 }),
    },
  ];
}
