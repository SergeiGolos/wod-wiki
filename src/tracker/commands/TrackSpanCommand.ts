import { ITrackerCommand, TrackerContext } from '../ITrackerCommand';
import { RuntimeSpan, RUNTIME_SPAN_TYPE } from '../../runtime/models/RuntimeSpan';
import { IRuntimeBlock } from '../../runtime/contracts/IRuntimeBlock';
import { ICodeFragment } from '../../core/models/CodeFragment';
import { TypedMemoryReference } from '../../runtime/contracts/IMemoryReference';
import { TimeSpan } from '../../runtime/models/TimeSpan';

export interface TrackSpanPayload {
    action: 'start' | 'end' | 'update' | 'fail' | 'skip';
    blockId: string;
    block?: IRuntimeBlock;
    parentSpanId?: string;
    fragments?: ICodeFragment[];
    metrics?: Record<string, { value: unknown; unit: string }>;
    status?: 'completed' | 'failed' | 'skipped';
}

/**
 * Command for tracking span lifecycle and updates.
 */
export class TrackSpanCommand implements ITrackerCommand {
    constructor(private readonly payload: TrackSpanPayload) { }

    write(context: TrackerContext): RuntimeSpan[] {
        switch (this.payload.action) {
            case 'start':
                return this.startSpan(context);
            case 'end':
                return this.endSpan(context);
            case 'update':
                return this.updateSpan(context);
            case 'fail':
                return this.failSpan(context);
            case 'skip':
                return this.skipSpan(context);
            default:
                return [];
        }
    }

    private startSpan(context: TrackerContext): RuntimeSpan[] {
        const { blockId, block, parentSpanId } = this.payload;

        const span = new RuntimeSpan(
            blockId,
            block?.sourceIds || [],
            [new TimeSpan(Date.now())],
            block?.fragments || [],
            undefined,
            { tags: [], context: {}, logs: [] },
            parentSpanId
        );

        context.memory.allocate<RuntimeSpan>(RUNTIME_SPAN_TYPE, blockId, span, 'public');
        return [span];
    }

    private endSpan(context: TrackerContext): RuntimeSpan[] {
        const span = this.findSpan(context);
        if (span) {
            span.stop(Date.now());
        }
        return span ? [span] : [];
    }

    private updateSpan(context: TrackerContext): RuntimeSpan[] {
        const span = this.findSpan(context);
        if (!span) return [];

        if (this.payload.fragments) {
            span.fragments.push(this.payload.fragments);
        }

        return [span];
    }

    private failSpan(context: TrackerContext): RuntimeSpan[] {
        const span = this.findSpan(context);
        if (span) {
            span.status = 'failed';
            span.stop(Date.now());
        }
        return span ? [span] : [];
    }

    private skipSpan(context: TrackerContext): RuntimeSpan[] {
        const span = this.findSpan(context);
        if (span) {
            span.status = 'skipped';
            span.stop(Date.now());
        }
        return span ? [span] : [];
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
