import { IRuntimeAction } from "./IRuntimeAction";
import { RuntimeBlock } from "./RuntimeBlock";
import { TimerRuntime } from "./timer.runtime";

export interface IRuntimeHandler {
  type: string;
  onTimerEvent(timestamp: Date, event: string, blocks?: TimerRuntime): IRuntimeAction[];
}
