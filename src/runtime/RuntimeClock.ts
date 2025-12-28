import { IRuntimeClock } from './contracts/IRuntimeClock';
import { TimeSpan } from './models/TimeSpan';


/**
 * RuntimeClock tracks time using spans created by start/stop calls.
 * 
 * Provides:
 * - `now`: Current wall-clock time as a Date
 * - `elapsed`: Total milliseconds of running time (sum of all spans)
 * - `start()`/`stop()`: Control methods that return timestamps for event creation
 */
export class RuntimeClock implements IRuntimeClock {
    private _spans: TimeSpan[] = [];

    /**
     * Current wall-clock time as a Date.
     */
    public get now(): Date {
        return new Date();
    }

    /**
     * Whether the clock is currently running (has an open span without a stop time).
     */
    public get isRunning(): boolean {
        if (this._spans.length === 0) return false;
        return this._spans[this._spans.length - 1].isOpen;
    }

    /**
     * All time spans tracked by this clock.
     */
    public get spans(): ReadonlyArray<TimeSpan> {
        return this._spans;
    }

    /**
     * Total elapsed milliseconds while running.
     * Sums all completed spans plus the current running span (if any).
     */
    public get elapsed(): number {
        return this._spans.reduce((total, span) => total + span.duration, 0);
    }

    /**
     * Start the clock. Creates a new span with the current time.
     * Returns the start timestamp for event creation.
     * 
     * If the clock is already running, returns the current span's start time.
     */
    public start(): Date {
        const now = new Date();
        // If already running, return the current span's start
        if (this.isRunning) {
            return this._spans[this._spans.length - 1].startDate;
        }

        this._spans.push(new TimeSpan(now.getTime()));
        return now;
    }

    /**
     * Stop the clock. Closes the current span with the current time.
     * Returns the stop timestamp for event creation.
     * 
     * If the clock is not running, returns the current time.
     */
    public stop(): Date {
        const now = new Date();

        // If not running, just return current time
        if (!this.isRunning) {
            return now;
        }

        // Close the current span
        this._spans[this._spans.length - 1].ended = now.getTime();
        return now;
    }

    /**
     * Reset the clock. Clears all spans.
     */
    public reset(): void {
        this._spans = [];
    }
}

/**
 * Creates a mock clock for testing with controllable time.
 */
export function createMockClock(initialTime: Date = new Date()): IRuntimeClock & {
    /** Advance the mock time by the specified milliseconds */
    advance: (ms: number) => void;
    /** Set the mock time to a specific Date */
    setTime: (time: Date) => void;
} {
    let currentTime = initialTime;
    const spans: TimeSpan[] = [];

    return {
        get now() { return currentTime; },
        get elapsed() {
            return spans.reduce((total, span) => total + span.duration, 0);
        },
        get isRunning() {
            if (spans.length === 0) return false;
            return spans[spans.length - 1].isOpen;
        },
        get spans() { return spans; },
        start() {
            if (spans.length > 0 && spans[spans.length - 1].ended === undefined) {
                return spans[spans.length - 1].startDate;
            }
            const timestamp = new Date(currentTime);
            spans.push(new TimeSpan(timestamp.getTime()));
            return timestamp;
        },
        stop() {
            const timestamp = new Date(currentTime);
            if (spans.length > 0 && spans[spans.length - 1].ended === undefined) {
                spans[spans.length - 1].ended = timestamp.getTime();
            }
            return timestamp;
        },
        advance(ms: number) {
            currentTime = new Date(currentTime.getTime() + ms);
        },
        setTime(time: Date) {
            currentTime = time;
        },
    };
}
