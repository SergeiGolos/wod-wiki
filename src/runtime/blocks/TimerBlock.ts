import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import { IRuntimeBlock } from "../IRuntimeBlock";

export class TimerBlock extends RuntimeBlockWithMemoryBase {

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`⏱️ TimerBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // Timer blocks might need to store timing state, callbacks, or other runtime data
        // For now, this is empty but can be expanded
        console.log(`⏱️ TimerBlock initialized memory for: ${this.key.toString()}`);
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
        return [];
    }

    protected onPush(): IRuntimeEvent[] {
        console.log(`⏱️ TimerBlock.onPush() - Block pushed to stack`);
        return [];
    }

    protected onNext(): IRuntimeBlock | undefined {
        console.log(`⏱️ TimerBlock.onNext() - Determining next block after child completion`);
        // Timer blocks typically don't have child blocks
        return undefined;
    }

    protected onPop(): void {
        console.log(`⏱️ TimerBlock.onPop() - Block popped from stack, cleaning up`);
        // Handle completion logic for timer block
    }
}