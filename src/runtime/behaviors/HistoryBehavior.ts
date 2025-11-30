import { IRuntimeBehavior } from "../IRuntimeBehavior";
import { IRuntimeAction } from "../IRuntimeAction";
import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { MemoryTypeEnum } from "../MemoryTypeEnum";

/**
 * Behavior that tracks the execution history of a block.
 * Records start time, end time, parent ID, and metrics, then logs to runtime.executionLog.
 */
export class HistoryBehavior implements IRuntimeBehavior {
    private startTime: number = 0;
    private parentId: string | null = null;
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
        
        // Determine parent ID from stack
        // The block is already on the stack, so parent is at index length - 2
        const stack = runtime.stack.blocks;
        if (stack.length >= 2) {
            this.parentId = stack[stack.length - 2].key.toString();
        } else {
            this.parentId = null;
        }

        // If label wasn't provided, try to derive it from block type or context
        if (this.label === "Block" && block.blockType) {
            this.label = block.blockType;
        }

        return [];
    }

    onDispose(runtime: IScriptRuntime, block: IRuntimeBlock): void {
        // ScriptRuntime now handles execution logging automatically via stack hooks.
        // We no longer need to manually push to executionLog here.
        // Keeping this method for potential future cleanup or specific metric handling.

    }
}
