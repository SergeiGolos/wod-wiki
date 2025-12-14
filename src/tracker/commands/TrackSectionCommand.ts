import { ITrackerCommand, TrackerContext } from '../ITrackerCommand';
import {
    ExecutionSpan,
    SegmentType,
    TimeSegment,
    createTimeSegment,
    EXECUTION_SPAN_TYPE
} from '../../runtime/models/ExecutionSpan';
import { TypedMemoryReference } from '../../runtime/IMemoryReference';

export type TrackSectionAction = 'start' | 'end' | 'end-all';

export interface TrackSectionPayload {
    action: TrackSectionAction;
    blockId: string;

    // For start
    type?: SegmentType;
    label?: string;
    index?: number;

    // For end
    segmentId?: string;
}

export class TrackSectionCommand implements ITrackerCommand {
    constructor(private readonly payload: TrackSectionPayload) { }

    write(context: TrackerContext): ExecutionSpan[] {
        const { memory } = context;
        const { blockId, action } = this.payload;

        const ref = this.findSpanRef(context, blockId);
        if (!ref) return [];

        const span = memory.get(ref);
        if (!span || span.status !== 'active') return [];

        let updatedSegments = [...span.segments];

        if (action === 'start') {
            const { type, label, index } = this.payload;
            if (type && label) {
                const segment = createTimeSegment(span.id, type, label, index);
                updatedSegments.push(segment);
            }
        } else if (action === 'end') {
            const { segmentId } = this.payload;
            updatedSegments = updatedSegments.map(seg => {
                const shouldEnd = segmentId
                    ? seg.id === segmentId
                    : !seg.endTime;

                if (shouldEnd && !seg.endTime) {
                    return { ...seg, endTime: Date.now() };
                }
                return seg;
            });
        } else if (action === 'end-all') {
            updatedSegments = updatedSegments.map(seg =>
                seg.endTime ? seg : { ...seg, endTime: Date.now() }
            );
        }

        const updatedSpan = { ...span, segments: updatedSegments };
        memory.set(ref, updatedSpan);
        return [updatedSpan];
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
