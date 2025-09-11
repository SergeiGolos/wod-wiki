import { BlockKey } from "../../BlockKey";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";
import { RootNextHandler } from "../handlers/RootNextHandler";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";

/**
 * Root block adapted to the memory model. This ensures setRuntime() exists
 * so ScriptRuntimeWithMemory can push it safely.
 */
export class RootBlock extends RuntimeBlockWithMemoryBase {
    constructor(children: string[]) {
        console.log(`🌱 RootBlock constructor - Creating with children: [${children.join(', ')}]`);
        const key = new BlockKey('root', children, []);
        super(key, []);
        console.log(`🌱 RootBlock created with key: ${this.key.toString()}`);
    }

    protected initializeMemory(): void {
        // No additional memory for now; handlers/spans/metrics handled by base
        console.log(`🌱 RootBlock.initializeMemory()`);
    }

    protected createSpansBuilder(): IResultSpanBuilder {
        // Minimal spans builder placeholder
        return {
            create: () => ({ blockKey: '', timeSpan: {}, metrics: [], duration: 0 }),
            getSpans: () => [],
            close: () => {},
            start: () => {},
            stop: () => {}
        };
    }

    protected createInitialHandlers(): EventHandler[] {
        const handlers = [new RootNextHandler()];
        console.log(`  🔧 Registered ${handlers.length} handlers: ${handlers.map(h => h.name).join(', ')}`);
        return handlers;
    }

    public tick(): IRuntimeEvent[] {
        console.log(`🌱 RootBlock.tick() - Called`);
        return [];
    }

    public inherit(): IMetricInheritance[] {
        console.log(`🌱 RootBlock.inherit() - Called`);
        return [];
    }

    public isDone(): boolean { return false; }

    public reset(): void {}
}