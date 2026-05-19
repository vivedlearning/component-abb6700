import { InspectableType, Scene } from "@babylonjs/core";
import { Angle, AppObjectRepo } from "@vived/core";
import {
  ABB6700Entity,
  SetJointAngleUC,
  type ABB6700Joint,
  type ABB6700Pose,
} from "../src";
import { setJointAngle } from "../src/Controllers/setJointAngle";
import { setPose } from "../src/Controllers/setPose";

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
  ];
}
