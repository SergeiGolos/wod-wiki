import { RuntimeBlock } from "./RuntimeBlock";
import { ElapsedState } from "./ElapsedState";


export interface IDurationHandler {
  elapsed(timestamp: Date, block: RuntimeBlock): ElapsedState;
  getDuration(block: RuntimeBlock): number;
}
