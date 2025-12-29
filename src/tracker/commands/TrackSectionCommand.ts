import { ITrackerCommand, TrackerContext } from '../ITrackerCommand';
import { RuntimeSpan, RUNTIME_SPAN_TYPE } from '../../runtime/models/RuntimeSpan';
import { TypedMemoryReference } from '../../runtime/contracts/IMemoryReference';

export interface TrackSectionPayload {
    action: 'start' | 'end';
    blockId: string;
    type?: string;
    label?: string;
    index?: number;
}

/**
 * Command for tracking section markers within spans.
 */
export class TrackSectionCommand implements ITrackerCommand {
    constructor(private readonly payload: TrackSectionPayload) { }

    write(context: TrackerContext): RuntimeSpan[] {
        const span = this.findSpan(context);
        if (!span) return [];

        // Sections are represented as metadata updates
        if (this.payload.action === 'start' && this.payload.label) {
            span.metadata.context = {
                ...span.metadata.context,
                currentSection: {
                    type: this.payload.type,
                    label: this.payload.label,
                    index: this.payload.index
                }
            };
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
