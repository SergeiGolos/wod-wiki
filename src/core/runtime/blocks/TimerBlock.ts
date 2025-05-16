import { completeButton } from "@/components/buttons/timerButtons";
import { ITimerRuntime, IRuntimeAction, PrecompiledNode, IRuntimeEvent, RuntimeMetric } from "@/core/timer.types";
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
    handlers: EventHandler[] = []
  ) {
    super(sources);
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
    
    // Create a start event for the current span
    const startEvent: IRuntimeEvent = {
      timestamp: this.startTime,
      name: 'timer_start',
      blockKey: this.ctx.blockKey
    };
    
    // Add the start event to the current span
    this.ctx.addSpan(startEvent);
    
    // Create a metric for the timer duration
    if (this.durationMs > 0) {
      const durationMetric: RuntimeMetric = {
        sourceId: this.ctx.blockKey || 'timer',
        effort: 'duration',
        values: [{
          type: 'repetitions',
          value: this.durationMs,
          unit: 'ms'
        }]
      };
      
      // Add the metric to the current span
      this.ctx.addMetricsToCurrentSpan([durationMetric]);
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
    
    // Create a stop event for the current span
    if (this.startTime) {
      const stopEvent: IRuntimeEvent = {
        timestamp: this.endTime,
        name: 'timer_stop',
        blockKey: this.ctx.blockKey
      };
      
      // Add the stop event to the current span
      this.ctx.addSpan(stopEvent);
      
      // Calculate the actual duration
      const actualDurationMs = this.endTime.getTime() - this.startTime.getTime();
      
      // Update the duration metric with the actual duration
      const actualDurationMetric: RuntimeMetric = {
        sourceId: this.ctx.blockKey || 'timer',
        effort: 'actual_duration',
        values: [{
          type: 'repetitions',
          value: actualDurationMs,
          unit: 'ms'
        }]
      };
      
      // Add the actual duration metric to the current span
      this.ctx.addMetricsToCurrentSpan([actualDurationMetric]);
    }
    
    return [
      new SetClockAction("primary"),
      new SetButtonsAction([], "runtime")
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
