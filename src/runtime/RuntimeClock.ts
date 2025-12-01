import { ITickable } from './ITickable';

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
