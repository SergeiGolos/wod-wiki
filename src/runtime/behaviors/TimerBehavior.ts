import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { TypedMemoryReference } from '../IMemoryReference';

/**
 * TimeSpan represents a single period of timer activity.
 * Multiple spans can exist for timers that are paused and resumed.
 */
export interface TimeSpan {
  start?: Date;
  stop?: Date;
}

/**
 * Memory type constants for timer-related memory references.
 */
export const TIMER_MEMORY_TYPES = {
  TIME_SPANS: 'timer-time-spans',      // TimeSpan[] - array of start/stop pairs
  IS_RUNNING: 'timer-is-running',      // boolean - current running state
} as const;

export type TimerMemoryType = typeof TIMER_MEMORY_TYPES[keyof typeof TIMER_MEMORY_TYPES];

/**
 * TimerBehavior manages timer state through reactive memory references.
 * 
 * This behavior replaces the old polling-based clock system with a subscription-based
 * architecture. Timer state is stored in runtime memory and components subscribe to changes.
 * 
 * Memory References Created:
 * - timer-time-spans: TimeSpan[] - Array of start/stop timestamp pairs
 * - timer-is-running: boolean - Current running state of the timer
 */
export class TimerBehavior implements IRuntimeBehavior {
  private timeSpansRef?: TypedMemoryReference<TimeSpan[]>;
  private isRunningRef?: TypedMemoryReference<boolean>;

  /**
   * Called when the owning block is pushed onto the stack.
   * Allocates memory references and starts the timer.
   */
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Access the protected allocate method through the runtime block
    // We need to use type assertion to access protected method
    const allocator = block as any;
    
    // Start with one span that has a start time but no stop time (currently running)
    const initialSpan: TimeSpan = {
      start: new Date(),
      stop: undefined
    };

    this.timeSpansRef = allocator.allocate<TimeSpan[]>({
      type: TIMER_MEMORY_TYPES.TIME_SPANS,
      visibility: 'public',
      initialValue: [initialSpan]
    });

    this.isRunningRef = allocator.allocate<boolean>({
      type: TIMER_MEMORY_TYPES.IS_RUNNING,
      visibility: 'public',
      initialValue: true
    });

    console.log(`⏱️  TimerBehavior: Timer started for block ${block.key.toString()}`);
    return [];
  }

  /**
   * Called right before the owning block is popped from the stack.
   * Stops the timer by closing the current span.
   */
  onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    if (!this.timeSpansRef || !this.isRunningRef) {
      console.warn(`⏱️  TimerBehavior: References not initialized for block ${block.key.toString()}`);
      return [];
    }

    const spans = this.timeSpansRef.get() || [];
    const lastSpan = spans[spans.length - 1];
    
    if (lastSpan && !lastSpan.stop) {
      // Close the last span with current timestamp
      lastSpan.stop = new Date();
      this.timeSpansRef.set([...spans]); // Trigger subscription notification
      console.log(`⏱️  TimerBehavior: Timer stopped for block ${block.key.toString()}`);
    }

    this.isRunningRef.set(false);
    return [];
  }

  /**
   * Pause the timer by closing the current span.
   */
  pause(): void {
    if (!this.timeSpansRef || !this.isRunningRef) {
      console.warn('⏱️  TimerBehavior: Cannot pause - references not initialized');
      return;
    }

    const spans = this.timeSpansRef.get() || [];
    const lastSpan = spans[spans.length - 1];
    
    if (lastSpan && !lastSpan.stop) {
      lastSpan.stop = new Date();
      this.timeSpansRef.set([...spans]);
      this.isRunningRef.set(false);
      console.log('⏱️  TimerBehavior: Timer paused');
    }
  }

  /**
   * Resume the timer by creating a new span.
   */
  resume(): void {
    if (!this.timeSpansRef || !this.isRunningRef) {
      console.warn('⏱️  TimerBehavior: Cannot resume - references not initialized');
      return;
    }

    const spans = this.timeSpansRef.get() || [];
    
    // Add a new span starting now
    const newSpan: TimeSpan = {
      start: new Date(),
      stop: undefined
    };
    
    this.timeSpansRef.set([...spans, newSpan]);
    this.isRunningRef.set(true);
    console.log('⏱️  TimerBehavior: Timer resumed');
  }

  /**
   * Get the current time spans.
   */
  getTimeSpans(): TimeSpan[] {
    return this.timeSpansRef?.get() || [];
  }

  /**
   * Calculate total elapsed time across all spans in milliseconds.
   */
  getTotalElapsed(): number {
    const spans = this.getTimeSpans();
    return spans.reduce((total, span) => {
      if (!span.start) return total;
      
      // If no stop time, timer is running - use current time
      const stop = span.stop?.getTime() || Date.now();
      const start = span.start.getTime();
      return total + (stop - start);
    }, 0);
  }

  /**
   * Check if the timer is currently running.
   */
  isRunning(): boolean {
    return this.isRunningRef?.get() || false;
  }
}
