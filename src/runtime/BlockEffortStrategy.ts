import { IRuntimeBlockStrategy, JitStatement } from "./RuntimeJitStrategies";
import { RuntimeMetric } from "./RuntimeMetric";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { ITimerRuntime } from "./ITimerRuntime";
import { BlockKey } from "../BlockKey";
import { IMetricInheritance, NullMetricInheritance } from "./IMetricInheritance";
import { ResultSpanBuilder } from "./ResultSpanBuilder";
import { EventHandler, IRuntimeAction } from "./EventHandler";

/**
 * Runtime block for executing effort-based exercises (repetitions, resistance work).
 * This block handles exercises that are measured by repetitions, weight, distance, etc.
 */
export class EffortRuntimeBlock implements IRuntimeBlock {
  readonly key: BlockKey;
  readonly spans: ResultSpanBuilder;
  handlers: EventHandler[] = [];
  metrics: RuntimeMetric[];
  parent?: IRuntimeBlock;

  private isCompleted: boolean = false;

  constructor(metrics: RuntimeMetric[], key?: BlockKey) {
    this.key = key || new BlockKey();
    this.spans = new ResultSpanBuilder();
    this.metrics = metrics;
  }

  /**
   * Executes the effort block logic - tracks effort completion.
   * @param runtime The runtime context in which the block is executed
   * @returns An array of actions to complete the effort or advance
   */
  next(runtime: ITimerRuntime): IRuntimeAction[] {
    if (this.isCompleted) {
      return [
        {
          type: 'POP_BLOCK',
          payload: {
            block: this,
            completed: true
          }
        }
      ];
    }

    // Mark as completed and return completion action
    this.isCompleted = true;
    return [
      {
        type: 'COMPLETE_EFFORT',
        payload: {
          block: this,
          metrics: this.metrics,
          completedAt: runtime.getCurrentTime()
        }
      }
    ];
  }

  /**
   * Called when the effort block is entered.
   * @param runtime The timer runtime instance
   */
  onEnter(runtime: ITimerRuntime): void {
    this.isCompleted = false;
    console.log(`Starting effort block: ${this.getEffortName()}`);
  }

  /**
   * Returns the metric inheritance for this block.
   * @returns NullMetricInheritance (effort blocks don't typically inherit)
   */
  inherit(): IMetricInheritance {
    return new NullMetricInheritance();
  }

  /**
   * Gets the primary effort name from the metrics.
   */
  private getEffortName(): string {
    return this.metrics.length > 0 ? this.metrics[0].effort : 'Unknown Exercise';
  }
}

/**
 * Strategy for creating effort-based runtime blocks.
 * Handles statements that contain repetition, resistance, or distance fragments.
 */
export class BlockEffortStrategy implements IRuntimeBlockStrategy {

  /**
   * Determines if this strategy can handle the given statements.
   * @param nodes Array of JitStatement nodes to evaluate
   * @param runtime Timer runtime instance for context
   * @returns True if this strategy can handle the statements
   */
  canHandle(nodes: JitStatement[], runtime: ITimerRuntime): boolean {
    if (nodes.length === 0) {
      return false;
    }

    // Check if any statement contains effort-related fragments
    return nodes.some(node => 
      node.fragments.some(fragment => 
        fragment.type === 'rep' || 
        fragment.type === 'resistance' || 
        fragment.type === 'distance' ||
        fragment.type === 'action'
      )
    );
  }

  /**
   * Compiles the statements into an EffortRuntimeBlock.
   * @param compiledMetrics Pre-compiled metrics from fragment compilation
   * @param legacySources Original statement nodes for backward compatibility
   * @param runtime The timer runtime instance
   * @returns Compiled EffortRuntimeBlock or undefined if compilation fails
   */
  compile(compiledMetrics: RuntimeMetric[], legacySources: JitStatement[], runtime: ITimerRuntime): IRuntimeBlock | undefined {
    if (compiledMetrics.length === 0) {
      console.warn('BlockEffortStrategy: No metrics provided for compilation');
      return undefined;
    }

    // Filter metrics to only include effort-related ones
    const effortMetrics = compiledMetrics.filter(metric => 
      metric.values.some(value => 
        value.type === 'repetitions' || 
        value.type === 'resistance' || 
        value.type === 'distance'
      )
    );

    if (effortMetrics.length === 0) {
      console.warn('BlockEffortStrategy: No effort metrics found');
      return undefined;
    }

    return new EffortRuntimeBlock(effortMetrics);
  }
}