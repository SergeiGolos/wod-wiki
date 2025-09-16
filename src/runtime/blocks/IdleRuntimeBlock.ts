import { IRuntimeBlock } from "../IRuntimeBlock";
import { IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { EventHandler } from "../EventHandler";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";

export class IdleRuntimeBlock extends RuntimeBlockWithMemoryBase {
    constructor() {
        super(n'idle', []);
    }

    protected initializeMemory(): void {
        // No additional memory needed for idle block
    }

    protected createSpansBuilder(): IResultSpanBuilder {
        return {
            create: () => ({ blockKey: this.key.toString(), timeSpan: {}, metrics: [], duration: 0 }),
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
        return [];
    }

    protected onNext(): IRuntimeBlock | undefined {
        // Idle block never completes, so never return a next block
        return undefined;
    }

    protected onPop(): void {
        // Handle completion logic for idle block
        console.log(`IdleRuntimeBlock ${this.key.toString()} completed`);
    }
}
