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
