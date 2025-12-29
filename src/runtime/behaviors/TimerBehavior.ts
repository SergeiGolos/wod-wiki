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
    private readonly direction: 'up' | 'down' = 'up',
    private readonly durationMs?: number,
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

    // Emit timer:complete event
    // Note: getElapsedMs() will use local calculated elapsedMs if available, or fallback.
    // Ideally we assume options.completedAt is the end time.
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

  // Note: onNext is typically not used by TimerBehavior unless it needs to react to children.
  // Since this is a timer block, it usually relies on external storage updates or events.

  onDispose(block: IRuntimeBlock): void {
    // Dispose logic if needed. Usually logic is in onPop.
    // If the block is disposed without pop (e.g. error), this might run.
  }

  /**
   * Get current elapsed time in milliseconds relative to a given time.
   * If now is not provided, it falls back to stored calculated elapsed time (which might be stale if running).
   * Note: This method is tricky without access to 'runtime.clock.now'. 
   * Consumers should prefer reading from Memory via TimerStateManager state.
   */
  getElapsedAt(now: Date): number {
    if (this._isPaused) {
      return this.elapsedMs;
    }
    return now.getTime() - this.startTime.getTime();
  }

  /**
   * Check if timer is complete.
   * Requires 'now' to be passed in since we don't have access to runtime clock.
   */
  isComplete(now: Date): boolean {
    if (this.direction === 'down' && this.durationMs !== undefined) {
      return this.getElapsedAt(now) >= this.durationMs;
    }
    return false;
  }

  isRunning(): boolean {
    // We can check memory too if we had access to block context here, but we don't store block context on 'this'.
    // We rely on local state 'isPaused' which mirrors the logic.
    // But 'TimerStateManager' keeps a ref.
    const timerRef = this.stateManager.getTimerRef();
    if (timerRef) {
      return timerRef.get()?.isActive() || false;
    }
    return !this._isPaused;
  }

  // Methods like start(), stop(), pause(), resume(), restart() modify state.
  // They previously used 'runtime' to get 'now'.
  // They should now accept 'now' as argument or be invoked via an Action handler that has runtime access.
  // Converting them to take 'now' as explicit arg.

  start(now: Date = new Date()): void {
    this._isPaused = false;
    const timerRef = this.stateManager.getTimerRef();
    if (!timerRef) return;

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
    // Same as stop for now
    this.stop(now);

    // Specific pause logic in span if needed
    const timerRef = this.stateManager.getTimerRef();
    if (timerRef) {
      const state = timerRef.get();
      if (state) state.pause(now.getTime());
    }
  }

  resume(now: Date = new Date()): void {
    this._isPaused = false;
    const timerRef = this.stateManager.getTimerRef();

    // Fallback if no ref (rare)
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
