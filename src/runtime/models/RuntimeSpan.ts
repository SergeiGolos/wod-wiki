import { ICodeFragment } from '../../core/models/CodeFragment';

/** Memory type identifier for runtime spans */
export const RUNTIME_SPAN_TYPE = 'runtime-span';

/**
 * Terminal status for a span.
 * If not present, the span is either active or successfully completed.
 */
export type SpanStatus = 'failed' | 'skipped';

/**
 * Metadata for a span, including tags, context, and logs.
 */
export interface SpanMetadata {
    tags: string[];
    context: Record<string, unknown>;
    logs: string[];
}

/**
 * A discrete period of time within a span.
 * Multiple spans allow for pause/resume tracking.
 */
export class TimerSpan {
    constructor(
        public started: number,
        public ended?: number
    ) { }

    static fromJSON(json: any): TimerSpan {
        return new TimerSpan(json.started, json.ended);
    }

    get duration(): number {
        const end = this.ended ?? Date.now();
        return Math.max(0, end - this.started);
    }
}

/**
 * RuntimeSpan - Simplified tracking model for block execution.
 * 
 * Replaces the complex TrackedSpan/ExecutionSpan with a focus on:
 * - Direct mapping to block execution
 * - Pause/resume support via TimerSpan array
 * - Fragment-based metric collection (per-statement grouping)
 * - Dynamic hierarchy/classification
 */
export class RuntimeSpan {
    constructor(
        public blockId: string,
        public sourceIds: number[] = [],
        public spans: TimerSpan[] = [],
        public fragments: ICodeFragment[][] = [],
        public status?: SpanStatus,
        public metadata: SpanMetadata = { tags: [], context: {}, logs: [] },
        public parentSpanId?: string
    ) { }

    /**
     * Unique identifier for the span instance.
     * Derived from start time and block ID to ensure uniqueness across executions.
     */
    get id(): string {
        const start = this.spans[0]?.started ?? 0;
        return `${start}-${this.blockId}`;
    }

    /**
     * Whether the span is currently running (has an open TimerSpan).
     */
    isActive(): boolean {
        return this.spans.length > 0 && this.spans[this.spans.length - 1].ended === undefined;
    }

    /**
     * Total elapsed time across all TimerSpans in milliseconds.
     */
    total(): number {
        return this.spans.reduce((acc, span) => acc + span.duration, 0);
    }

    /**
     * Synonym for total() to align with common naming.
     */
    elapsed(): number {
        return this.total();
    }

    /**
     * Start time of the first timer span.
     */
    get startTime(): number {
        return this.spans[0]?.started ?? 0;
    }

    /**
     * End time of the last timer span (if finished).
     */
    get endTime(): number | undefined {
        if (this.isActive()) return undefined;
        return this.spans[this.spans.length - 1]?.ended;
    }

    /**
     * Serialization and Deserialization
     */
    static fromJSON(json: any): RuntimeSpan {
        return new RuntimeSpan(
            json.blockId,
            json.sourceIds || [],
            (json.spans || []).map((s: any) => TimerSpan.fromJSON(s)),
            json.fragments || [],
            json.status,
            json.metadata || { tags: [], context: {}, logs: [] },
            json.parentSpanId
        );
    }

    toJSON(): any {
        return {
            blockId: this.blockId,
            sourceIds: this.sourceIds,
            spans: this.spans,
            fragments: this.fragments,
            status: this.status,
            metadata: this.metadata,
            parentSpanId: this.parentSpanId,
            _model: RUNTIME_SPAN_TYPE // Add discriminator for deserialization
        };
    }
}
