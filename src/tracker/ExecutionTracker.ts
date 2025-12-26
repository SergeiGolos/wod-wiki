
import { IRuntimeMemory } from '../runtime/IRuntimeMemory';
import { IRuntimeBlock } from '../runtime/IRuntimeBlock';
import { TypedMemoryReference } from '../runtime/IMemoryReference';
import { RuntimeSpan, SpanStatus, RUNTIME_SPAN_TYPE } from '../runtime/models/RuntimeSpan';
import { FragmentType, ICodeFragment } from '../core/models/CodeFragment';
import { ITrackerCommand, TrackerContext } from './ITrackerCommand';
import { TrackSpanCommand, TrackSpanPayload } from './commands/TrackSpanCommand';
import { TrackSectionCommand } from './commands/TrackSectionCommand';
import { TrackEventCommand } from './commands/TrackEventCommand';

/**
 * RuntimeReporter
 * 
 * Central service for tracking workout execution with unified metrics collection.
 * Uses Command Pattern to abstract write operations.
 */
export class RuntimeReporter {
    constructor(private readonly memory: IRuntimeMemory) { }

    /**
     * Executes a tracker command.
     */
    execute(command: ITrackerCommand): RuntimeSpan[] {
        const context: TrackerContext = { memory: this.memory };
        return command.write(context);
    }

    // ============================================================================
    // Facade Methods (Adapting to Command Pattern)
    // ============================================================================

    startSpan(
        block: IRuntimeBlock,
        _parentSpanId: string | null = null,
    ): RuntimeSpan {
        const payload: TrackSpanPayload = {
            action: 'start',
            blockId: block.key.toString(),
            block,
            parentSpanId: _parentSpanId || undefined
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

    endSpan(blockId: string, status: SpanStatus = 'completed' as any): void {
        const action: any = status === 'failed' ? 'fail' :
            status === 'skipped' ? 'skip' : 'end';

        this.execute(new TrackSpanCommand({
            action,
            blockId,
            status: status as any
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
        metricKey: string,
        value: T,
        unit: string,
        _source?: string
    ): void {
        this.execute(new TrackSpanCommand({
            action: 'update',
            blockId,
            metrics: { [metricKey]: { value, unit } }
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
        _repScheme?: number[]
    ): void {
        const roundText = totalRounds ? `${currentRound}/${totalRounds}` : `Round ${currentRound}`;
        const fragment: ICodeFragment = {
            type: 'rounds',
            fragmentType: FragmentType.Rounds,
            value: currentRound,
            image: roundText
        };

        this.execute(new TrackSpanCommand({
            action: 'update',
            blockId,
            fragments: [fragment]
        }));
    }

    startSegment(
        blockId: string,
        type: string,
        label: string,
        index?: number
    ): any {
        this.execute(new TrackSectionCommand({
            action: 'start',
            blockId,
            type,
            label,
            index
        }));
        return null; // Segments no longer return a separate object
    }

    endSegment(_blockId: string, _segmentId?: string): void {
        // No-op in new model
    }

    endAllSegments(_blockId: string): void {
        // No-op in new model
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

    setDebugMetadata(blockId: string, debugMetadata: any): void {
        if (debugMetadata.tags) {
            for (const tag of debugMetadata.tags) {
                this.addDebugTag(blockId, tag);
            }
        }
        if (debugMetadata.context) {
            this.setDebugContext(blockId, debugMetadata.context);
        }
    }

    // ============================================================================
    // Queries (Read-only)
    // ============================================================================

    getActiveSpan(blockId: string): RuntimeSpan | null {
        const ref = this.findRuntimeSpanRef(blockId);
        if (!ref) return null;

        const span = this.memory.get(ref);
        return (span && span.isActive()) ? span : null;
    }

    getActiveSpanId(blockId: string): string | null {
        const span = this.getActiveSpan(blockId);
        return span?.id ?? null;
    }

    getAllSpans(): RuntimeSpan[] {
        const refs = this.memory.search({
            type: RUNTIME_SPAN_TYPE,
            id: null,
            ownerId: null,
            visibility: null
        });

        return refs
            .map(ref => this.memory.get(ref as TypedMemoryReference<RuntimeSpan>))
            .filter((s): s is RuntimeSpan => s !== null);
    }

    getCompletedSpans(): RuntimeSpan[] {
        return this.getAllSpans().filter(s => !s.isActive());
    }

    getActiveSpansMap(): Map<string, RuntimeSpan> {
        const map = new Map<string, RuntimeSpan>();

        for (const span of this.getAllSpans()) {
            if (span.isActive()) {
                map.set(span.blockId, span);
            }
        }

        return map;
    }

    private findRuntimeSpanRef(blockId: string): TypedMemoryReference<RuntimeSpan> | null {
        const refs = this.memory.search({
            type: RUNTIME_SPAN_TYPE,
            ownerId: blockId,
            id: null,
            visibility: null
        });

        return refs.length > 0
            ? refs[0] as TypedMemoryReference<RuntimeSpan>
            : null;
    }
}
