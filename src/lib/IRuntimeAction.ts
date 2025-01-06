import { RuntimeBlock } from "./RuntimeBlock";
import { TimerRuntime } from "./timer.runtime";



export interface IRuntimeAction {
  apply(blocks: TimerRuntime): [RuntimeBlock | undefined, number] ;
}
