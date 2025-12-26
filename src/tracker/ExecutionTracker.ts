
import { IRuntimeMemory } from '../runtime/IRuntimeMemory';
import { IRuntimeBlock } from '../runtime/IRuntimeBlock';
import { TypedMemoryReference } from '../runtime/IMemoryReference';
import {
    TrackedSpan,
    SpanStatus,
    SpanMetrics,
    SegmentType,
    TimeSegment,
    DebugMetadata,
    EXECUTION_SPAN_TYPE
} from '../runtime/models/TrackedSpan';
import { ICodeFragment } from '../core/models/CodeFragment';
import { ITrackerCommand, TrackerContext } from './ITrackerCommand';
import { TrackSpanCommand, TrackSpanPayload } from './commands/TrackSpanCommand';
import { TrackSectionCommand, TrackSectionPayload } from './commands/TrackSectionCommand';
import { TrackEventCommand, TrackEventPayload } from './commands/TrackEventCommand';

/**
 * ExecutionTracker
 * 
 * Central service for tracking workout execution with unified metrics collection.
 * Uses Command Pattern to abstract write operations.
 */
export class ExecutionTracker {
    constructor(private readonly memory: IRuntimeMemory) { }

    /**
     * Ecexutes a tracker command.
     */
    execute(command: ITrackerCommand): TrackedSpan[] {
        const context: TrackerContext = { memory: this.memory };
        return command.write(context);
    }

    // ============================================================================
    // Facade Methods (Adapting to Command Pattern)
    // ============================================================================

    startSpan(
        block: IRuntimeBlock,
        parentSpanId: string | null,
        debugMetadata?: DebugMetadata
    ): TrackedSpan {
        const payload: TrackSpanPayload = {
            action: 'start',
            blockId: block.key.toString(),
            block,
            parentSpanId,
            debugMetadata
        };
        const result = this.execute(new TrackSpanCommand(payload));
        return result[0];
    }

    appendFragments(blockId: string, fragments: ICodeFragment[]): void {
        this.execute(new TrackSpanCommand({
            action: 'update',
            blockId,
            fragments
        }));
    }

    endSpan(blockId: string, status: SpanStatus = 'completed'): void {
        const payload: TrackSpanPayload = {
            action: 'end', // or fail/skip if status is distinct, but let's use end + status
            blockId,
            status // TrackSpanCommand.handleEnd handles status override if 'completed' isn't hardcoded
        };

        // Note: TrackSpanCommand.handleEnd logic relies on action for fail/skip.
        // If status is 'failed', action should be 'fail'?
        let action: 'end' | 'fail' | 'skip' = 'end';
        if (status === 'failed') action = 'fail';
        if (status === 'skipped') action = 'skip';

        this.execute(new TrackSpanCommand({
            action,
            blockId,
            status
        }));
    }

    failSpan(blockId: string): void {
        this.execute(new TrackSpanCommand({
            action: 'fail',
            blockId
        }));
    }

    skipSpan(blockId: string): void {
        this.execute(new TrackSpanCommand({
            action: 'skip',
            blockId
        }));
    }

    recordMetric<T>(
        blockId: string,
        metricKey: keyof SpanMetrics | string,
        value: T,
        unit: string,
        source?: string
    ): void {
        // Construct metric object
        // Note: TrackSpanCommand expects `metrics?: Partial<SpanMetrics>`
        // We need to construct the partial object.

        // This logic was complex in original tracker (handling custom vs known keys).
        // It's probably better to keep that complexity in the command or do it here.
        // Let's do it here to keep Command simple, or pass enough info to Command?
        // Actually, if I want `TrackSpanCommand` to reference `recordMetric`, it needs to know how to structure it.
        // It's cleaner to format the metric here and pass it as an update.

        const metricValue = {
            value,
            unit,
            recorded: Date.now(),
            source
        };

        const metrics: any = {};
        if (this.isKnownMetricKey(metricKey)) {
            metrics[metricKey] = metricValue;
        } else {
            const custom = new Map();
            custom.set(metricKey, metricValue);
            metrics.custom = custom;
        }

        this.execute(new TrackSpanCommand({
            action: 'update',
            blockId,
            metrics
        }));
    }

    recordNumericMetric(
        blockId: string,
        metricKey: 'reps' | 'weight' | 'distance' | 'duration' | 'elapsed' | 'remaining' | 'calories',
        value: number,
        unit: string,
        source?: string
    ): void {
        this.recordMetric(blockId, metricKey, value, unit, source);
    }

