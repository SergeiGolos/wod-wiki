import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import { IRuntimeBlock } from "../IRuntimeBlock";

// Parent block for countdown-based workouts adapted to the memory model.
export class CountdownParentBlock extends RuntimeBlockWithMemoryBase {
    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`⏳ CountdownParentBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // No extra memory yet
        console.log(`⏳ CountdownParentBlock.initializeMemory()`);
    }

    protected createSpansBuilder(): IResultSpanBuilder {
        return {
            create: () => ({ blockKey: '', timeSpan: {}, metrics: [], duration: 0 }),
            getSpans: () => [],
            close: () => {},
            start: () => {},
            stop: () => {}
        };
    }

    protected createInitialHandlers(): EventHandler[] {
        // Handlers to manage countdown progression would go here
        return [];
    }

    protected onPush(): IRuntimeEvent[] {
        console.log(`⏳ CountdownParentBlock.onPush() - Block pushed to stack`);
        return [];
    }

    protected onNext(): IRuntimeBlock | undefined {
        console.log(`⏳ CountdownParentBlock.onNext() - Determining next block after child completion`);
        // For countdown blocks, typically no next block (single execution)
        return undefined;
    }

    protected onPop(): void {
        console.log(`⏳ CountdownParentBlock.onPop() - Block popped from stack, cleaning up`);
        // Handle completion logic for countdown block
    }
}
