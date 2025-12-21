/**
 * A span of time tracked by the clock.
 */
export interface ClockSpan {
    start: Date;
    stop?: Date;
}

/**
 * IRuntimeClock provides time tracking for the runtime.
 * 
 * It maintains a list of time spans created by start/stop calls,
 * and provides:
 * - `now`: Current wall-clock time as a Date
 * - `elapsed`: Total milliseconds of running time (sum of all spans)
 * - `start()`/`stop()`: Control methods that return timestamps for event creation
 */
export interface IRuntimeClock {
    /** Current wall-clock time as a Date */
    readonly now: Date;

    /** Total elapsed milliseconds while running (sum of all completed spans + current running span) */
    readonly elapsed: number;

    /** Whether the clock is currently running (has an open span) */
    readonly isRunning: boolean;

    /** All time spans tracked by this clock */
    readonly spans: ReadonlyArray<ClockSpan>;

    /** Start the clock, returns the start timestamp for event creation */
    start(): Date;

    /** Stop the clock, returns the stop timestamp for event creation */
    stop(): Date;
}
