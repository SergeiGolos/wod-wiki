import { RuntimeStackTracker, TrackerUpdate } from '../contracts/IRuntimeOptions';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';

/**
 * WorkoutTracker - Implementation of RuntimeStackTracker that maintains
 * real-time state of workout metrics and notifies subscribers of updates.
 */
export class WorkoutTracker implements RuntimeStackTracker {
    private metrics = new Map<string, Map<string, { value: any; unit?: string }>>();
    private rounds = new Map<string, { current: number; total?: number }>();
    private listeners = new Set<(update: TrackerUpdate) => void>();

    /**
     * Record a metric update (e.g., reps, weight, distance)
     */
    recordMetric(blockId: string, metricKey: string, value: any, unit?: string): void {
        console.log(`[WorkoutTracker] recordMetric: block=${blockId}, key=${metricKey}, value=${value}, unit=${unit}`);
        let blockMetrics = this.metrics.get(blockId);
        if (!blockMetrics) {
            blockMetrics = new Map();
            this.metrics.set(blockId, blockMetrics);
        }

        blockMetrics.set(metricKey, { value, unit });

        this.notify({
            type: 'metric',
            blockId,
            key: metricKey,
            value,
            unit,
            timestamp: Date.now()
        });
    }

    /**
     * Record a round update
     */
    recordRound(blockId: string, current: number, total?: number): void {
        console.log(`[WorkoutTracker] recordRound: block=${blockId}, current=${current}, total=${total}`);
        this.rounds.set(blockId, { current, total });

        this.notify({
            type: 'round',
            blockId,
            current,
            total,
            timestamp: Date.now()
        });
    }

    /**
     * Subscribe to real-time updates
     */
    onUpdate(callback: (update: TrackerUpdate) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Get the current value of a metric for a block
     */
    getMetric(blockId: string, metricKey: string): { value: any; unit?: string } | undefined {
        return this.metrics.get(blockId)?.get(metricKey);
    }

    /**
     * Get the current round for a block
     */
    getRounds(blockId: string): { current: number; total?: number } | undefined {
        return this.rounds.get(blockId);
    }

    /**
     * Get a snapshot of the current state.
     */
    getSnapshot(): { metrics: Record<string, Record<string, { value: any; unit?: string }>>, rounds: Record<string, { current: number; total?: number }> } {
        const metricsSnapshot: Record<string, Record<string, { value: any; unit?: string }>> = {};
        for (const [blockId, blockMetrics] of this.metrics.entries()) {
            const entry: Record<string, { value: any; unit?: string }> = {};
            for (const [key, data] of blockMetrics.entries()) {
                entry[key] = data;
            }
            metricsSnapshot[blockId] = entry;
        }

        const roundsSnapshot: Record<string, { current: number; total?: number }> = {};
        for (const [blockId, roundData] of this.rounds.entries()) {
            roundsSnapshot[blockId] = roundData;
        }

        return {
            metrics: metricsSnapshot,
            rounds: roundsSnapshot
        };
    }

    /**
     * Clear all tracked data
     */
    clear(): void {
        this.metrics.clear();
        this.rounds.clear();
    }

    private notify(update: TrackerUpdate): void {
        for (const listener of this.listeners) {
            try {
                listener(update);
            } catch (err) {
                console.error('[WorkoutTracker] Error notifying listener:', err);
            }
        }
    }

    // --- RuntimeStackTracker Span methods (optional for this tracker) ---

    startSpan(_block: IRuntimeBlock, _parentSpanId: string | null): void {
        // WorkoutTracker doesn't currently care about spans, 
        // but could be used to initialize block state.
    }

    endSpan(_blockKey: string): void {
        // Could be used to finalize/freeze metrics for a block.
    }
}
