import type { IRuntimeClock } from '../IRuntimeClock';

/**
 * Lifecycle options propagated through block mount / next / unmount calls.
 *
 * Lives in the primitives layer (rather than `IRuntimeBlock.ts`) so that
 * `IScriptRuntime` can reference it without importing the full
 * `IRuntimeBlock` interface — breaking the cycle
 * `IRuntimeBlock ↔ IScriptRuntime`.
 */
export interface BlockLifecycleOptions {
    /** Start timestamp when the block was pushed onto the stack. */
    startTime?: Date;
    /** Completion timestamp when the block was popped from the stack. */
    completedAt?: Date;
    /** Current timestamp for the operation (onNext, etc). */
    now?: Date;

    /**
     * Clock to use for this lifecycle operation.
     *
     * If provided, this clock is passed to behaviors and child operations,
     * allowing consistent timing during execution chains (pop → next → push).
     *
     * Use `SnapshotClock.at(clock, time)` to freeze time during an execution chain:
     * - When a timer expires at T₁, create a snapshot at T₁
     * - Pass the snapshot through pop → parent.next → child push
     * - All operations see T₁ as `clock.now`, ensuring no timing gaps
     *
     * If not provided, defaults to `runtime.clock`.
     */
    clock?: IRuntimeClock;
}
