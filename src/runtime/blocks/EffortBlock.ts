import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import { EffortNextHandler } from "../handlers/EffortNextHandler";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { BlockKey } from "../../BlockKey";

export class EffortBlock extends RuntimeBlockWithMemoryBase {

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`💪 EffortBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // EffortBlocks might need to store effort-specific state in memory
        console.log(`💪 EffortBlock initialized memory for: ${this.key.toString()}`);
    }

    protected createSpansBuilder(): IResultSpanBuilder {
        // Create a simple spans builder - this should be replaced with actual implementation
        return {
            create: () => ({ blockKey: '', timeSpan: {}, metrics: [], duration: 0 }),
            getSpans: () => [],
            close: () => {},
            start: () => {},
            stop: () => {}
        };
    }

    protected createInitialHandlers(): EventHandler[] {
        return [new EffortNextHandler()];
    }

    protected onPush(): IRuntimeEvent[] {
        console.log(`💪 EffortBlock.onPush() - Block pushed to stack`);
        return [];
    }

    protected onNext(): IRuntimeBlock | undefined {
        console.log(`💪 EffortBlock.onNext() - Determining next block after child completion`);
        // Effort blocks typically don't have child blocks
        return undefined;
    }

    protected onPop(): void {
        console.log(`💪 EffortBlock.onPop() - Block popped from stack, cleaning up`);
        // Handle completion logic for effort block
    }
}