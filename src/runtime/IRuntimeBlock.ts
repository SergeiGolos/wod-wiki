import { RuntimeMetric } from "./RuntimeMetric";
import { BlockKey } from "../BlockKey";
import { IMetricInheritance } from "./IMetricInheritance";
import { ResultSpanBuilder } from "./ResultSpanBuilder";
import { EventHandler, IRuntimeAction } from "./EventHandler";
import { IScriptRuntime } from "./IScriptRuntime";

export interface IRuntimeBlock {  
  // Block identity
  readonly key: BlockKey;  
  readonly spans: ResultSpanBuilder;
  
  handlers: EventHandler[];
  metrics: RuntimeMetric[];
  parent?: IRuntimeBlock | undefined;  
    
  // Block implementation
  /**
   * Executes the block logic and returns a list of actions to perform.
   * @param runtime The runtime context in which the block is executed
   * @returns An array of actions to be performed by the runtime
   */
  next(runtime: IScriptRuntime): IRuntimeAction[];

  
  onEnter(runtime: IScriptRuntime): void;


  // Metric inheritance
  inherit(): IMetricInheritance;
}