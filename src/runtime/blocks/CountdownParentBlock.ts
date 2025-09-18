import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { IEventHandler, IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RuntimeBlock } from "../RuntimeBlock";
import { IScriptRuntime } from "../IScriptRuntime";

// Parent block for countdown-based workouts adapted to the memory model.
export class CountdownParentBlock extends RuntimeBlock {
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

    protected createInitialHandlers(): IEventHandler[] {
        // Handlers to manage countdown progression would go here
        return [];
    }

    protected onPush(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏳ CountdownParentBlock.onPush() - Block pushed to stack`);
        void runtime;
        return [{ level: 'info', message: 'countdown push', timestamp: new Date(), context: { key: this.key.toString() } }];
    }

    protected onNext(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏳ CountdownParentBlock.onNext() - Determining next block after child completion`);
        void runtime;
        // For countdown blocks, no scheduling here
        return [];
    }

    protected onPop(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏳ CountdownParentBlock.onPop() - Block popped from stack, cleaning up`);
        void runtime;
        // Handle completion logic for countdown block
        return [{ level: 'info', message: 'countdown pop', timestamp: new Date(), context: { key: this.key.toString() } }];
    }
}
