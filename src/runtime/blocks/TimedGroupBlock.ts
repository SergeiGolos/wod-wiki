import { IRuntimeBlock } from "../IRuntimeBlock";
import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";

import { GroupNextHandler } from "../handlers/GroupNextHandler";

export class TimedGroupBlock implements IRuntimeBlock {
    public parent?: IRuntimeBlock;
    public spans: IResultSpanBuilder;
    public metrics: RuntimeMetric[];
    public handlers: EventHandler[];
    private childBlocks: IRuntimeBlock[] = []; // Placeholder
    private currentChildIndex: number = -1; // Placeholder

    constructor(public readonly key: BlockKey, metrics: RuntimeMetric[]) {
        this.metrics = metrics;
        this.spans = {} as IResultSpanBuilder;
        this.handlers = [new GroupNextHandler()];
    }

    public hasNextChild(): boolean {
        return this.currentChildIndex < this.childBlocks.length - 1;
    }

    public advanceToNextChild(): void {
        this.currentChildIndex++;
        // In a real implementation, this would involve more logic
        // to activate the next child block.
    }

    public tick(): IRuntimeEvent[] {
        return [];
    }

    public inherit(): IMetricInheritance[] {
        return [];
    }
}