import { IRuntimeSubscription } from '../contracts/IRuntimeSubscription';
import { StackSnapshot } from '../contracts/IRuntimeStack';
import { IOutputStatement } from '@/core/models/OutputStatement';
import { TrackerUpdate } from '../contracts/IRuntimeOptions';

/**
 * LocalRuntimeSubscription — a no-op subscription that simply receives
 * stack snapshots and output statements without transforming them.
 *
 * This is the "identity" subscription: the SubscriptionManager fans out
 * runtime events to all subscriptions, and the local one simply consumes
 * them for any local-side effect (e.g., updating the workbench store).
 *
 * An optional callback can be provided for each event type to allow
 * the consumer to react to state changes.
 */
export class LocalRuntimeSubscription implements IRuntimeSubscription {
    readonly id: string;

    private onStackSnapshotCallback?: (snapshot: StackSnapshot) => void;
    private onOutputCallback?: (output: IOutputStatement) => void;
    private onTrackerUpdateCallback?: (update: TrackerUpdate) => void;

    constructor(options?: {
        id?: string;
        onStackSnapshot?: (snapshot: StackSnapshot) => void;
        onOutput?: (output: IOutputStatement) => void;
        onTrackerUpdate?: (update: TrackerUpdate) => void;
    }) {
        this.id = options?.id ?? 'local';
        this.onStackSnapshotCallback = options?.onStackSnapshot;
        this.onOutputCallback = options?.onOutput;
        this.onTrackerUpdateCallback = options?.onTrackerUpdate;
    }

    onStackSnapshot(snapshot: StackSnapshot): void {
        this.onStackSnapshotCallback?.(snapshot);
    }

    onOutput(output: IOutputStatement): void {
        this.onOutputCallback?.(output);
    }

    onTrackerUpdate(update: TrackerUpdate): void {
        this.onTrackerUpdateCallback?.(update);
    }

    dispose(): void {
        this.onStackSnapshotCallback = undefined;
        this.onOutputCallback = undefined;
        this.onTrackerUpdateCallback = undefined;
    }
}
