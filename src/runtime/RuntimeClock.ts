import { IRuntimeClock } from './contracts/IRuntimeClock';
import { TimeSpan } from './models/TimeSpan';


/**
 * SnapshotClock wraps an IRuntimeClock and freezes `now` at a specific timestamp.
 * Used to ensure consistent timing during execution chains (pop → next → push).
 * 
 * All other properties and methods delegate to the underlying clock.
 * 
 * @example
 * ```typescript
 * // Freeze time at completion moment
 * const completedAt = new Date();
 * const snapshot = SnapshotClock.at(runtime.clock, completedAt);
 * 
 * // All operations see the same frozen time
 * parent.next(runtime, { clock: snapshot });
 * // child pushed with startTime = snapshot.now = completedAt
 * ```
 */
export class SnapshotClock implements IRuntimeClock {
    constructor(
        private readonly _underlying: IRuntimeClock,
        private readonly _frozenTime: Date
    ) {}

    /** Always returns the frozen timestamp */
    get now(): Date {
        return this._frozenTime;
    }

    /** Delegate to underlying clock */
    get elapsed(): number {
        return this._underlying.elapsed;
    }

    get isRunning(): boolean {
        return this._underlying.isRunning;
    }

    get spans(): ReadonlyArray<TimeSpan> {
        return this._underlying.spans;
    }

    start(): Date {
        return this._underlying.start();
    }

    stop(): Date {
        return this._underlying.stop();
    }

    /**
     * Create a snapshot of a clock at a specific time.
     * Factory method for cleaner creation.
     * 
     * @param clock The underlying clock to wrap
     * @param time The frozen timestamp to return from `now`
     */
    static at(clock: IRuntimeClock, time: Date): SnapshotClock {
        return new SnapshotClock(clock, time);
    }

    /**
     * Create a snapshot at the clock's current time.
     * Useful for freezing "now" before starting an execution chain.
     * 
     * @param clock The clock to snapshot
     */
    static now(clock: IRuntimeClock): SnapshotClock {
        return new SnapshotClock(clock, clock.now);
    }
}


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
