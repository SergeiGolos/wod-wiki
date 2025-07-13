import { IRuntimeBlock } from "./IRuntimeBlock";
import { RuntimeMetric } from "./RuntimeMetric";
import { BlockKey } from "../BlockKey";
import { IMetricInheritance, NullMetricInheritance } from "./IMetricInheritance";
import { DefaultResultSpanBuilder } from "./ResultSpanBuilder";
import { EventHandler, IRuntimeAction } from "./EventHandler";
import { ITimerRuntime } from "./ITimerRuntime";

/**
 * Runtime block that represents an idle state when the system is not actively executing.
 * This block is used as a default/waiting state and typically performs no actions.
 */
export class IdleRuntimeBlock implements IRuntimeBlock {
  readonly key: BlockKey;
  readonly spans: DefaultResultSpanBuilder;
  handlers: EventHandler[] = [];
  metrics: RuntimeMetric[] = [];
  parent?: IRuntimeBlock;

  constructor(key?: BlockKey) {
    this.key = key || new BlockKey();
    this.spans = new DefaultResultSpanBuilder();
  }

  /**
   * Executes the idle block logic - typically returns no actions to perform.
   * @param runtime The runtime context in which the block is executed
   * @returns An empty array of actions (idle blocks perform no actions)
   */
  next(runtime: ITimerRuntime): IRuntimeAction[] {
    // Idle blocks typically perform no actions
    return [];
  }

  /**
   * Called when the block is entered. For idle blocks, this is typically a no-op.
   * @param runtime The timer runtime instance
   */
  onEnter(runtime: ITimerRuntime): void {
    // Idle blocks typically have no enter behavior
  }

  /**
   * Returns the metric inheritance for this block. Idle blocks use null inheritance.
   * @returns NullMetricInheritance instance (no metrics to inherit)
   */
  inherit(): IMetricInheritance {
    return new NullMetricInheritance();
  }
}