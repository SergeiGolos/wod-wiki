/**
 * Interface for objects that need to receive tick updates from the RuntimeClock.
 */
export interface ITickable {
    /**
     * Called on every clock tick.
     * @param timestamp Current timestamp (performance.now())
     * @param elapsed Time elapsed since the last tick in milliseconds
     */
    onTick(timestamp: number, elapsed: number): void;
}
