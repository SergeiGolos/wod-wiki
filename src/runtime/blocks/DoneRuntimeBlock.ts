import { IRuntimeBlock } from "../IRuntimeBlock";
import { BlockKey } from "../../BlockKey";
import { IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IEventHandler } from "../EventHandler";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";

export class DoneRuntimeBlock extends RuntimeBlockWithMemoryBase {
    constructor() {
        super(new BlockKey('done'), []);
    }

    protected initializeMemory(): void {
        // No additional memory needed for done block
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

    protected onPush(): IRuntimeEvent[] {
        return [];
    }

    protected onNext(): IRuntimeBlock | undefined {
        // Done block signals completion by returning undefined
        return undefined;
    }

    protected onPop(): void {
        // Handle completion logic for done block
        console.log(`DoneRuntimeBlock ${this.key.toString()} completed`);
    }
}