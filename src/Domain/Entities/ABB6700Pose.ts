import type { Angle } from "@vived/core";

/** All six joint angles of an ABB 6700, applied as one pose. */
export interface ABB6700Pose {
  j1: Angle;
  j2: Angle;
  j3: Angle;
  j4: Angle;
  j5: Angle;
  j6: Angle;
}
