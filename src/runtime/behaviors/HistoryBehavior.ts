import { IRuntimeBehavior } from "../IRuntimeBehavior";
import { IRuntimeAction } from "../IRuntimeAction";
import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { ExecutionRecord } from "../models/ExecutionRecord";
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
        
        // Allocate start time in memory for UI visibility
        // Cast to any to access context (RuntimeBlock has it, but IRuntimeBlock interface might not expose it yet)
        const blockWithContext = block as any;
        if (blockWithContext.context) {
            blockWithContext.context.allocate(
                MemoryTypeEnum.METRIC_START_TIME,
                this.startTime,
                'public'
            );
        }
        
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
        const endTime = Date.now();
        
        // Collect metrics (placeholder for now - could query memory for specific metrics)
        const metrics: any = {};
        if ((block as any).reps !== undefined) metrics.reps = (block as any).reps;
        
        const record: ExecutionRecord = {
            blockId: block.key.toString(),
            parentId: this.parentId,
            type: block.blockType || 'unknown',
            label: this.label,
            startTime: this.startTime,
            endTime: endTime,
            metrics: metrics
        };

        runtime.executionLog.push(record);
        console.log(`📜 HistoryBehavior: Logged execution for ${block.key.toString()} (${this.label})`);
    }
}
