/**
 * Interface for behaviors that expose timer/time-tracking data and control.
 * 
 * Timer source behaviors track elapsed time, remaining time, and timer state.
 * They support both count-up (stopwatch) and count-down (timer) modes.
 * 
 * @example Implementations
 * - TimerBehavior: Core timer with start/stop/pause/resume/reset
 * - BoundTimerBehavior: Timer with fixed duration (convenience constructor)
 * - UnboundTimerBehavior: Timer without fixed duration (stopwatch mode)
 * 
 * @example Usage
 * ```typescript
 * const timer = block.getBehavior<ITimerSource>(TimerBehavior);
 * const elapsed = timer?.getElapsedMs() ?? 0;
 * const remaining = timer?.getRemainingMs() ?? 0;
 * if (timer?.isComplete()) { ... }
 * ```
 */
export interface ITimerSource {
    /** The timer direction: 'up' for count-up (stopwatch), 'down' for countdown. */
    readonly direction: 'up' | 'down';

    /** The timer duration in milliseconds (undefined for unbounded timers). */
    readonly durationMs?: number;

    /** Gets elapsed time in milliseconds since the timer started. */
    getElapsedMs(now?: Date): number;

    /** Gets remaining time in milliseconds (0 for count-up or unbounded timers). */
    getRemainingMs(now?: Date): number;

    /** Checks if timer is complete (elapsed >= duration for countdown timers). */
    isComplete(now?: Date): boolean;

    /** Checks if the timer is currently paused. */
    isPaused(): boolean;

    /** Checks if the timer is currently running. */
    isRunning(): boolean;

    /** Starts the timer. */
    start(now?: Date): void;

    /** Stops the timer, preserving elapsed time. */
    stop(now?: Date): void;

    /** Resets the timer to zero and immediately starts. */
    restart(now?: Date): void;
}

/**
 * Type guard to check if a behavior implements ITimerSource
 */
export function isTimerSource(behavior: unknown): behavior is ITimerSource {
    return (
        typeof behavior === 'object' &&
        behavior !== null &&
        'direction' in behavior &&
        'getElapsedMs' in behavior &&
        typeof (behavior as ITimerSource).getElapsedMs === 'function' &&
        'isComplete' in behavior &&
        typeof (behavior as ITimerSource).isComplete === 'function'
    );
}
