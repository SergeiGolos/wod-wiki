import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IEvent } from '../IEvent';

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
  private durationMs?: number;

  constructor(private readonly direction: 'up' | 'down', durationMs?: number) {
    if (direction !== 'up' && direction !== 'down') {
      throw new TypeError(`Invalid timer direction: ${direction}. Must be 'up' or 'down'.`);
    }
    
    this.durationMs = durationMs;
  }

  /**
   * Start the timer when block is pushed onto the stack.
   * Emits timer:started event.
   */
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
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
   * Preserves elapsed time state for resume scenarios.
   */
  onPop(_runtime: IScriptRuntime, _block: IRuntimeBlock): IRuntimeAction[] {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Calculate final elapsed time
    if (!this._isPaused) {
      const now = performance.now();
      this.elapsedMs = now - this.startTime;
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
    return this.intervalId !== undefined && !this._isPaused;
  }

  /**
   * Check if timer is currently paused.
   */
  isPaused(): boolean {
    return this._isPaused;
  }

  /**
   * Pause the timer. Preserves elapsed time.
   */
  pause(): void {
    if (!this._isPaused && this.intervalId !== undefined) {
      this._isPaused = true;
      this.pauseTime = performance.now();
      this.elapsedMs = this.pauseTime - this.startTime;
    }
  }

  /**
   * Resume the timer from current elapsed time.
   */
  resume(): void {
    if (this._isPaused && this.intervalId !== undefined) {
      this._isPaused = false;
      const now = performance.now();
      this.startTime = now - this.elapsedMs;
    }
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
}
