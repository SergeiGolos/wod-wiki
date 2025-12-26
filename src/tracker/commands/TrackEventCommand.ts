import { ITrackerCommand, TrackerContext } from '../ITrackerCommand';
import {
    RuntimeSpan,
    RUNTIME_SPAN_TYPE
} from '../../runtime/models/RuntimeSpan';
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

    write(context: TrackerContext): RuntimeSpan[] {
        const { memory } = context;
        const { blockId, action } = this.payload;

        const ref = this.findSpanRef(context, blockId);
        if (!ref) return [];

        const span = memory.get(ref);
        if (!span) return [];

        if (action === 'log' && this.payload.message) {
            span.metadata.logs.push(`[${new Date().toISOString()}] ${this.payload.message}`);
        } else if (action === 'tag' && this.payload.tag) {
            if (!span.metadata.tags.includes(this.payload.tag)) {
                span.metadata.tags.push(this.payload.tag);
            }
        } else if (action === 'context' && this.payload.context) {
            span.metadata.context = {
                ...span.metadata.context,
                ...this.payload.context
            };
        }

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
