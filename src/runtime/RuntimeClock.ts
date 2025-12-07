import { ITickable } from './ITickable';

export interface RuntimeTimestamp {
    wallTimeMs: number;
    monotonicTimeMs: number;
}

/**
 * Safely capture a runtime timestamp even if a full RuntimeClock instance is not available.
 * Falls back to Date.now/performance.now when running in tests with partial runtime stubs.
 */
export function captureRuntimeTimestamp(
    clock?: { captureTimestamp?: (seed?: Partial<RuntimeTimestamp>) => RuntimeTimestamp },
    seed?: Partial<RuntimeTimestamp>
): RuntimeTimestamp {
    const capture = clock?.captureTimestamp;
    if (capture) {
        return capture.call(clock, seed);
    }

    const wallTimeMs = seed?.wallTimeMs ?? Date.now();
    const monotonicTimeMs = seed?.monotonicTimeMs ?? (typeof performance !== 'undefined' && performance.now ? performance.now() : wallTimeMs);
    return { wallTimeMs, monotonicTimeMs };
}

/**
 * RuntimeClock manages the central execution loop for the runtime.
 * It replaces individual setInterval/setTimeout calls scattered across behaviors.
 */
export class RuntimeClock {
    private _isRunning = false;
    private _tickables: Set<ITickable> = new Set();
    private _animationFrameId?: number;
    private _lastTickTime = 0;

    /**
     * Current timestamp (performance.now())
     */
    public get now(): number {
        return performance.now();
    }

    /**
     * Capture a timestamp with both wall-clock and monotonic sources using a shared sampling point.
     * Allows callers to seed one or both values (e.g., from a parent block) while ensuring the
     * other component is captured from the current clock to keep the pair consistent.
     */
    public captureTimestamp(seed?: Partial<RuntimeTimestamp>): RuntimeTimestamp {
        return {
            wallTimeMs: seed?.wallTimeMs ?? Date.now(),
            monotonicTimeMs: seed?.monotonicTimeMs ?? this.now,
        };
    }

    /**
     * Whether the clock is currently running
     */
    public get isRunning(): boolean {
        return this._isRunning;
    }

    /**
     * Start the clock loop.
     */
    public start(): void {
        if (this._isRunning) return;

        this._isRunning = true;
        this._lastTickTime = this.now;
        this._tick();
    }

    /**
     * Stop the clock loop.
     */
    public stop(): void {
        this._isRunning = false;
        if (this._animationFrameId !== undefined) {
            if (typeof cancelAnimationFrame !== 'undefined') {
                cancelAnimationFrame(this._animationFrameId);
            } else {
                clearTimeout(this._animationFrameId);
            }
            this._animationFrameId = undefined;
        }
    }

    /**
     * Register a tickable object to receive updates.
     */
    public register(tickable: ITickable): void {
        this._tickables.add(tickable);
    }

    /**
     * Unregister a tickable object.
     */
    public unregister(tickable: ITickable): void {
        this._tickables.delete(tickable);
    }

    /**
     * Main loop tick.
     */
    private _tick = (): void => {
        if (!this._isRunning) return;

        const now = this.now;
        const elapsed = now - this._lastTickTime;
        this._lastTickTime = now;

        // Notify all listeners
        for (const tickable of this._tickables) {
            try {
                tickable.onTick(now, elapsed);
            } catch (error) {
                console.error('Error in RuntimeClock tick listener:', error);
            }
        }

        // Schedule next frame
        if (typeof requestAnimationFrame !== 'undefined') {
            this._animationFrameId = requestAnimationFrame(this._tick);
        } else {
            // Fallback for Node.js/Test environments
            this._animationFrameId = setTimeout(this._tick, 16) as any;
        }
    };

    /**
     * Manually trigger a tick (useful for testing).
     */
    public manualTick(timestamp: number): void {
        const elapsed = timestamp - this._lastTickTime;
        this._lastTickTime = timestamp;

        for (const tickable of this._tickables) {
            tickable.onTick(timestamp, elapsed);
        }
    }
}
