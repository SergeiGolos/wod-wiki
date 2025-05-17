import { completeButton } from "@/components/buttons/timerButtons";
import { ITimerRuntime, IRuntimeAction, PrecompiledNode, RuntimeMetric } from "@/core/timer.types";
import { MetricsContext, MetricsRelationshipType } from "@/core/metrics";
import { PopBlockAction } from "../actions/PopBlockAction";
import { EventHandler } from "../EventHandler";
import { CompleteHandler } from "../inputs/CompleteEvent";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { SetClockAction } from "../outputs/SetClockAction";
import { RuntimeBlock } from "./RuntimeBlock";

/**
 * A specialized RuntimeBlock that handles timer functionality with metrics tracking.
 * Manages timer state, duration, and associated metrics.
 */
export class TimerBlock extends RuntimeBlock {
  private startTime?: Date;
  private endTime?: Date;
  private isRunning: boolean = false;
  private durationMs: number = 0;

  constructor(
    sources: PrecompiledNode[],
    handlers: EventHandler[] = [],
    parentMetricsContext?: MetricsContext
  ) {
    // Use the ADD relationship type for timer blocks
    // This means parent metrics will be added to child metrics
    super(sources, parentMetricsContext, MetricsRelationshipType.ADD);
    this.handlers = [...handlers, new CompleteHandler()];
    this.ctx.index = 0;
    
    // Initialize duration from context if available
    if (this.ctx.duration) {
      this.durationMs = this.ctx.duration;
    }
  }

  /**
   * Implementation of the doEnter hook method from the template pattern
   * Starts the timer when the block is entered
   */
  protected doEnter(_runtime: ITimerRuntime): IRuntimeAction[] {
    this.startTime = new Date();
    this.isRunning = true;
    this.logger.debug(`TimerBlock: ${this.blockKey} doEnter, startTime: ${this.startTime}`);
    
    const currentSpan = this.ctx.getCurrentResultSpan();

    if (currentSpan) {
      currentSpan.label = this.generateBlockLabel("Timer");

      // Add Planned Duration metric (moved from createResultSpan & consolidated)
      if (this.durationMs > 0) {
        const plannedDurationMetric: RuntimeMetric = {
          sourceId: this.ctx.blockKey || 'timer',
          effort: 'Planned Duration',
          values: [{
            type: 'repetitions', // Consider if 'timestamp' or a dedicated duration type is better
            value: this.durationMs,
            unit: 'ms'
          }]
        };
        this.ctx.pushMetricsToCurrentResult([plannedDurationMetric]);
      }
    } else {
      this.logger.warn(`TimerBlock: ${this.blockKey} doEnter called without an initialized ResultSpan.`);
    }
    
    return [
      new SetClockAction("primary"),
      new SetButtonsAction([completeButton], "runtime")
    ];
  }

  /**
   * Implementation of the doNext hook method from the template pattern
   * Handles moving to the next block when the timer completes
   */
  protected doNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [new PopBlockAction()];
  }

  /**
   * Implementation of the doLeave hook method from the template pattern
   * Cleans up timer resources when leaving the block
   */
  protected doLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    this.endTime = new Date();
    this.isRunning = false;
    this.logger.debug(`TimerBlock: ${this.blockKey} doLeave, endTime: ${this.endTime}`);
    
    const currentSpan = this.ctx.getCurrentResultSpan();

    if (this.startTime && currentSpan) {
      const actualDurationMs = this.endTime.getTime() - this.startTime.getTime();
      
      currentSpan.label = this.generateBlockLabel("Timer", `Completed in ${super.formatDuration(actualDurationMs)}`);
      
      const actualDurationMetric: RuntimeMetric = {
        sourceId: this.ctx.blockKey || 'timer',
        effort: 'Actual Duration',
        values: [{
          type: 'repetitions', // Consider if 'timestamp' or a dedicated duration type is better
          value: actualDurationMs,
          unit: 'ms'
        }]
      };
      this.ctx.pushMetricsToCurrentResult([actualDurationMetric]);
    } else {
      this.logger.warn(`TimerBlock: ${this.blockKey} doLeave called without startTime or currentSpan.`);
    }
    
    return [
      new SetButtonsAction([], "runtime"), // Clear buttons
      new SetClockAction("primary")
    ];
  }
  
  /**
   * Gets the current duration of the timer in milliseconds
   */
  public getDuration(): number {
    if (!this.startTime) return 0;
    
    const endTime = this.isRunning ? new Date() : this.endTime || new Date();
    return endTime.getTime() - this.startTime.getTime();
  }
  
  /**
   * Gets the remaining time in milliseconds
   */
  public getRemainingTime(): number {
    if (this.durationMs <= 0) return 0;
    
    const elapsed = this.getDuration();
    return Math.max(0, this.durationMs - elapsed);
  }
  
  /**
   * Checks if the timer is currently running
   */
  public isTimerRunning(): boolean {
    return this.isRunning;
  }
}
