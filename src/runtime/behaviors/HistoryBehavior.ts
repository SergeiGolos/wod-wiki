import { IRuntimeBehavior } from "../IRuntimeBehavior";
import { IRuntimeAction } from "../IRuntimeAction";
import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { MemoryTypeEnum } from "../MemoryTypeEnum";
import { ExecutionSpan, SpanMetrics, DebugMetadata, createEmptyMetrics, legacyTypeToSpanType, EXECUTION_SPAN_TYPE } from "../models/ExecutionSpan";
import { createLabelFragment } from "../utils/metricsToFragments";

/**
 * Configuration for HistoryBehavior
 */
export interface HistoryBehaviorConfig {
    /** Human-readable label for the span */
    label?: string;
    /** Debug metadata to stamp onto the span at creation time */
    debugMetadata?: DebugMetadata;
}

/**
 * Behavior that tracks the execution history of a block.
 * Records start time, end time, parent ID, and metrics, then logs to runtime.executionLog.
 * 
 * Supports debug metadata stamping per the ExecutionSpan consolidation plan.
 * @see docs/plans/jit-01-execution-span-consolidation.md
 */
export class HistoryBehavior implements IRuntimeBehavior {
    private startTime: number = 0;
    private parentSpanId: string | null = null;
    private label: string;
    private debugMetadata?: DebugMetadata;

    constructor(labelOrConfig?: string | HistoryBehaviorConfig) {
        if (typeof labelOrConfig === 'string') {
            // Backward compatible: string parameter is just the label
            this.label = labelOrConfig || "Block";
        } else if (labelOrConfig) {
            // New config-based initialization
            this.label = labelOrConfig.label || "Block";
            this.debugMetadata = labelOrConfig.debugMetadata;
        } else {
            this.label = "Block";
        }
    }

    onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        this.startTime = Date.now();

        // Allocate start time in metrics
        const metricsRef = runtime.memory.allocate<any>(
            MemoryTypeEnum.METRICS_CURRENT,
            'runtime',
            {},
            'public'
        );
        const metrics = metricsRef.get() || {};
        metrics['startTime'] = {
            value: this.startTime,
            unit: 'ms',
            sourceId: block.key.toString()
        };
        metricsRef.set({ ...metrics });

        // Determine parent span ID from stack
        // The block is already on the stack, so parent is at index length - 2
        const stack = runtime.stack.blocks;
        if (stack.length >= 2) {
            this.parentSpanId = stack[stack.length - 2].key.toString();
        } else {
            this.parentSpanId = null;
        }

        // If label wasn't provided, try to derive it from block type or context
        if (this.label === "Block" && block.blockType) {
            this.label = block.blockType;
        }

        // Create initial metrics from block fragments
        const initialMetrics = this.extractMetricsFromBlock(block);

        // Create execution span with debug metadata stamped at creation time
        // This eliminates the need to infer context during analytics
        const span: ExecutionSpan = {
            id: `${this.startTime}-${block.key.toString()}`,
            blockId: block.key.toString(),
            parentSpanId: this.parentSpanId,
            type: legacyTypeToSpanType(block.blockType || 'group'),
            label: this.label,
            startTime: this.startTime,
            status: 'active',
            metrics: initialMetrics,
            segments: [],
            fragments: this.buildFragments(block),
            ...(this.debugMetadata && { debugMetadata: this.debugMetadata })
        };

        runtime.memory.allocate(EXECUTION_SPAN_TYPE, block.key.toString(), span, 'public');

        return [];
    }

    onDispose(runtime: IScriptRuntime, block: IRuntimeBlock): void {
        // ScriptRuntime now handles execution logging automatically via stack hooks.
        // We no longer need to manually push to executionLog here.
        // Keeping this method for potential future cleanup or specific metric handling.

    }

    onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        const endTime = Date.now();

        // Update execution span to completed
        const refs = runtime.memory.search({
            type: EXECUTION_SPAN_TYPE,
            id: null,
            ownerId: block.key.toString(),
            visibility: null
        });

        if (refs.length > 0) {
            const span = runtime.memory.get(refs[0] as any) as ExecutionSpan;
            if (span) {
                // Collect any metrics associated with this block
                // For now, we just close the span. 
                // Metrics might be collected by other behaviors or passed in.

                const updatedSpan: ExecutionSpan = {
                    ...span,
                    endTime: endTime,
                    status: 'completed'
                };
                runtime.memory.set(refs[0] as any, updatedSpan);
            }
        }
        return [];
    }

    /**
     * Extract initial metrics from block fragments.
     */
    private extractMetricsFromBlock(block: IRuntimeBlock): SpanMetrics {
        const metrics = createEmptyMetrics();

        // Prefer exercise id carried on context if present
        metrics.exerciseId = block.context?.exerciseId || metrics.exerciseId;

        return metrics;
    }

    /**
     * Build a fragment array to keep visualization context on spans.
     */
    private buildFragments(block: IRuntimeBlock) {
        const fromBlock = block.fragments?.flat();
        if (fromBlock && fromBlock.length > 0) {
            return fromBlock;
        }

        // Fallback to label fragment to avoid empty chips in history
        return [createLabelFragment(block.label, block.blockType || 'group')];
    }
}
