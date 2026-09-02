export const ABB_6700_STATE_VERSION = 1;

/** Serializable facade state — persists only the six robot joints in degrees. */
export type ABB6700State = {
  version: number;
  j1: number;
  j2: number;
  j3: number;
  j4: number;
  j5: number;
  j6: number;
};

/** Event catalog for the facade. The ABB 6700 currently emits no events. */
export type ABB6700Events = Record<never, never>;

/** The default joint angle, in degrees, for a joint absent from a snapshot. */
export const ABB_6700_DEFAULT_JOINT_DEGREES = 0;

/**
 * The default state: all six joints at their entity default, tagged with the
 * supplied version (defaulting to the current schema version).
 */
export function defaultABB6700State(
  version: number = ABB_6700_STATE_VERSION,
): ABB6700State {
  return {
    version,
    j1: ABB_6700_DEFAULT_JOINT_DEGREES,
    j2: ABB_6700_DEFAULT_JOINT_DEGREES,
    j3: ABB_6700_DEFAULT_JOINT_DEGREES,
    j4: ABB_6700_DEFAULT_JOINT_DEGREES,
    j5: ABB_6700_DEFAULT_JOINT_DEGREES,
    j6: ABB_6700_DEFAULT_JOINT_DEGREES,
  };
}
