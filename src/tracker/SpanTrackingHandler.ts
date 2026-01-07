import { IEventHandler } from '../runtime/contracts/events/IEventHandler';
import { IEvent } from '../runtime/contracts/events/IEvent';
import { IScriptRuntime } from '../runtime/contracts/IScriptRuntime';
import { IRuntimeAction } from '../runtime/contracts/IRuntimeAction';
import { IRuntimeBlock } from '../runtime/contracts/IRuntimeBlock';
import { RuntimeSpan, SpanStatus } from '../runtime/models/RuntimeSpan';
import { StackPushEvent, StackPopEvent } from '../runtime/events/StackEvents';
import { ICodeFragment, FragmentType } from '../core/models/CodeFragment';

/**
 * SpanTrackingHandler - Event-based span tracking.
 * 
 * This handler implements the IEventHandler interface and subscribes to stack and memory
 * events to track block execution spans. It maintains its own in-memory storage instead
 * of using RuntimeMemory, making it decoupled from the memory system.
 * 
 * Design Principles:
 * - Event-driven: Reacts to stack:push, stack:pop, and memory:set events
 * - Self-contained: Manages its own span storage
 * - Query-focused: Provides read methods for UI and analysis
 * 
 * @example
 * ```typescript
 * const handler = new SpanTrackingHandler();
 * eventBus.register('stack:push', handler, 'runtime');
 * eventBus.register('stack:pop', handler, 'runtime');
 * 
 * // Query active spans
 * const span = handler.getActiveSpan('block-123');
 * const allSpans = handler.getAllSpans();
 * ```
 */
export class SpanTrackingHandler implements IEventHandler {
    readonly id = crypto.randomUUID();
    readonly name = 'span-tracking-handler';

    // In-memory span storage (no longer in RuntimeMemory)
    private _activeSpans = new Map<string, RuntimeSpan>();
    private _completedSpans: RuntimeSpan[] = [];

    /**
     * Main event handler method - dispatches to specific handlers based on event type.
     */
    handler(event: IEvent, _runtime: IScriptRuntime): IRuntimeAction[] {
        switch (event.name) {
            case 'stack:push':
                return this.handleStackPush(event as StackPushEvent);
            case 'stack:pop':
                return this.handleStackPop(event as StackPopEvent);
            default:
                return [];
        }
    }

    // ============================================================================
    // Event Handlers
    // ============================================================================

    private handleStackPush(event: StackPushEvent): IRuntimeAction[] {
        const blocks = event.data.blocks;
        const block = blocks[blocks.length - 1];

        if (block) {
            const parentBlockId = blocks.length > 1
                ? blocks[blocks.length - 2]?.key.toString()
                : undefined;

            const span = this.createSpan(block, parentBlockId);
            this._activeSpans.set(block.key.toString(), span);
        }

        return [];
    }

    private handleStackPop(event: StackPopEvent): IRuntimeAction[] {
        const currentBlocks = event.data.blocks;
        const currentBlockIds = new Set(currentBlocks.map(b => b.key.toString()));

        // Find and complete any spans that are no longer in the current stack
        for (const [blockId, span] of this._activeSpans) {
            if (!currentBlockIds.has(blockId)) {
                // This span's block was popped - mark as completed
                span.stop(event.timestamp.getTime());
                this._completedSpans.push(span);
                this._activeSpans.delete(blockId);
            }
        }

        return [];
    }

    // ============================================================================
    // Span Creation
    // ============================================================================

    private createSpan(block: IRuntimeBlock, parentSpanId?: string): RuntimeSpan {
        const now = Date.now();
        const span = new RuntimeSpan(
            block.key.toString(),
            block.sourceIds || [],
            [], // spans - will be started below
            block.fragments || [],
            undefined, // status
            { tags: [], context: {}, logs: [] }, // metadata
            parentSpanId
        );

        // Start tracking time immediately
        span.start(now);

        return span;
    }

    // ============================================================================
    // Facade Methods (Programmatic API)
    // ============================================================================

    /**
     * Start a span for a block (called when block is pushed).
     * Returns the created span.
     */
    startSpan(block: IRuntimeBlock, parentSpanId: string | null = null): RuntimeSpan {
        const span = this.createSpan(block, parentSpanId || undefined);
        this._activeSpans.set(block.key.toString(), span);
        return span;
    }

    /**
     * End a span (called when block is popped).
     */
    endSpan(blockId: string, status: SpanStatus | 'completed' = 'completed'): void {
        const span = this._activeSpans.get(blockId);
        if (!span) return;

        span.stop(Date.now());
        if (status !== 'completed') {
            span.status = status as SpanStatus;
        }

        this._completedSpans.push(span);
        this._activeSpans.delete(blockId);
    }

    /**
     * Mark a span as failed.
     */
    failSpan(blockId: string): void {
        this.endSpan(blockId, 'failed');
    }

    /**
     * Mark a span as skipped.
     */
    skipSpan(blockId: string): void {
        this.endSpan(blockId, 'skipped');
    }

    /**
     * Append fragments to a span.
     */
    appendFragments(blockId: string, fragments: ICodeFragment[]): void {
        const span = this._activeSpans.get(blockId);
        if (!span) return;

        // Add as a new fragment group
        span.fragments.push(fragments);
    }

    /**
     * Record a metric on a span.
     */
    recordMetric<T>(
        blockId: string,
        metricKey: string,
        value: T,
        unit: string,
        _source?: string
    ): void {
        const span = this._activeSpans.get(blockId);
        if (!span) return;

        // Store metric as a fragment
        const fragment: ICodeFragment = {
            type: metricKey,
            fragmentType: FragmentType.Text,
            value: value,
            image: `${value} ${unit}`
        };

        span.fragments.push([fragment]);
    }

    /**
     * Record a round update.
     */
    recordRound(
        blockId: string,
        currentRound: number,
        totalRounds?: number
    ): void {
        const roundText = totalRounds
            ? `${currentRound}/${totalRounds}`
            : `Round ${currentRound}`;

        const fragment: ICodeFragment = {
            type: 'rounds',
            fragmentType: FragmentType.Rounds,
            value: currentRound,
            image: roundText
        };

        this.appendFragments(blockId, [fragment]);
    }

    // ============================================================================
    // Query Methods (Read-only)
    // ============================================================================

    /**
     * Get the active span for a block.
     */
    getActiveSpan(blockId: string): RuntimeSpan | null {
        return this._activeSpans.get(blockId) ?? null;
    }

    /**
     * Get the active span ID for a block.
     */
    getActiveSpanId(blockId: string): string | null {
        const span = this.getActiveSpan(blockId);
        return span?.id ?? null;
    }

    /**
     * Get all spans (active and completed).
     */
    getAllSpans(): RuntimeSpan[] {
        return [...this._activeSpans.values(), ...this._completedSpans];
    }

    /**
     * Get only completed spans.
     */
    getCompletedSpans(): RuntimeSpan[] {
        return [...this._completedSpans];
    }

    /**
     * Get only active spans.
     */
    getActiveSpans(): RuntimeSpan[] {
        return [...this._activeSpans.values()];
    }

    /**
     * Get active spans as a Map.
     */
    getActiveSpansMap(): Map<string, RuntimeSpan> {
        return new Map(this._activeSpans);
    }

    /**
     * Clear all tracking data.
     */
    reset(): void {
        this._activeSpans.clear();
        this._completedSpans = [];
    }
}
