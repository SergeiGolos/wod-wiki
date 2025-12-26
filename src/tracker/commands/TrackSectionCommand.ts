import { ITrackerCommand, TrackerContext } from '../ITrackerCommand';
import {
    RuntimeSpan,
    RUNTIME_SPAN_TYPE
} from '../../runtime/models/RuntimeSpan';
import { TypedMemoryReference } from '../../runtime/IMemoryReference';
import { FragmentType } from '../../core/models/CodeFragment';

export type TrackSectionAction = 'start' | 'end' | 'end-all';

export interface TrackSectionPayload {
    action: TrackSectionAction;
    blockId: string;

    // For start
    type?: string;
    label?: string;
    index?: number;

    // For end
    segmentId?: string;
}

export class TrackSectionCommand implements ITrackerCommand {
    constructor(private readonly payload: TrackSectionPayload) { }

    write(context: TrackerContext): RuntimeSpan[] {
        const { memory } = context;
        const { blockId, action } = this.payload;

        const ref = this.findSpanRef(context, blockId);
        if (!ref) return [];

        const span = memory.get(ref);
        if (!span || !span.isActive()) return [];

        if (action === 'start') {
            const { type, label } = this.payload;
            if (label) {
                // In new model, segments are just fragments marking transitions
                if (span.fragments.length === 0) {
                    span.fragments.push([]);
                }
                span.fragments[span.fragments.length - 1].push({
                    type: type || 'effort',
                    fragmentType: FragmentType.Effort,
                    value: label,
                    image: label
                });
            }
        }
        // 'end' and 'end-all' are mostly no-ops now as fragments are discrete events

        memory.set(ref, span);
        return [span];
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
}
