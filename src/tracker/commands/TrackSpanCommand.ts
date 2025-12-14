
import { ITrackerCommand, TrackerContext } from '../ITrackerCommand';
import {
    ExecutionSpan,
    SpanStatus,
    SpanMetrics,
    TimeSegment,
    DebugMetadata,
    createExecutionSpan,
    createEmptyMetrics,
    legacyTypeToSpanType,
    EXECUTION_SPAN_TYPE
} from '../../runtime/models/ExecutionSpan';
import { IRuntimeBlock } from '../../runtime/IRuntimeBlock';
import { TypedMemoryReference } from '../../runtime/IMemoryReference';
import { createLabelFragment } from '../../runtime/utils/metricsToFragments';

import { ICodeFragment } from '../../core/models/CodeFragment';

export type TrackSpanAction = 'start' | 'end' | 'fail' | 'skip' | 'update';

export interface TrackSpanPayload {
    action: TrackSpanAction;
    blockId: string;

    // For start
    block?: IRuntimeBlock;
    parentSpanId?: string | null;

    // For update/end
    status?: SpanStatus;
    metrics?: Partial<SpanMetrics>;
    segments?: TimeSegment[];
    debugMetadata?: Partial<DebugMetadata>;
    fragments?: ICodeFragment[];
}

export class TrackSpanCommand implements ITrackerCommand {
    constructor(private readonly payload: TrackSpanPayload) { }

    write(context: TrackerContext): ExecutionSpan[] {
        const { memory } = context;
        const { action, blockId } = this.payload;

        if (action === 'start') {
            return this.handleStart(context);
        }

        const ref = this.findSpanRef(context, blockId);
        if (!ref) {
            // If we try to update/end a non-existent span, we might want to log or ignore.
            // For now, ignore to be safe.
            return [];
        }

        const span = memory.get(ref);
        if (!span) return [];

        let updatedSpan = { ...span };

        switch (action) {
            case 'end':
            case 'fail':
            case 'skip':
                updatedSpan = this.handleEnd(span, action);
                break;
            case 'update':
                updatedSpan = this.handleUpdate(span);
                break;
        }

        memory.set(ref, updatedSpan);
        return [updatedSpan];
    }

    private handleStart(context: TrackerContext): ExecutionSpan[] {
        const { memory } = context;
        const { block, blockId, parentSpanId, debugMetadata } = this.payload;

        if (!block) {
            throw new Error('Block is required for starting a span');
        }

        const type = legacyTypeToSpanType(block.blockType || 'group');
        const fragments = block.fragments?.length
            ? block.fragments.flat()
            : [createLabelFragment(block.label, block.blockType || 'group')];

        const initialMetrics: SpanMetrics = {
            ...createEmptyMetrics(),
            ...(block.context?.exerciseId ? { exerciseId: block.context.exerciseId } : {}),
            ...(this.payload.metrics || {})
        };

        const span = createExecutionSpan(
            blockId,
            type,
            block.label || blockId,
            parentSpanId,
            block.sourceIds,
            // We can pass debugMetadata if provided, or empty
            debugMetadata as DebugMetadata,
            {
                metrics: initialMetrics,
                fragments
            }
        );

        memory.allocate<ExecutionSpan>(
            EXECUTION_SPAN_TYPE,
            blockId,
            span,
            'public'
        );

        return [span];
    }

    private handleEnd(span: ExecutionSpan, action: TrackSpanAction): ExecutionSpan {
        if (span.status !== 'active') return span;

        const status: SpanStatus = action === 'fail' ? 'failed' :
            action === 'skip' ? 'skipped' : 'completed';

        // End any open segments
        const updatedSegments = span.segments.map(seg =>
            seg.endTime ? seg : { ...seg, endTime: Date.now() }
        );

        const endTime = Date.now();
        const updatedMetrics = { ...span.metrics };
        if (!updatedMetrics.duration) {
            updatedMetrics.duration = {
                value: endTime - span.startTime,
                unit: 'ms',
                recorded: endTime
            };
        }

        return {
            ...span,
            endTime,
            status,
            segments: updatedSegments,
            metrics: updatedMetrics
        };
    }

    private handleUpdate(span: ExecutionSpan): ExecutionSpan {
        const { metrics, segments, debugMetadata, fragments } = this.payload;

        let updatedSpan = { ...span };

        if (metrics) {
            updatedSpan.metrics = {
                ...updatedSpan.metrics,
                ...metrics,
                // If custom map is present in both, we might want to merge, but 
                // for now shallow merge of top properties is standard.
                // Deep merge of custom would require more logic.
                custom: metrics.custom ? metrics.custom : updatedSpan.metrics.custom
            };
        }

        if (segments) {
            updatedSpan.segments = segments;
        }

        if (fragments) {
            updatedSpan.fragments = [...(updatedSpan.fragments || []), ...fragments];
        }

        if (debugMetadata) {
            updatedSpan.debugMetadata = {
                ...(updatedSpan.debugMetadata || { tags: [], context: {}, logs: [] }),
                ...debugMetadata,
                // Merge arrays if needed? The types say string[].
                // If payload has tags, it replaces? Or appends?
                // Let's assume replace for now or simple merge if convenient.
                // The payload is Partial<DebugMetadata>, so if tags are passed, they replace.
            };
        }

        return updatedSpan;
    }

    private findSpanRef(context: TrackerContext, blockId: string): TypedMemoryReference<ExecutionSpan> | null {
        const refs = context.memory.search({
            type: EXECUTION_SPAN_TYPE,
            ownerId: blockId,
            id: null,
            visibility: null
        });

        return refs.length > 0
            ? refs[0] as TypedMemoryReference<ExecutionSpan>
            : null;
    }
}
