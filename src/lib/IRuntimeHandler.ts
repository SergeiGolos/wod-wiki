import { IRuntimeAction } from "./IRuntimeAction";
import { RuntimeBlock } from "./RuntimeBlock";

export interface IRuntimeHandler {
  type: string;
  onTimerEvent(timestamp: Date, event: string, block: RuntimeBlock): IRuntimeAction[];
}
