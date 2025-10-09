import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IEvent } from '../IEvent';
import { TypedMemoryReference } from '../IMemoryReference';

/**
 * Timer memory reference types for runtime memory system.
 * These constants are used to identify and search for timer-related memory references.
 */
export const TIMER_MEMORY_TYPES = {
  TIME_SPANS: 'timer-time-spans',      // TimeSpan[] - array of start/stop pairs
  IS_RUNNING: 'timer-is-running',      // boolean - current running state
} as const;

/**
 * TimeSpan represents a segment of time with start and optional stop timestamps.
 * Used to track timer execution across pause/resume cycles.
 */
export interface TimeSpan {
  start?: Date;   // When this segment started
  stop?: Date;    // When this segment stopped (undefined = currently running)
}

/**
 * TimerBehavior manages time tracking for workout blocks.
 * 
 * Supports two modes:
 * - Count-up ('up'): Timer starts at 0 and increases (For Time workouts)
 * - Countdown ('down'): Timer starts at duration and decreases to 0 (AMRAP workouts)
 * 
 * Features:
 * - Emits timer:tick events every ~100ms for UI updates
 * - Emits timer:complete when countdown reaches zero
 * - Supports pause/resume via behavior methods
 * - Uses performance.now() for sub-millisecond precision
 * - Automatically cleans up intervals on disposal
 * 
 * API Contract: contracts/runtime-blocks-api.md
 */
export class TimerBehavior implements IRuntimeBehavior {
  private intervalId?: ReturnType<typeof setInterval>;
  private startTime = 0;
  private elapsedMs = 0;
  private _isPaused = false;
  private pauseTime = 0;
  private readonly tickIntervalMs = 100; // ~10 ticks per second
  private direction: 'up' | 'down';
  private durationMs?: number;
  
  // Memory references
  private timeSpansRef?: TypedMemoryReference<TimeSpan[]>;
  private isRunningRef?: TypedMemoryReference<boolean>;
  private _runtime?: IScriptRuntime;

  constructor(direction: 'up' | 'down' = 'up', durationMs?: number) {
    if (direction !== 'up' && direction !== 'down') {
      throw new TypeError(`Invalid timer direction: ${direction}. Must be 'up' or 'down'.`);
    }

    this.direction = direction;
    this.durationMs = durationMs;
  }

  /**
   * Start the timer when block is pushed onto the stack.
   * Allocates memory references and emits timer:started event.
   */
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    this._runtime = runtime;
    
    // Allocate memory references with public visibility
    this.timeSpansRef = runtime.memory.allocate<TimeSpan[]>(
      TIMER_MEMORY_TYPES.TIME_SPANS,
      block.key.toString(),
      [{ start: new Date(), stop: undefined }], // Initialize with one running span
      'public'
    );
    
    this.isRunningRef = runtime.memory.allocate<boolean>(
      TIMER_MEMORY_TYPES.IS_RUNNING,
      block.key.toString(),
      true, // Initialize as running
      'public'
    );
    this.startTime = performance.now();
    this.elapsedMs = 0;
    this._isPaused = false;

    // Start the tick interval
    this.intervalId = setInterval(() => {
      if (!this._isPaused) {
        this.tick(runtime, block);
      }
    }, this.tickIntervalMs);

    // Emit timer:started event
    runtime.handle({
      name: 'timer:started',
      timestamp: new Date(),
      data: {
        blockId: block.key.toString(),
        direction: this.direction,
        startTime: this.startTime,
      },
    });

