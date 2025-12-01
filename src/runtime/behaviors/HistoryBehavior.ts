import { IRuntimeBehavior } from "../IRuntimeBehavior";
import { IRuntimeAction } from "../IRuntimeAction";
import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { MemoryTypeEnum } from "../MemoryTypeEnum";
import { ExecutionSpan, SpanMetrics, createEmptyMetrics, legacyTypeToSpanType } from "../models/ExecutionSpan";
import { EXECUTION_SPAN_TYPE } from "../ExecutionTracker";
import { RuntimeMetric } from "../RuntimeMetric";

/**
 * Behavior that tracks the execution history of a block.
 * Records start time, end time, parent ID, and metrics, then logs to runtime.executionLog.
 */
export class HistoryBehavior implements IRuntimeBehavior {
    private startTime: number = 0;
    private parentSpanId: string | null = null;
    private label: string;

    constructor(label?: string) {
        this.label = label || "Block";
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

        // Create initial metrics from block's compiled metrics
        const initialMetrics = this.extractMetricsFromBlock(block);
        
        // Create execution span
        const span: ExecutionSpan = {
            id: `${this.startTime}-${block.key.toString()}`,
            blockId: block.key.toString(),
            parentSpanId: this.parentSpanId,
            type: legacyTypeToSpanType(block.blockType || 'group'),
            label: this.label,
            startTime: this.startTime,
            status: 'active',
            metrics: initialMetrics,
            segments: []
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
     * Extract initial metrics from block's compiled metrics.
     * This ensures exercise name, target reps, etc. are captured in the span.
     */
    private extractMetricsFromBlock(block: IRuntimeBlock): SpanMetrics {
        const metrics = createEmptyMetrics();
        
        // Try to get compiled metrics from the block
        const compiledMetrics = block.compiledMetrics as RuntimeMetric | undefined;
        
        if (compiledMetrics) {
            // Extract exercise ID
            if (compiledMetrics.exerciseId) {
                metrics.exerciseId = compiledMetrics.exerciseId;
            }
            
            // Extract metric values
            for (const value of compiledMetrics.values) {
                const recorded = Date.now();
                
                switch (value.type) {
                    case 'repetitions':
                        if (value.value !== undefined) {
                            // targetReps is just a number in SpanMetrics
                            metrics.targetReps = value.value;
                        }
                        break;
                    case 'resistance':
                        if (value.value !== undefined) {
                            metrics.weight = {
                                value: value.value,
                                unit: value.unit || 'lb',
                                recorded
                            };
                        }
                        break;
                    case 'distance':
                        if (value.value !== undefined) {
                            metrics.distance = {
                                value: value.value,
                                unit: value.unit || 'm',
                                recorded
                            };
                        }
                        break;
                    case 'time':
                        if (value.value !== undefined) {
                            metrics.duration = {
                                value: value.value,
                                unit: value.unit || 'ms',
                                recorded
                            };
                        }
                        break;
                    case 'calories':
                        if (value.value !== undefined) {
                            metrics.calories = {
                                value: value.value,
                                unit: value.unit || 'cal',
                                recorded
                            };
                        }
                        break;
                }
            }
            
            // Store legacy metrics for backward compatibility
            metrics.legacyMetrics = [compiledMetrics];
        }
        
        return metrics;
    }
}
