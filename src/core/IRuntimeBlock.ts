import { EventHandler } from "./runtime/EventHandler";
import { IRuntimeAction } from "./IRuntimeAction";
import { ITimerRuntime } from "./ITimerRuntime";
import { RuntimeMetric } from "./RuntimeMetric";
import { JitStatement } from "./JitStatement";
import { IRuntimeEvent } from "./IRuntimeEvent";
import { RuntimeSpan } from "./RuntimeSpan";
import { BlockKey } from "./BlockKey";

export interface IRuntimeBlock {
  // Block identity
  blockKey: BlockKey;
  blockId: string;  
  parent?: IRuntimeBlock | undefined;

  // Leaf marker
  leaf?: boolean;  // true if this block represents a leaf-level (effort) block

  // Use getter methods instead of direct properties for encapsulation
  sources: JitStatement[];  
  spans(): RuntimeSpan[];
  addSpan?(span: RuntimeSpan): void;  
  
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

  // Metrics composition
  composeMetrics(runtime: ITimerRuntime): RuntimeMetric[];
}
