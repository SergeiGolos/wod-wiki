import { BlockKey } from "../../BlockKey";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RootNextHandler } from "../handlers/RootNextHandler";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import { IRuntimeBlock } from "../IRuntimeBlock";

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

    protected onPush(): IRuntimeEvent[] {
        console.log(`🌱 RootBlock.onPush() - Block pushed to stack`);
        return [];
    }

    protected onNext(): IRuntimeBlock | undefined {
        console.log(`🌱 RootBlock.onNext() - Determining next block after child completion`);
        // Root block typically doesn't have a next block
        return undefined;
    }

    protected onPop(): void {
        console.log(`🌱 RootBlock.onPop() - Block popped from stack, cleaning up`);
        // Handle completion logic for root block
    }
}