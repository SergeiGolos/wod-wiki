import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { TimeSpan } from './TimeSpan';


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
 * Timer-specific display configuration.
 * Attached to spans that should show a timer UI.
 */
export interface TimerDisplayConfig {
    /** Timer direction */
    format: 'up' | 'down';
    /** Duration in ms (for countdown timers) */
    durationMs?: number;
    /** Display label for the timer */
    label: string;
    /** Card configuration for UI display */
    card?: {
        title: string;
        subtitle: string;
    };
    /** Timer role for display prioritization */
    role?: 'primary' | 'secondary' | 'auto';
}

/**
 * RuntimeSpan - Simplified tracking model for block execution.
 * 
 * Replaces the legacy tracking models with a focus on:
 * - Direct mapping to block execution
 * - Pause/resume support via TimerSpan array
 * - Fragment-based metric collection (per-statement grouping)
 * - Dynamic hierarchy/classification
 */
export class RuntimeSpan {
    constructor(
        public blockId: string,
        public sourceIds: number[] = [],
        public spans: TimeSpan[] = [],
        public fragments: ICodeFragment[][] = [],
        public status?: SpanStatus,
        public metadata: SpanMetadata = { tags: [], context: {}, logs: [] },
        public parentSpanId?: string,
        /** Optional timer display configuration */
        public timerConfig?: TimerDisplayConfig
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
     * Whether the span is currently running (has an open TimeSpan).
     */
    isActive(): boolean {
        return this.spans.length > 0 && this.spans[this.spans.length - 1].ended === undefined;
    }

    /**
     * Alias for isActive() for timer-specific contexts.
     */
    get isRunning(): boolean {
        return this.isActive();
    }

    /**
     * Total elapsed time across all TimeSpans in milliseconds.
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
     * Remaining time in ms, or undefined if span is unbounded.
     */
    remaining(): number | undefined {
        // Find timer fragment in fragments array
        const timerFragment = this.fragments
            .flat()
            .find(f => f.fragmentType === 'timer');

        // Check timer config first
        if (this.timerConfig?.durationMs) {
            return Math.max(0, this.timerConfig.durationMs - this.total());
        }

        if (!timerFragment?.value || typeof timerFragment.value !== 'number') {
            return undefined;
        }

        const durationMs = timerFragment.value;
        return Math.max(0, durationMs - this.total());
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
            (json.spans || []).map((s: any) => TimeSpan.fromJSON(s)),
            json.fragments || [],
            json.status,
            json.metadata || { tags: [], context: {}, logs: [] },
            json.parentSpanId,
            json.timerConfig
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
            timerConfig: this.timerConfig,
            _model: RUNTIME_SPAN_TYPE // Add discriminator for deserialization
        };
    }

    /**
     * Start tracking time (add new open span).
     */
    start(timestamp: number = Date.now()): void {
        // Don't start if already running
        if (this.isActive()) return;
        this.spans.push(new TimeSpan(timestamp));
    }

    /**
     * Stop tracking time (close current span).
     */
    stop(timestamp: number = Date.now()): void {
        if (!this.isActive()) return;
        const lastSpan = this.spans[this.spans.length - 1];
        if (lastSpan) {
            lastSpan.ended = timestamp;
        }
    }

    /**
     * Pause is an alias for stop (creates gap in tracking).
     */
    pause(timestamp: number = Date.now()): void {
        this.stop(timestamp);
    }

    /**
     * Resume is an alias for start (begins new span).
     */
    resume(timestamp: number = Date.now()): void {
        this.start(timestamp);
    }

    /**
     * Reset all time spans.
     */
    reset(): void {
        this.spans = [];
    }

    /**
     * Derive a display label from fragments or config.
     */
    get label(): string {
        // Use timer config label if available
        if (this.timerConfig?.label) {
            return this.timerConfig.label;
        }

        // Derive from fragments
        const labelFragment = this.fragments
            .flat()
            .find(f => f.fragmentType === FragmentType.Text || f.fragmentType === FragmentType.Effort);

        return labelFragment?.image?.toString() ?? this.blockId;
    }
}