    recordRound(
        blockId: string,
        currentRound: number,
        totalRounds?: number,
        repScheme?: number[]
    ): void {
        const metrics: Partial<SpanMetrics> = {
            currentRound,
            ...(totalRounds !== undefined && { totalRounds }),
            ...(repScheme && { repScheme })
        };

        this.execute(new TrackSpanCommand({
            action: 'update',
            blockId,
            metrics
        }));
    }

    startSegment(
        blockId: string,
        type: SegmentType,
        label: string,
        index?: number
    ): TimeSegment | null {
        // We need to fetch the span to return the created segment?
        // The command returns updated spans.
        const result = this.execute(new TrackSectionCommand({
            action: 'start',
            blockId,
            type,
            label,
            index
        }));

        if (result.length > 0) {
            const span = result[0];
            return span.segments[span.segments.length - 1]; // Assumption: pushed to end
        }
        return null;
    }

    endSegment(blockId: string, segmentId?: string): void {
        this.execute(new TrackSectionCommand({
            action: 'end',
            blockId,
            segmentId
        }));
    }

    endAllSegments(blockId: string): void {
        this.execute(new TrackSectionCommand({
            action: 'end-all',
            blockId
        }));
    }

    addDebugLog(blockId: string, message: string): void {
        this.execute(new TrackEventCommand({
            action: 'log',
            blockId,
            message
        }));
    }

    addDebugTag(blockId: string, tag: string): void {
        this.execute(new TrackEventCommand({
            action: 'tag',
            blockId,
            tag
        }));
    }

    setDebugContext(blockId: string, context: Record<string, unknown>): void {
        this.execute(new TrackEventCommand({
            action: 'context',
            blockId,
            context
        }));
    }

    setDebugMetadata(blockId: string, debugMetadata: DebugMetadata): void {
        // TrackSpanCommand update allows replacing debugMetadata?
        // My implementation of TrackSpanCommand update merges.
        // If I want to set strictly, I might need a flag or just assume merge is fine.
        // Original was strict replace? `this.updateSpan(blockId, { debugMetadata });`
        // My command does: `...updatedDebugMetadata, ...debugMetadata`

        // Let's use TrackSpanCommand update as it supports debugMetadata update.
        this.execute(new TrackSpanCommand({
            action: 'update',
            blockId,
            debugMetadata
        }));
    }

    // ============================================================================
    // Queries (Read-only)
    // ============================================================================

    getActiveSpan(blockId: string): TrackedSpan | null {
        const ref = this.findSpanRef(blockId);
        if (!ref) return null;

        const span = this.memory.get(ref);
        return (span && span.status === 'active') ? span : null;
    }

    getActiveSpanId(blockId: string): string | null {
        const span = this.getActiveSpan(blockId);
        return span?.id ?? null;
    }

    getAllSpans(): TrackedSpan[] {
        const refs = this.memory.search({
            type: EXECUTION_SPAN_TYPE,
            id: null,
            ownerId: null,
            visibility: null
        });

        return refs
            .map(ref => this.memory.get(ref as TypedMemoryReference<TrackedSpan>))
            .filter((s): s is TrackedSpan => s !== null);
    }

    getCompletedSpans(): TrackedSpan[] {
        return this.getAllSpans().filter(s => s.status === 'completed');
    }

    getActiveSpansMap(): Map<string, TrackedSpan> {
        const map = new Map<string, TrackedSpan>();

        for (const span of this.getAllSpans()) {
            if (span.status === 'active') {
                map.set(span.blockId, span);
            }
        }

        return map;
    }

    private findSpanRef(blockId: string): TypedMemoryReference<TrackedSpan> | null {
        const refs = this.memory.search({
            type: EXECUTION_SPAN_TYPE,
            ownerId: blockId,
            id: null,
            visibility: null
        });

        return refs.length > 0
            ? refs[0] as TypedMemoryReference<TrackedSpan>
            : null;
    }

    private isKnownMetricKey(key: string): key is keyof SpanMetrics {
        const knownKeys: Set<string> = new Set([
            'exerciseId', 'exerciseImage',
            'reps', 'targetReps',
            'weight',
            'distance',
            'duration', 'elapsed', 'remaining',
            'currentRound', 'totalRounds', 'repScheme',
            'calories',
            'heartRate', 'power', 'cadence',
            'legacyMetrics'
        ]);
        return knownKeys.has(key);
    }
}
