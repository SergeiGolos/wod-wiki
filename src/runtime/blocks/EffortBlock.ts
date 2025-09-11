import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import { EffortNextHandler } from "../handlers/EffortNextHandler";

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
        console.log(`💪 EffortBlock reset: ${this.key.toString()}`);
    }
}