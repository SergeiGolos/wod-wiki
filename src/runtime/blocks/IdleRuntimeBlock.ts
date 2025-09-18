import { IRuntimeBlock } from "../IRuntimeBlock";
import { IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IEventHandler } from "../EventHandler";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import { BlockKey } from "../../BlockKey";

export class IdleRuntimeBlock extends RuntimeBlockWithMemoryBase {
    constructor() {
        super(new BlockKey('idle'), []);
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

    protected createInitialHandlers(): IEventHandler[] {
        return [];
    }

    protected onPush(): IRuntimeLog[] {
        return [];
    }

    protected onNext(): IRuntimeLog[] {
        // Idle block never completes, so never return a next block
        return [];
    }

    protected onPop(): IRuntimeLog[] {
        // Handle completion logic for idle block
        console.log(`IdleRuntimeBlock ${this.key.toString()} completed`);
        return [];
    }
}
