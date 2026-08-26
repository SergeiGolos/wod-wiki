import { TimeSpan } from '../models/TimeSpan';
import type { INowProvider } from '../INowProvider';

/**
 * IRuntimeClock provides time tracking for the runtime.
 *
 * It maintains a list of time spans created by start/stop calls,
 * and provides:
 * - `currentDate`: Current wall-clock time as a Date
 * - `elapsed`: Total milliseconds of running time (sum of all spans)
 * - `start()`/`stop()`: Control methods that return timestamps for event creation
 *
 * Renamed from `now` → `currentDate` to free the `now()` method for the INowProvider seam.
 * Callers should use `clock.now()` for the provider contract, `clock.currentDate` for the raw Date.
 */
export interface IRuntimeClock extends INowProvider {
    /** Current wall-clock time as a Date */
    readonly currentDate: Date;

    /** Total elapsed milliseconds while running (sum of all completed spans + current running span) */
    readonly elapsed: number;

    /** Whether the clock is currently running (has an open span) */
    readonly isRunning: boolean;

    /** All time spans tracked by this clock */
    readonly spans: ReadonlyArray<TimeSpan>;

    /** Start the clock, returns the start timestamp for event creation */
    start(): Date;

    /** Stop the clock, returns the stop timestamp for event creation */
    stop(): Date;
}
