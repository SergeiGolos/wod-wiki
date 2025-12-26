import { ITrackerCommand, TrackerContext } from '../ITrackerCommand';
import {
    TrackedSpan,
    EXECUTION_SPAN_TYPE
} from '../../runtime/models/TrackedSpan';
import { TypedMemoryReference } from '../../runtime/IMemoryReference';

export type TrackEventAction = 'log' | 'tag' | 'context';

export interface TrackEventPayload {
    action: TrackEventAction;
    blockId: string;

    // For log
    message?: string;

    // For tag
    tag?: string;

    // For context
    context?: Record<string, unknown>;
}

export class TrackEventCommand implements ITrackerCommand {
    constructor(private readonly payload: TrackEventPayload) { }

    write(context: TrackerContext): TrackedSpan[] {
        const { memory } = context;
        const { blockId, action } = this.payload;

        const ref = this.findSpanRef(context, blockId);
        if (!ref) return [];

        const span = memory.get(ref);
        if (!span) return [];

        const debugMetadata = span.debugMetadata || { tags: [], context: {}, logs: [] };

        let updatedDebugMetadata = { ...debugMetadata };

        if (action === 'log' && this.payload.message) {
            updatedDebugMetadata.logs = [
                ...(updatedDebugMetadata.logs || []),
                `[${new Date().toISOString()}] ${this.payload.message}`
            ];
        } else if (action === 'tag' && this.payload.tag) {
            if (!updatedDebugMetadata.tags.includes(this.payload.tag)) {
                updatedDebugMetadata.tags = [...updatedDebugMetadata.tags, this.payload.tag];
            }
        } else if (action === 'context' && this.payload.context) {
            updatedDebugMetadata.context = {
                ...updatedDebugMetadata.context,
                ...this.payload.context
            };
        }

        const updatedSpan = { ...span, debugMetadata: updatedDebugMetadata };
        memory.set(ref, updatedSpan);
        return [updatedSpan];
    }

    private findSpanRef(context: TrackerContext, blockId: string): TypedMemoryReference<TrackedSpan> | null {
        const refs = context.memory.search({
            type: EXECUTION_SPAN_TYPE,
            ownerId: blockId,
            id: null,
            visibility: null
        });

        return refs.length > 0
            ? refs[0] as TypedMemoryReference<TrackedSpan>
            : null;
    }
}
