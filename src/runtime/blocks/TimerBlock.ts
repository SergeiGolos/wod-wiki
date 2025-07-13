import { IRuntimeBlock } from "../IRuntimeBlock";
import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";

export class TimerBlock implements IRuntimeBlock {
    public key: BlockKey;
    public spans: IResultSpanBuilder;
    public metrics: RuntimeMetric[];
    public handlers: EventHandler[];
    public parent?: IRuntimeBlock | undefined;

    constructor(metrics: RuntimeMetric[], key: BlockKey) {
        this.metrics = metrics;
        this.key = key;
        this.spans = {} as IResultSpanBuilder;
        this.handlers = [];
    }

    public tick(): IRuntimeEvent[] {
        // Logic for timer block tick, e.g., updating timer display
        return [];
    }

    public inherit(): IMetricInheritance[] {
        // Logic for metric inheritance for this block type
        return [] as IMetricInheritance[];
    }
}