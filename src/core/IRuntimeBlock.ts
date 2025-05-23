import { EventHandler } from "./runtime/EventHandler";
import { IRuntimeAction } from "./IRuntimeAction";
import { ITimerRuntime } from "./ITimerRuntime";
import { RuntimeMetric } from "./RuntimeMetric";
import { JitStatement } from "./JitStatement";
import { IRuntimeEvent } from "./IRuntimeEvent";
import { BlockKey } from "./BlockKey";
import { ResultSpanBuilder } from "./metrics";

export interface IRuntimeBlock {
  getSpanBuilder(): ResultSpanBuilder;
  // Block identity
  blockKey: BlockKey;
  blockId: string;  
  parent?: IRuntimeBlock | undefined;

  // Leaf marker
  leaf?: boolean;  // true if this block represents a leaf-level (effort) block

  // Use getter methods instead of direct properties for encapsulation
  sources: JitStatement[];  

  
  // Core methods  
  
  selectMany<T>(fn: (node: JitStatement) => T[]): T[];  
  
  // Event handling
  handle(runtime: ITimerRuntime, event: IRuntimeEvent, system: EventHandler[]): IRuntimeAction[];

  // Block implementation
  enter(runtime: ITimerRuntime): IRuntimeAction[];
  next(runtime: ITimerRuntime): IRuntimeAction[];  
  leave(runtime: ITimerRuntime): IRuntimeAction[];

  // Lifecycle methods
  onStart(runtime: ITimerRuntime): IRuntimeAction[];
  onStop(runtime: ITimerRuntime): IRuntimeAction[];
  
  /**
   * Generates a complete set of metrics for the runtime block.
   * Uses the RuntimeMetricBuilder to collect and organize metrics by type.
   * Includes effort, repetitions, distance, and resistance metrics.
   * 
   * @param runtime The timer runtime instance
   * @returns An array of RuntimeMetric objects
   */
  metrics(runtime: ITimerRuntime): RuntimeMetric[];
}