    return [];
  }

  /**
   * Stop the timer when block is popped from the stack.
   * Updates memory to mark timer as stopped.
   */
  onPop(_runtime: IScriptRuntime, _block: IRuntimeBlock): IRuntimeAction[] {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Stop the timer in memory
    if (this.timeSpansRef && this.isRunningRef) {
      const spans = this.timeSpansRef.get() || [];
      if (spans.length > 0 && !spans[spans.length - 1].stop) {
        // Close the last span
        spans[spans.length - 1].stop = new Date();
        this.timeSpansRef.set([...spans]);
      }
      this.isRunningRef.set(false);
    }

    return [];
  }

  /**
   * Execute timer tick: update elapsed time and emit event.
   * For countdown timers, also checks for completion.
   */
  private tick(runtime: IScriptRuntime, block: IRuntimeBlock): void {
    const now = performance.now();
    this.elapsedMs = now - this.startTime;

    // Check for countdown completion
    if (this.direction === 'down' && this.durationMs !== undefined) {
      const remainingMs = this.durationMs - this.elapsedMs;
      
      if (remainingMs <= 0) {
        // Timer complete!
        this.elapsedMs = this.durationMs;
        if (this.intervalId !== undefined) {
          clearInterval(this.intervalId);
          this.intervalId = undefined;
        }
        
        runtime.handle({
          name: 'timer:complete',
          timestamp: new Date(),
          data: {
            blockId: block.key.toString(),
            finalTime: this.durationMs,
          },
        });
        return;
      }
    }

    // Emit tick event
    const tickData: any = {
      blockId: block.key.toString(),
      elapsedMs: this.elapsedMs,
      displayTime: this.getDisplayTime(),
      direction: this.direction,
    };
    
    // Include remaining time for countdown timers
    if (this.direction === 'down' && this.durationMs !== undefined) {
      tickData.remainingMs = this.durationMs - this.elapsedMs;
    }
    
    runtime.handle({
      name: 'timer:tick',
      timestamp: new Date(),
      data: tickData,
    });
  }

  /**
   * Get current elapsed time in milliseconds.
   */
  getElapsedMs(): number {
    if (this._isPaused) {
      return this.elapsedMs;
    }

    if (this.intervalId !== undefined) {
      const now = performance.now();
      return now - this.startTime;
    }

    return this.elapsedMs;
  }

  /**
   * Get display time rounded to 0.1s precision.
   * Converts milliseconds to seconds and rounds to nearest 0.1s.
   */
  getDisplayTime(): number {
    const seconds = this.getElapsedMs() / 1000;
    return Math.round(seconds * 10) / 10;
  }

  /**
   * Check if timer is currently running.
   */
  isRunning(): boolean {
    if (this.isRunningRef) {
      return this.isRunningRef.get() || false;
    }
    return this.intervalId !== undefined && !this._isPaused;
  }

  /**
   * Check if timer is currently paused.
   * A timer is paused if it has time spans but the last one is stopped and there's an interval running.
   */
  isPaused(): boolean {
    if (this.timeSpansRef && this.isRunningRef) {
      const spans = this.timeSpansRef.get() || [];
      const isRunning = this.isRunningRef.get() || false;
      // Paused means: we have spans, the last span is closed, and memory says not running
      if (spans.length > 0 && spans[spans.length - 1].stop && !isRunning) {
        return true;
      }
      return false;
    }
    return this._isPaused;
  }

  /**
   * Start the timer. Creates a new time span.
   */
  start(): void {
    if (!this.timeSpansRef || !this.isRunningRef || !this._runtime) {
      return;
    }

    const spans = this.timeSpansRef.get() || [];
    
    // If already running, don't start again
    if (spans.length > 0 && !spans[spans.length - 1].stop) {
      return;
    }

    // Add new span
    spans.push({ start: new Date(), stop: undefined });
    this.timeSpansRef.set([...spans]);
    this.isRunningRef.set(true);
  }

  /**
   * Stop the timer. Closes the current time span.
   */
  stop(): void {
    if (!this.timeSpansRef || !this.isRunningRef) {
      return;
    }

    const spans = this.timeSpansRef.get() || [];
    if (spans.length > 0 && !spans[spans.length - 1].stop) {
      spans[spans.length - 1].stop = new Date();
      this.timeSpansRef.set([...spans]);
    }
    this.isRunningRef.set(false);
  }

  /**
   * Pause the timer. Closes the current time span.
   */
  pause(): void {
    if (!this.timeSpansRef || !this.isRunningRef) {
      // Fallback to old behavior if memory not initialized
      if (!this._isPaused && this.intervalId !== undefined) {
        this._isPaused = true;
        this.pauseTime = performance.now();
        this.elapsedMs = this.pauseTime - this.startTime;
      }
      return;
    }

    const spans = this.timeSpansRef.get() || [];
    
    // If not running, nothing to pause
    if (spans.length === 0 || spans[spans.length - 1].stop) {
      return;
    }

    // Close the current span
    spans[spans.length - 1].stop = new Date();
    this.timeSpansRef.set([...spans]);
    this.isRunningRef.set(false);
  }

  /**
   * Resume the timer. Creates a new time span.
   */
  resume(): void {
    if (!this.timeSpansRef || !this.isRunningRef) {
      // Fallback to old behavior if memory not initialized
      if (this._isPaused && this.intervalId !== undefined) {
        this._isPaused = false;
        const now = performance.now();
        this.startTime = now - this.elapsedMs;
      }
      return;
    }

    const spans = this.timeSpansRef.get() || [];
    
    // If already running, don't resume
    if (spans.length > 0 && !spans[spans.length - 1].stop) {
      return;
    }

    // Add new span
    spans.push({ start: new Date(), stop: undefined });
    this.timeSpansRef.set([...spans]);
    this.isRunningRef.set(true);
  }

  /**
   * Cleanup: clear interval and remove event listeners.
   * Must complete in <50ms per performance contract.
   */
  dispose(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Get time spans for this timer from memory.
   */
  getTimeSpans(): TimeSpan[] {
    if (this.timeSpansRef) {
      return this.timeSpansRef.get() || [];
    }
    
    // Fallback for tests that don't use memory
    const elapsedMs = this.getElapsedMs();
    const now = new Date();
    return [{
      start: new Date(now.getTime() - elapsedMs),
      stop: this.isRunning() ? undefined : now
    }];
  }

  /**
   * Get total elapsed time in milliseconds by summing all time spans.
   */
  getTotalElapsed(): number {
    const spans = this.getTimeSpans();
    
    if (spans.length === 0) {
      return 0;
    }

    let total = 0;
    const now = new Date();

    for (const span of spans) {
      if (span.start) {
        const endTime = span.stop || now;
        total += endTime.getTime() - span.start.getTime();
      }
    }

    return total;
  }
}
