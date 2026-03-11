import { StackSnapshot } from './IRuntimeStack';
import { IOutputStatement } from '../../core/models/OutputStatement';
import { TrackerUpdate } from './IRuntimeOptions';

/**
 * A subscription that receives runtime state updates.
 *
 * Implementations determine what happens with the data:
 * - LocalRuntimeSubscription updates the workbench store (local UI)
 * - ChromecastRuntimeSubscription serializes and sends over RPC transport
 *
 * Multiple subscriptions can be active simultaneously. The SubscriptionManager
 * fans out stack snapshots and output statements to all registered subscriptions.
 */
export interface IRuntimeSubscription {
    /** Unique identifier for add/remove tracking */
    readonly id: string;

    /**
     * Called when a stack mutation occurs (push/pop/clear/initial).
     * The snapshot contains the full block list, the affected block, and timing.
     */
    onStackSnapshot(snapshot: StackSnapshot): void;

    /**
     * Called when an output statement is emitted (block unmount, milestone, etc.).
     */
    onOutput(output: IOutputStatement): void;

    /**
     * Called when a real-time tracker update occurs (reps, rounds).
     */
    onTrackerUpdate(update: TrackerUpdate): void;

    /**
     * Clean up resources held by this subscription (unsubscribe listeners, close channels, etc.).
     */
    dispose(): void;
}
