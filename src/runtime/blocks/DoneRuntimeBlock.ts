import { IRuntimeBlock } from "../IRuntimeBlock";
import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler,IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";

export class DoneRuntimeBlock implements IRuntimeBlock {
    public readonly key: BlockKey;
    public parent?: IRuntimeBlock;
    public spans: IResultSpanBuilder;
    public metrics: RuntimeMetric[];
    public handlers: EventHandler[];

    constructor() {
        this.key = new BlockKey('done', [], []);
        this.spans = {} as IResultSpanBuilder;
        this.metrics = [];
        this.handlers = [];
    }

    public tick(): IRuntimeEvent[] {
        return [];
    }

    public inherit(): IMetricInheritance[] {
        return [];
    }
}