import type { ABB6700VM } from "../PMs/ABB6700PM";
import type { ABB6700State } from "./ABB6700State";

export interface SmartComponent {
  readonly id: string;
  readonly interfaceVersion: number;
  onEvent(event: string, cb: (...args: never[]) => void): () => void;
  onViewModel(cb: (vm: ABB6700VM) => void): () => void;
  load(variant?: string): Promise<void>;
  destroy(): void;
  getState(): ABB6700State;
  applyState(state: ABB6700State): void;
}
