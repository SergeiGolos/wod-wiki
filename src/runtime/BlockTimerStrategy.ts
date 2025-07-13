import { IRuntimeBlockStrategy, JitStatement } from "./RuntimeJitStrategies";
import { RuntimeMetric } from "./RuntimeMetric";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { ITimerRuntime } from "./ITimerRuntime";
import { BlockKey } from "../BlockKey";
import { IMetricInheritance, NullMetricInheritance } from "./IMetricInheritance";
import { DefaultResultSpanBuilder } from "./ResultSpanBuilder";
import { EventHandler, IRuntimeAction } from "./EventHandler";

/**
 * Runtime block for executing timer-based activities (AMRAP, EMOM, rest periods).
 * This block handles time-based operations like countdowns, rest periods, and timed workouts.
 */
export class TimerRuntimeBlock implements IRuntimeBlock {
  readonly key: BlockKey;
  readonly spans: DefaultResultSpanBuilder;
  handlers: EventHandler[] = [];
  metrics: RuntimeMetric[];
  parent?: IRuntimeBlock;

  private startTime?: number;
  private duration: number;
  private isCompleted: boolean = false;

  constructor(metrics: RuntimeMetric[], key?: BlockKey) {
    this.key = key || new BlockKey();
    this.spans = new DefaultResultSpanBuilder();
    this.metrics = metrics;
    
    // Extract duration from metrics
    this.duration = this.extractDuration(metrics);
  }

  /**
   * Executes the timer block logic - manages time-based progression.
   * @param runtime The runtime context in which the block is executed
   * @returns An array of actions to manage timer state or advance
   */
  next(runtime: ITimerRuntime): IRuntimeAction[] {
    const currentTime = runtime.getCurrentTime();

    // If not started, start the timer
    if (!this.startTime) {
      this.startTime = currentTime;
      return [
        {
          type: 'START_TIMER',
          payload: {
            block: this,
            duration: this.duration,
            startTime: this.startTime
          }
        }
      ];
    }

    // Check if timer has completed
    const elapsed = currentTime - this.startTime;
    if (elapsed >= this.duration && !this.isCompleted) {
      this.isCompleted = true;
      return [
        {
          type: 'COMPLETE_TIMER',
          payload: {
            block: this,
            completedAt: currentTime,
            duration: this.duration
          }
        }
      ];
    }

    // Timer is still running
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

    return [
      {
        type: 'UPDATE_TIMER',
        payload: {
          block: this,
          elapsed: elapsed,
          remaining: this.duration - elapsed
        }
      }
    ];
  }

  /**
   * Called when the timer block is entered.
   * @param runtime The timer runtime instance
   */
  onEnter(runtime: ITimerRuntime): void {
    this.startTime = undefined;
    this.isCompleted = false;
    console.log(`Starting timer block: ${this.getTimerDescription()}`);
  }

  /**
   * Returns the metric inheritance for this block.
   * @returns NullMetricInheritance (timer blocks don't typically inherit)
   */
  inherit(): IMetricInheritance {
    return new NullMetricInheritance();
  }

  /**
   * Gets the remaining time on the timer.
   */
  getRemainingTime(currentTime: number): number {
    if (!this.startTime) return this.duration;
    const elapsed = currentTime - this.startTime;
    return Math.max(0, this.duration - elapsed);
  }

  /**
   * Gets a description of the timer for logging.
   */
  private getTimerDescription(): string {
    const minutes = Math.floor(this.duration / 60000);
    const seconds = Math.floor((this.duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Extracts duration in milliseconds from timer metrics.
   */
  private extractDuration(metrics: RuntimeMetric[]): number {
    for (const metric of metrics) {
      const timeValue = metric.values.find(v => v.type === 'time');
      if (timeValue) {
        // Convert to milliseconds based on unit
        switch (timeValue.unit) {
          case 'ms': return timeValue.value;
          case 'sec': return timeValue.value * 1000;
          case 'min': return timeValue.value * 60 * 1000;
          case 'hr': return timeValue.value * 60 * 60 * 1000;
        }
      }
    }
    return 60000; // Default 1 minute
  }
}

/**
 * Strategy for creating timer-based runtime blocks.
 * Handles statements that contain time/duration fragments without exercise content.
 */
export class BlockTimerStrategy implements IRuntimeBlockStrategy {

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

    // Check if any statement contains timer fragments without effort/exercise fragments
    return nodes.some(node => {
      const hasTimer = node.fragments.some(fragment => fragment.type === 'timer');
      const hasEffort = node.fragments.some(fragment => 
        fragment.type === 'rep' || 
        fragment.type === 'resistance' || 
        fragment.type === 'distance' ||
        fragment.type === 'action'
      );
      
      // Timer strategy handles pure time blocks (timer without effort)
      return hasTimer && !hasEffort;
    });
  }

  /**
   * Compiles the statements into a TimerRuntimeBlock.
   * @param compiledMetrics Pre-compiled metrics from fragment compilation
   * @param legacySources Original statement nodes for backward compatibility
   * @param runtime The timer runtime instance
   * @returns Compiled TimerRuntimeBlock or undefined if compilation fails
   */
  compile(compiledMetrics: RuntimeMetric[], legacySources: JitStatement[], runtime: ITimerRuntime): IRuntimeBlock | undefined {
    if (compiledMetrics.length === 0) {
      console.warn('BlockTimerStrategy: No metrics provided for compilation');
      return undefined;
    }

    // Filter metrics to only include timer-related ones
    const timerMetrics = compiledMetrics.filter(metric => 
      metric.values.some(value => value.type === 'time')
    );

    if (timerMetrics.length === 0) {
      console.warn('BlockTimerStrategy: No timer metrics found');
      return undefined;
    }

    return new TimerRuntimeBlock(timerMetrics);
  }
}