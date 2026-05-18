// Vitest global setup for ABB 6700
// Polyfills requestAnimationFrame / cancelAnimationFrame for Node test environment.
// This enables vi.useFakeTimers() to intercept them in animation tests.

globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number =>
  setTimeout(() => cb(Date.now()), 0) as unknown as number;
globalThis.cancelAnimationFrame = (id: number): void => clearTimeout(id);
