import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { BlockLifecycleOptions, IRuntimeBlock } from '../IRuntimeBlock';
import { TimerSpan } from '../models/MemoryModels';
export type TimeSpan = TimerSpan;
import { calculateDuration } from '../../lib/timeUtils';
import { TimerStateManager } from './TimerStateManager';

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
 * - Uses Unified Clock (RuntimeClock) for time management
 * - Automatically cleans up on disposal
 * 
 * API Contract: contracts/runtime-blocks-api.md
 */
export class TimerBehavior implements IRuntimeBehavior {
  private startTime: Date = new Date(); // Wall-clock start time
  private elapsedMs = 0;
  private _isPaused = false;
  private _runtime?: IScriptRuntime;
  private stateManager: TimerStateManager;

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
    private readonly label: string = 'Timer',
    private readonly role: 'primary' | 'secondary' | 'auto' = 'auto',
    private readonly autoStart: boolean = true
  ) {
    if (direction !== 'up' && direction !== 'down') {
      throw new TypeError(`Invalid timer direction: ${direction}. Must be 'up' or 'down'.`);
    }
    this.stateManager = new TimerStateManager(direction, durationMs, label);
  }

  /**
   * Start the timer when block is pushed onto the stack.
   * Initializes memory references and emits timer:started event.
   */
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    this._runtime = runtime;
    const now = options?.startTime ?? runtime.clock.now;
    this.startTime = now;
    this.elapsedMs = 0;
    this._isPaused = !this.autoStart;

    // Emit timer:started event
    runtime.handle({
      name: 'timer:started',
      timestamp: now,
      data: {
        blockId: block.key.toString(),
        direction: this.direction,
        startTime: now.getTime(),
      },
    });

    return this.stateManager.initialize(runtime, block, now.getTime(), this.role, this.autoStart);
  }

  /**
   * Called right before the owning block is popped from the stack.
   */
  onPop(_runtime: IScriptRuntime, block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] {
    return this.stateManager.cleanup(block);
  }

  /**
   * Get current elapsed time in milliseconds.
   */
  getElapsedMs(): number {
    if (this._isPaused) {
      return this.elapsedMs;
    }

    const now = this._runtime?.clock.now ?? new Date();
    return now.getTime() - this.startTime.getTime();
  }

  /**
   * Get display time rounded to 0.1s precision.
   * Converts milliseconds to seconds and rounds to nearest 0.1s.
   */
  getDisplayTime(): number {
    const seconds = this.getElapsedMs() / 1000;
    // Use the utility for consistency, though implementation is trivial
    return Math.round(seconds * 10) / 10;
  }

  /**
   * Check if timer is currently running.
   */
  isRunning(): boolean {
    const timerRef = this.stateManager.getTimerRef();
    if (timerRef) {
      return timerRef.get()?.isRunning || false;
    }
    return !this._isPaused;
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
    const timerRef = this.stateManager.getTimerRef();
    if (timerRef) {
      const state = timerRef.get();
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
   * Get remaining time in milliseconds (for countdown timers).
   * Returns 0 for count-up timers.
   */
  getRemainingMs(): number {
    if (this.direction !== 'down' || this.durationMs === undefined) {
      return 0;
    }
    return Math.max(0, this.durationMs - this.getElapsedMs());
  }

  /**
   * Dispose the timer (public alias for onDispose).
   */
  dispose(): void {
    this.stop();
  }

  /**
   * Start the timer. Creates a new time span.
   */
  start(): void {
    this._isPaused = false;
    const timerRef = this.stateManager.getTimerRef();
    if (!timerRef || !this._runtime) {
      return;
    }

    const state = timerRef.get();
    if (!state) return;

    const spans = [...state.spans];

    // If already running, don't start again
    if (spans.length > 0 && !spans[spans.length - 1].stop) {
      return;
    }

    // Add new span
    const now = this._runtime.clock.now;
    spans.push({ start: now.getTime(), state: 'new' });
    this.startTime = now;

    this.stateManager.updateState(this._runtime, spans, true);
  }

  /**
   * Stop the timer. Closes the current time span.
   */
  stop(): void {
    // Capture elapsed time BEFORE setting paused flag
    // so getElapsedMs() still works correctly
    if (!this._isPaused) {
      this.elapsedMs = this.getElapsedMs();
    }
    this._isPaused = true;

    const timerRef = this.stateManager.getTimerRef();
    if (!timerRef) {
      return;
    }

    const state = timerRef.get();
    if (!state) return;

    const spans = [...state.spans];
    if (spans.length > 0 && !spans[spans.length - 1].stop) {
      const now = this._runtime?.clock.now ?? new Date();
      spans[spans.length - 1].stop = now.getTime();
    }

    // Always update state to mark as not running
    this.stateManager.updateState(this._runtime, spans, false);
  }

  /**
   * Pause the timer. Closes the current time span.
   */
  pause(): void {
    // Capture elapsed time BEFORE setting paused flag
    if (!this._isPaused) {
      this.elapsedMs = this.getElapsedMs();
    }
    this._isPaused = true;

    const timerRef = this.stateManager.getTimerRef();
    if (!timerRef) {
      return;
    }

    const state = timerRef.get();
    if (!state) return;

    const spans = [...state.spans];

    // If not running, nothing to pause
    if (spans.length === 0 || spans[spans.length - 1].stop) {
      return;
    }

    // Close the current span
    const now = this._runtime?.clock.now ?? new Date();
    spans[spans.length - 1].stop = now.getTime();

    this.stateManager.updateState(this._runtime, spans, false);
  }

  /**
   * Resume the timer. Creates a new time span.
   */
  resume(): void {
    this._isPaused = false;
    const timerRef = this.stateManager.getTimerRef();
    if (!timerRef) {
      // Fallback: adjust start time to preserve elapsed
      if (this._runtime) {
        const now = this._runtime.clock.now;
        this.startTime = new Date(now.getTime() - this.elapsedMs);
      }
      return;
    }

    const state = timerRef.get();
    if (!state) return;

    const spans = [...state.spans];

    // If already running, don't resume
    if (spans.length > 0 && !spans[spans.length - 1].stop) {
      return;
    }

    // Add new span
    const now = this._runtime?.clock.now ?? new Date();
    spans.push({ start: now.getTime(), state: 'new' });
    this.startTime = new Date(now.getTime() - this.elapsedMs);

    this.stateManager.updateState(this._runtime, spans, true);
  }

  /**
   * Cleanup: clear interval and remove event listeners.
   * Must complete in <50ms per performance contract.
   */
  onDispose(_runtime: IScriptRuntime, _block: IRuntimeBlock): void {
    this.stop();
  }

  /**
   * Get time spans for this timer from memory.
   */
  getTimeSpans(): TimerSpan[] {
    const timerRef = this.stateManager.getTimerRef();
    if (timerRef) {
      return timerRef.get()?.spans || [];
    }

    // Fallback for tests that don't use memory
    const elapsedMs = this.getElapsedMs();
    const now = (this._runtime?.clock.now ?? new Date()).getTime();
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

    // Use calculateDuration utility
    const now = (this._runtime?.clock.now ?? new Date()).getTime();
    return calculateDuration(
      spans.map(s => ({ start: s.start, stop: s.stop })),
      now
    );
  }

  /**
   * Reset the timer. Clears all time spans and stops the timer.
   */
  reset(): void {
    this._isPaused = false;
    this.elapsedMs = 0;
    this.startTime = new Date();

    this.stateManager.resetState();
  }

  /**
   * Restart the timer. Resets state and starts immediately.
   * Used for interval timers (EMOM).
   */
  restart(): void {
    // 1. Reset internal state
    this._isPaused = false;
    this.elapsedMs = 0;

    const now = this._runtime?.clock.now ?? new Date();
    this.startTime = now;

    // 2. Reset memory state and start new span
    this.stateManager.updateState(this._runtime, [{ start: now.getTime(), state: 'new' }], true);
  }
}
