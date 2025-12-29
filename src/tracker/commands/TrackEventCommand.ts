import { ITrackerCommand, TrackerContext } from '../ITrackerCommand';
import { RuntimeSpan, RUNTIME_SPAN_TYPE } from '../../runtime/models/RuntimeSpan';
import { TypedMemoryReference } from '../../runtime/contracts/IMemoryReference';

export interface TrackEventPayload {
    action: 'log' | 'tag' | 'context';
    blockId: string;
    message?: string;
    tag?: string;
    context?: Record<string, unknown>;
}

/**
 * Command for tracking debug events (logs, tags, context).
 */
export class TrackEventCommand implements ITrackerCommand {
    constructor(private readonly payload: TrackEventPayload) { }

    write(context: TrackerContext): RuntimeSpan[] {
        const span = this.findSpan(context);
        if (!span) return [];

        switch (this.payload.action) {
            case 'log':
                if (this.payload.message) {
                    span.metadata.logs.push(this.payload.message);
                }
                break;
            case 'tag':
                if (this.payload.tag && !span.metadata.tags.includes(this.payload.tag)) {
                    span.metadata.tags.push(this.payload.tag);
                }
                break;
            case 'context':
                if (this.payload.context) {
                    span.metadata.context = {
                        ...span.metadata.context,
                        ...this.payload.context
                    };
                }
                break;
        }

        return [span];
    }

    private findSpan(context: TrackerContext): RuntimeSpan | null {
        const refs = context.memory.search({
            type: RUNTIME_SPAN_TYPE,
            ownerId: this.payload.blockId,
            id: null,
            visibility: null
        });

        if (refs.length === 0) return null;
        return context.memory.get(refs[0] as TypedMemoryReference<RuntimeSpan>) ?? null;
    }
}
