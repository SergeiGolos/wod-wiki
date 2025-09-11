import { BlockKey } from "../../BlockKey";
import { IMetricInheritance } from "../IMetricInheritance";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";

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

    public tick(): IRuntimeEvent[] { return []; }
    public inherit(): IMetricInheritance[] { return []; }
    public isDone(): boolean { return false; }
    public reset(): void {}
}
