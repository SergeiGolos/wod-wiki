import { IRuntimeBehavior } from "../IRuntimeBehavior";
import { IRuntimeAction } from "../IRuntimeAction";
import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { MemoryTypeEnum } from "../MemoryTypeEnum";
import { RuntimeSpan, TimerSpan, RUNTIME_SPAN_TYPE } from "../models/RuntimeSpan";
import { createLabelFragment } from "../utils/metricsToFragments";

/**
 * Behavior that tracks the execution history of a block using RuntimeSpan.
 */
export class HistoryBehavior implements IRuntimeBehavior {
    private startTime: number = 0;
    private label?: string;
    private config?: string | { label?: string; debugMetadata?: any };

    constructor(labelOrConfig?: string | { label?: string; debugMetadata?: any }) {
        this.config = labelOrConfig;
        if (typeof labelOrConfig === 'string') {
            this.label = labelOrConfig;
        } else if (labelOrConfig) {
            this.label = labelOrConfig.label;
        }
    }

    onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        this.startTime = Date.now();

        // Allocate start time in metrics for backward compatibility with some behaviors
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

        // Build metadata from config
        const metadata: any = {
            tags: [],
            context: {},
            logs: []
        };

        if (this.config && typeof this.config !== 'string') {
            if (this.config.debugMetadata) {
                metadata.tags = this.config.debugMetadata.tags || [];
                metadata.context = this.config.debugMetadata.context || {};
                metadata.logs = this.config.debugMetadata.logs || [];
            }
        }

        // Create RuntimeSpan
        const fragments = block.fragments ? [...block.fragments] : [[createLabelFragment(this.label || block.label, block.blockType || 'group')]];
        const runtimeSpan = new RuntimeSpan(
            block.key.toString(),
            [...block.sourceIds],
            [new TimerSpan(this.startTime)],
            fragments,
            undefined,
            metadata
        );
        runtime.memory.allocate(RUNTIME_SPAN_TYPE, block.key.toString(), runtimeSpan, 'public');

        return [];
    }

    onDispose(_runtime: IScriptRuntime, _block: IRuntimeBlock): void {
        // No-op
    }

    onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        const endTime = Date.now();

        // Update RuntimeSpan
        const runtimeRefs = runtime.memory.search({
            type: RUNTIME_SPAN_TYPE,
            id: null,
            ownerId: block.key.toString(),
            visibility: null
        });

        if (runtimeRefs.length > 0) {
            const span = runtime.memory.get(runtimeRefs[0] as any) as RuntimeSpan;
            if (span && span.spans.length > 0) {
                const lastTimer = span.spans[span.spans.length - 1];
                if (lastTimer.ended === undefined) {
                    lastTimer.ended = endTime;
                    runtime.memory.set(runtimeRefs[0] as any, span);
                }
            }
        }

        return [];
    }
}
