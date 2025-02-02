import { RuntimeBlock } from "./RuntimeBlock";
import { ElapsedState } from "./ElapsedState";
import { TimerEvent } from "./timer.runtime";


export interface IDurationHandler {
  elapsed(timestamp: Date, block: RuntimeBlock, events : TimerEvent[]): ElapsedState;
  getDuration(block: RuntimeBlock): number;
}
