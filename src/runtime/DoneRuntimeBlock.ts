import { IRuntimeBlock } from "./IRuntimeBlock";
import { RuntimeMetric } from "./RuntimeMetric";
import { BlockKey } from "../BlockKey";
import { IMetricInheritance, NullMetricInheritance } from "./IMetricInheritance";
import { DefaultResultSpanBuilder } from "./ResultSpanBuilder";
import { EventHandler, IRuntimeAction } from "./EventHandler";
import { ITimerRuntime } from "./ITimerRuntime";

/**
 * Runtime block that represents a completion state when workout execution is finished.
 * This block signals that the workout has completed successfully and handles any
 * final cleanup or completion actions.
 */
export class DoneRuntimeBlock implements IRuntimeBlock {
  readonly key: BlockKey;
  readonly spans: DefaultResultSpanBuilder;
  handlers: EventHandler[] = [];
  metrics: RuntimeMetric[] = [];
  parent?: IRuntimeBlock;

  constructor(key?: BlockKey, completionMetrics?: RuntimeMetric[]) {
    this.key = key || new BlockKey();
    this.spans = new DefaultResultSpanBuilder();
    this.metrics = completionMetrics || [];
  }

  /**
   * Executes the completion block logic - signals workout completion.
   * @param runtime The runtime context in which the block is executed
   * @returns An array of completion actions to be performed by the runtime
   */
  next(runtime: ITimerRuntime): IRuntimeAction[] {
    // Completion blocks typically return actions to signal workout end
    return [
      {
        type: 'END_WORKOUT',
        payload: {
          completedAt: runtime.getCurrentTime(),
          totalMetrics: this.metrics,
          successful: true
        }
      }
    ];
  }

  /**
   * Called when the completion block is entered. Handles final setup.
   * @param runtime The timer runtime instance
   */
  onEnter(runtime: ITimerRuntime): void {
    // Log completion entry or trigger completion events
    console.log('Workout completed successfully');
  }

  /**
   * Returns the metric inheritance for this block. Completion blocks use null inheritance.
   * @returns NullMetricInheritance instance (completion blocks don't inherit metrics)
   */
  inherit(): IMetricInheritance {
    return new NullMetricInheritance();
  }
}