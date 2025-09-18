import { IRuntimeBlock } from "../IRuntimeBlock";
import { BlockKey } from "../../BlockKey";
import { IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IEventHandler } from "../EventHandler";
import { RuntimeBlock } from "../RuntimeBlock";

export class DoneRuntimeBlock extends RuntimeBlock {
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

    protected onPush(): IRuntimeLog[] {
        return [];
    }

    protected onNext(): IRuntimeLog[] {
        // Done block signals completion by returning empty logs
        return [];
    }

    protected onPop(): IRuntimeLog[] {
        // Handle completion logic for done block
        console.log(`DoneRuntimeBlock ${this.key.toString()} completed`);
        return [];
    }
}