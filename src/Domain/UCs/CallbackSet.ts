/**
 * The payload-free callbacks subscribed to one event (the canon's callback-set
 * UC variant). `notify` calls a copy of the set, so a callback may unsubscribe
 * while it is being notified, and it isolates each callback: one that throws is
 * reported through `reportError` and the rest still run. Path events are
 * announced from inside the Babylon render loop (ADR-0007), where an uncaught
 * throw would stop the engine's frames.
 */
export class CallbackSet {
  private readonly callbacks = new Set<() => void>();

  constructor(
    private readonly event: string,
    private readonly reportError: (message: string) => void,
  ) {}

  subscribe(cb: () => void): () => void {
    this.callbacks.add(cb);
    return () => {
      this.callbacks.delete(cb);
    };
  }

  notify(): void {
    [...this.callbacks].forEach((cb) => {
      try {
        cb();
      } catch (e) {
        this.reportError(`A ${this.event} callback threw: ${String(e)}`);
      }
    });
  }
}
