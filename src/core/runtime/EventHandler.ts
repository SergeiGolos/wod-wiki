import { IRuntimeAction } from "../IRuntimeAction";
import { ITimerRuntime } from "../ITimerRuntime";
import { IRuntimeEvent } from "../IRuntimeEvent";
import { IRuntimeBlock } from "../IRuntimeBlock";

export interface EventHandler {
  readonly eventType: string;
  apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[];
}