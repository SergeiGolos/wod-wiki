import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IEventHandler } from "../EventHandler";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import { IScriptRuntime } from "../IScriptRuntime";

// A parent block for rounds-based workouts.

export class RoundsParentBlock extends RuntimeBlockWithMemoryBase {
    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
    }

    protected initializeMemory(): void {
        // Initialize any block-specific memory here
    }

    protected createSpansBuilder(): IResultSpanBuilder {
        // Create and return spans builder
        return {
            create: () => ({ blockKey: this.key.toString(), timeSpan: {}, metrics: this.initialMetrics, duration: 0 }),
            getSpans: () => [],
            close: () => {},
            start: () => {},
            stop: () => {}
        };
    }

    protected createInitialHandlers(): IEventHandler[] {
        // Return initial event handlers
        return [];
    }

    protected onPush(runtime: IScriptRuntime): IRuntimeLog[] {
        // Return initial logs when pushed
        void runtime;
        return [{ level: 'info', message: 'rounds push', timestamp: new Date(), context: { key: this.key.toString() } }];
    }

    protected onNext(runtime: IScriptRuntime): IRuntimeLog[] {
        // Determine next block after child completion
        void runtime;
        return [];
    }

    protected onPop(runtime: IScriptRuntime): IRuntimeLog[] {
        // Handle completion logic
        void runtime;
        console.log(`RoundsParentBlock ${this.key.toString()} completed`);
        return [{ level: 'info', message: 'rounds pop', timestamp: new Date(), context: { key: this.key.toString() } }];
    }
}
