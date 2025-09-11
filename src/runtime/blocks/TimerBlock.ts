import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";

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

    public tick(): IRuntimeEvent[] {
        return [];
    }

    public inherit(): IMetricInheritance[] {
        return [];
    }

    public isDone(): boolean { 
        return false; 
    }

    public reset(): void {
        console.log(`⏱️ TimerBlock reset: ${this.key.toString()}`);
    }
}