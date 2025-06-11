import { EventHandler } from "./runtime/EventHandler";
import { IRuntimeAction } from "./IRuntimeAction";
import { ITimerRuntime } from "./ITimerRuntime";
import { RuntimeMetric } from "./types/RuntimeMetric";
import { IRuntimeEvent } from "./IRuntimeEvent";
import { BlockKey } from "./types/BlockKey";
import { ResultSpanBuilder } from "./metrics";

export interface IRuntimeBlock {  
  // Block identity
  readonly key: BlockKey;  
  readonly parent?: IRuntimeBlock | undefined;  
      
  readonly spans: ResultSpanBuilder;
  readonly metrics: RuntimeMetric[];

  // Event handling
  handle(runtime: ITimerRuntime, event: IRuntimeEvent, system: EventHandler[]): IRuntimeAction[];

  // Block implementation
  next(runtime: ITimerRuntime): IRuntimeAction[];
}
