
import { ITrackerCommand, TrackerContext } from '../ITrackerCommand';
import {
    RuntimeSpan,
    SpanStatus,
    RUNTIME_SPAN_TYPE
} from '../../runtime/models/RuntimeSpan';
import { TimeSpan } from '../../runtime/models/TimeSpan';

import { IRuntimeBlock } from '../../runtime/contracts/IRuntimeBlock';
import { TypedMemoryReference } from '../../runtime/contracts/IMemoryReference';
import { createLabelFragment } from '../../runtime/utils/metricsToFragments';

import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

export type TrackSpanAction = 'start' | 'end' | 'fail' | 'skip' | 'update';

export interface TrackSpanPayload {
    action: TrackSpanAction;
    blockId: string;

    // For start
    block?: IRuntimeBlock;
    parentSpanId?: string | null;

    // For update/end
    status?: SpanStatus;
    metrics?: Record<string, any>;
    fragments?: ICodeFragment[];
}

export class TrackSpanCommand implements ITrackerCommand {
    constructor(private readonly payload: TrackSpanPayload) { }

    write(context: TrackerContext): RuntimeSpan[] {
        const { memory } = context;
        const { action, blockId } = this.payload;

        if (action === 'start') {
            return this.handleStart(context);
        }

        const ref = this.findSpanRef(context, blockId);
        if (!ref) {
            return [];
        }

        const span = memory.get(ref);
        if (!span) return [];

        // No need to shallow copy if we mutate and call set, 
        // but RuntimeSpan is a class, so we should be careful.
        const updatedSpan = span;

        switch (action) {
            case 'end':
            case 'fail':
            case 'skip':
                this.handleEnd(updatedSpan, action);
                break;
            case 'update':
                this.handleUpdate(updatedSpan);
                break;
        }

        memory.set(ref, updatedSpan);
        return [updatedSpan];
    }

    private handleStart(context: TrackerContext): RuntimeSpan[] {
        const { memory } = context;
        const { block, blockId } = this.payload;

        if (!block) {
            throw new Error('Block is required for starting a span');
        }

        const fragments = block.fragments?.length
            ? [...block.fragments]
            : [[createLabelFragment(block.label, block.blockType || 'group')]];

        const startTime = Date.now();
        const span = new RuntimeSpan(
            blockId,
            [...block.sourceIds],
            [new TimeSpan(startTime)],
            fragments,
            undefined,
            undefined, // metadata
            this.payload.parentSpanId ?? undefined
        );

        memory.allocate<RuntimeSpan>(
            RUNTIME_SPAN_TYPE,
            blockId,
            span,
            'public'
        );

        return [span];
    }

    private handleEnd(span: RuntimeSpan, action: TrackSpanAction): void {
        const status: SpanStatus | undefined = action === 'fail' ? 'failed' :
            action === 'skip' ? 'skipped' : undefined;

        if (status) {
            span.status = status;
        }

        // End any open timers
        if (span.spans.length > 0) {
            const lastTimer = span.spans[span.spans.length - 1];
            if (lastTimer.ended === undefined) {
                lastTimer.ended = Date.now();
            }
        }
    }

    private handleUpdate(span: RuntimeSpan): void {
        const { metrics, fragments } = this.payload;

        if (fragments) {
            // If fragments are passed as ICodeFragment[], we should probably 
            // append them to the last group or start a new group?
            // For now, let's assume we append to the last group.
            if (span.fragments.length === 0) {
                span.fragments.push([]);
            }
            span.fragments[span.fragments.length - 1].push(...fragments);
        }

        if (metrics) {
            // Convert metrics to fragments
            if (span.fragments.length === 0) {
                span.fragments.push([]);
            }
            const currentGroup = span.fragments[span.fragments.length - 1];

            for (const [key, value] of Object.entries(metrics)) {
                // Simplified metric to fragment conversion
                currentGroup.push({
                    type: key,
                    fragmentType: this.mapMetricToFragmentType(key),
                    value: typeof value === 'object' && value !== null && 'value' in value ? (value as any).value : value,
                    image: `${value}`
                });
            }
        }
    }

    private findSpanRef(context: TrackerContext, blockId: string): TypedMemoryReference<RuntimeSpan> | null {
        const refs = context.memory.search({
            type: RUNTIME_SPAN_TYPE,
            ownerId: blockId,
            id: null,
            visibility: null
        });

        return refs.length > 0
            ? refs[0] as TypedMemoryReference<RuntimeSpan>
            : null;
    }

    private mapMetricToFragmentType(key: string): FragmentType {
        const mapping: Record<string, FragmentType> = {
            'reps': FragmentType.Rep,
            'repetitions': FragmentType.Rep,
            'weight': FragmentType.Resistance,
            'resistance': FragmentType.Resistance,
            'distance': FragmentType.Distance,
            'duration': FragmentType.Timer,
            'elapsed': FragmentType.Timer,
            'time': FragmentType.Timer,
            'rounds': FragmentType.Rounds,
            'effort': FragmentType.Effort,
        };
        return mapping[key] || FragmentType.Text;
    }
}
