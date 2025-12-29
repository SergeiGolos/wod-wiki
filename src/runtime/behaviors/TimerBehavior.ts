import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions, IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IEvent } from '../contracts/events/IEvent';
import { EmitEventAction } from '../actions/events/EmitEventAction';
import { TimeSpan } from '../models/TimeSpan';
import { TimerStateManager } from './TimerStateManager';

/**
 * TimerBehavior manages time tracking for workout blocks.
 */
export class TimerBehavior implements IRuntimeBehavior {
  private startTime: Date = new Date(); // Wall-clock start time
  private elapsedMs = 0;
  private _isPaused = false;
  private stateManager: TimerStateManager;

  constructor(
    public readonly direction: 'up' | 'down' = 'up',
    public readonly durationMs?: number,
    label: string = 'Timer',
    private readonly role: 'primary' | 'secondary' | 'auto' = 'auto',
    private readonly autoStart: boolean = true
  ) {
    if (direction !== 'up' && direction !== 'down') {
      throw new TypeError(`Invalid timer direction: ${direction}. Must be 'up' or 'down'.`);
    }
    this.stateManager = new TimerStateManager(direction, durationMs, label);
  }

  onPush(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    const now = options?.startTime ?? new Date();
    this.startTime = now;
    this.elapsedMs = 0;
    this._isPaused = !this.autoStart;

    const actions: IRuntimeAction[] = [];

    // Emit timer:started event via action
    actions.push(new EmitEventAction('timer:started', {
      blockId: block.key.toString(),
      direction: this.direction,
      startTime: now.getTime(),
    }, now));

    // Initialize state manager
    actions.push(...this.stateManager.initialize(block, now.getTime(), this.role, this.autoStart));

    return actions;
  }

  onPop(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    const completedAt = options?.completedAt ?? new Date();
    const finalElapsed = this.getElapsedAt(completedAt);

    const actions: IRuntimeAction[] = [
      new EmitEventAction('timer:complete', {
        blockId: block.key.toString(),
        direction: this.direction,
        elapsedMs: finalElapsed,
        durationMs: this.durationMs,
      }, completedAt)
    ];

    actions.push(...this.stateManager.cleanup(block));
    return actions;
  }

  onDispose(_block: IRuntimeBlock): void {
    this.stop();
  }

  /**
   * Get current elapsed time in milliseconds.
   */
  getElapsedMs(now?: Date): number {
    return this.getElapsedAt(now ?? new Date());
  }

  /**
   * Get remaining time in milliseconds for countdown timers.
   */
  getRemainingMs(now?: Date): number {
    if (this.direction === 'up' || !this.durationMs) return 0;
    const elapsed = this.getElapsedMs(now);
    return Math.max(0, this.durationMs - elapsed);
  }

  /**
   * Get display time in seconds (rounded to 0.1s).
   */
  getDisplayTime(now?: Date): number {
    return Math.round(this.getElapsedMs(now) / 100) / 10;
  }

  getElapsedAt(now: Date): number {
    if (this._isPaused) {
      return this.elapsedMs;
    }
    return now.getTime() - this.startTime.getTime();
  }

  isComplete(now?: Date): boolean {
    if (this.durationMs !== undefined) {
      return this.getElapsedAt(now ?? new Date()) >= this.durationMs;
    }
    return false;
  }

  isPaused(): boolean {
    return this._isPaused;
  }

  isRunning(): boolean {
    const timerRef = this.stateManager.getTimerRef();
    if (timerRef) {
      const state = timerRef.get();
      return state?.isActive() || false;
    }
    return !this._isPaused;
  }

  start(now: Date = new Date()): void {
    this._isPaused = false;
    const timerRef = this.stateManager.getTimerRef();
    if (!timerRef) {
      this.startTime = now;
      return;
    }

    const state = timerRef.get();
    if (!state) return;
    if (state.isActive()) return;

    state.start(now.getTime());
    this.startTime = now;
    this.stateManager.updateState(state.spans, true);
  }

  stop(now: Date = new Date()): void {
    if (!this._isPaused) {
      this.elapsedMs = this.getElapsedAt(now);
    }
    this._isPaused = true;

    const timerRef = this.stateManager.getTimerRef();
    if (!timerRef) return;

    const state = timerRef.get();
    if (!state) return;

    if (state.isActive()) {
      state.stop(now.getTime());
    }
    this.stateManager.updateState(state.spans, false);
  }

  pause(now: Date = new Date()): void {
    this.stop(now);
  }

  resume(now: Date = new Date()): void {
    this._isPaused = false;
    const timerRef = this.stateManager.getTimerRef();

    if (!timerRef) {
      this.startTime = new Date(now.getTime() - this.elapsedMs);
      return;
    }

    const state = timerRef.get();
    if (!state) return;

    if (state.isActive()) return;

    state.resume(now.getTime());
    this.startTime = new Date(now.getTime() - this.elapsedMs);

    this.stateManager.updateState(state.spans, true);
  }

  reset(now: Date = new Date()): void {
    this._isPaused = true;
    this.elapsedMs = 0;
    this.startTime = now;

    const span = this.stateManager.getTimerRef()?.get();
    if (span) {
      span.reset();
      this.stateManager.updateState(span.spans, false);
    }
  }

  restart(now: Date = new Date()): void {
    this._isPaused = false;
    this.elapsedMs = 0;
    this.startTime = now;

    const span = this.stateManager.getTimerRef()?.get();
    if (span) {
      span.reset();
      span.start(now.getTime());
      this.stateManager.updateState(span.spans, true);
    }
  }
}
