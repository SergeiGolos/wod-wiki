import { BlockKey } from "../../BlockKey";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { RuntimeMetric } from "../RuntimeMetric";
import { IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { EventHandler } from "../EventHandler";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";

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

    protected createInitialHandlers(): EventHandler[] {
        // Return initial event handlers
        return [];
    }

    protected onPush(): IRuntimeEvent[] {
        // Return initial events when pushed
        return [];
    }

    protected onNext(): IRuntimeBlock | undefined {
        // Determine next block after child completion
        // For now, signal completion by returning undefined
        return undefined;
    }

    protected onPop(): void {
        // Handle completion logic
        console.log(`RoundsParentBlock ${this.key.toString()} completed`);
    }
}
