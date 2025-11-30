import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { TimerState, TimerSpan } from '../models/MemoryModels';
import { TypedMemoryReference } from '../IMemoryReference';
import { MemoryTypeEnum } from '../MemoryTypeEnum';
import { PushTimerDisplayAction, PopTimerDisplayAction } from '../actions/TimerDisplayActions';
import { PushCardDisplayAction, PopCardDisplayAction } from '../actions/CardDisplayActions';

/**
 * Timer memory reference types for runtime memory system.
 * These constants are used to identify and search for timer-related memory references.
 * 
 * @deprecated Use MemoryTypeEnum instead
 */
export const TIMER_MEMORY_TYPES = {
  PREFIX: MemoryTypeEnum.TIMER_PREFIX,
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
  private _runtime?: IScriptRuntime;
  private timerRef?: TypedMemoryReference<TimerState>;

  /**
   * Creates a new TimerBehavior with optional memory injection.
   * 
   * @param direction Timer direction ('up' for count-up, 'down' for countdown)
   * @param durationMs Duration in milliseconds (for countdown timers)
   * @param label Optional label for the timer
   */
  constructor(
    private readonly direction: 'up' | 'down' = 'up',
    private readonly durationMs?: number,
    private readonly label: string = 'Timer'
  ) {
    if (direction !== 'up' && direction !== 'down') {
      throw new TypeError(`Invalid timer direction: ${direction}. Must be 'up' or 'down'.`);
    }
  }



  /**
   * Start the timer when block is pushed onto the stack.
   * Initializes memory references and emits timer:started event.
   */
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    this._runtime = runtime;
    
    // Initialize TimerState
    const initialState: TimerState = {
        blockId: block.key.toString(),
        label: this.label,
        format: this.direction === 'down' ? 'down' : 'up',
        durationMs: this.durationMs,
        spans: [{ start: Date.now(), state: 'new' }],
        isRunning: true,
        // Card info can be updated by the block later if needed, or we can pass it in
        card: {
            title: this.direction === 'down' ? 'AMRAP' : 'For Time',
            subtitle: this.label
        }
    };

    this.timerRef = runtime.memory.allocate<TimerState>(
        `${MemoryTypeEnum.TIMER_PREFIX}${block.key.toString()}`,
        block.key.toString(),
        initialState,
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

    // Create display actions
    const timerAction = new PushTimerDisplayAction({
      id: `timer-${block.key}`,
      ownerId: block.key.toString(),
      timerMemoryId: this.timerRef.id,
      label: this.label,
      format: this.direction === 'down' ? 'countdown' : 'countup',
      durationMs: this.durationMs,
      // Default buttons could be added here if needed
    });

    const cardAction = new PushCardDisplayAction({
      id: `card-${block.key}`,
      ownerId: block.key.toString(),
      type: 'active-block',
      title: this.direction === 'down' ? 'AMRAP' : 'For Time',
      subtitle: this.label,
      // Metrics could be populated if we had access to them here
    });

    return [timerAction, cardAction];
  }

  /**
   * Called right before the owning block is popped from the stack.
   */
  onPop(_runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    return [
      new PopTimerDisplayAction(`timer-${block.key}`),
      new PopCardDisplayAction(`card-${block.key}`)
    ];
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
    if (this.timerRef) {
      return this.timerRef.get()?.isRunning || false;
    }
    return this.intervalId !== undefined && !this._isPaused;
  }

  /**
   * Check if timer is complete (only for countdown timers).
   */
  isComplete(): boolean {
    if (this.direction === 'down' && this.durationMs !== undefined) {
      return this.getElapsedMs() >= this.durationMs;
    }
    return false;
  }

  /**
   * Check if timer is currently paused.
   * A timer is paused if it has time spans but the last one is stopped and there's an interval running.
   */
  isPaused(): boolean {
    if (this.timerRef) {
      const state = this.timerRef.get();
      if (state) {
        const spans = state.spans;
        // Paused means: we have spans, the last span is closed, and memory says not running
        if (spans.length > 0 && spans[spans.length - 1].stop && !state.isRunning) {
          return true;
        }
      }
      return false;
    }
    return this._isPaused;
  }

  /**
   * Start the timer. Creates a new time span.
   */
  start(): void {
    if (!this.timerRef || !this._runtime) {
      return;
    }

    const state = this.timerRef.get();
    if (!state) return;
    
    const spans = [...state.spans];
    
    // If already running, don't start again
    if (spans.length > 0 && !spans[spans.length - 1].stop) {
      return;
    }

    // Add new span
    spans.push({ start: Date.now(), state: 'new' });
    
    this.timerRef.set({
        ...state,
        spans,
        isRunning: true
    });
  }

  /**
   * Stop the timer. Closes the current time span.
   */
  stop(): void {
    if (!this.timerRef) {
      return;
    }

    const state = this.timerRef.get();
    if (!state) return;

    const spans = [...state.spans];
    if (spans.length > 0 && !spans[spans.length - 1].stop) {
      spans[spans.length - 1].stop = Date.now();
      
      this.timerRef.set({
          ...state,
          spans,
          isRunning: false
      });
    }
  }

  /**
   * Pause the timer. Closes the current time span.
   */
  pause(): void {
    if (!this.timerRef) {
      // Fallback to old behavior if memory not initialized
      if (!this._isPaused && this.intervalId !== undefined) {
        this._isPaused = true;
        this.pauseTime = performance.now();
        this.elapsedMs = this.pauseTime - this.startTime;
      }
      return;
    }

    const state = this.timerRef.get();
    if (!state) return;

    const spans = [...state.spans];
    
    // If not running, nothing to pause
    if (spans.length === 0 || spans[spans.length - 1].stop) {
      return;
    }

    // Close the current span
    spans[spans.length - 1].stop = Date.now();
    
    this.timerRef.set({
        ...state,
        spans,
        isRunning: false
    });
  }

  /**
   * Resume the timer. Creates a new time span.
   */
  resume(): void {
    if (!this.timerRef) {
      // Fallback to old behavior if memory not initialized
      if (this._isPaused && this.intervalId !== undefined) {
        this._isPaused = false;
        const now = performance.now();
        this.startTime = now - this.elapsedMs;
      }
      return;
    }

    const state = this.timerRef.get();
    if (!state) return;

    const spans = [...state.spans];
    
    // If already running, don't resume
    if (spans.length > 0 && !spans[spans.length - 1].stop) {
      return;
    }

    // Add new span
    spans.push({ start: Date.now(), state: 'new' });
    
    this.timerRef.set({
        ...state,
        spans,
        isRunning: true
    });
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
  getTimeSpans(): TimerSpan[] {
    if (this.timerRef) {
      return this.timerRef.get()?.spans || [];
    }
    
    // Fallback for tests that don't use memory
    const elapsedMs = this.getElapsedMs();
    const now = Date.now();
    return [{
      start: now - elapsedMs,
      stop: this.isRunning() ? undefined : now,
      state: 'new'
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
        const endTime = span.stop || now.getTime();
        total += endTime - span.start;
    }

    return total;
  }
  /**
   * Reset the timer. Clears all time spans and stops the timer.
   */
  reset(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this._isPaused = false;
    this.elapsedMs = 0;
    this.startTime = 0;

    if (this.timerRef) {
        const state = this.timerRef.get();
        if (state) {
            this.timerRef.set({
                ...state,
                spans: [],
                isRunning: false
            });
        }
    }
  }
}
