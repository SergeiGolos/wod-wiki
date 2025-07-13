import { IRuntimeBlock } from "../IRuntimeBlock";

import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeAction, IRuntimeEvent} from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";

export class RepeatingBlock implements IRuntimeBlock {
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
        // Logic for repeating block tick, e.g., updating round display
        return [];
    }

    public inherit(): IMetricInheritance[] {
        // Logic for metric inheritance for this block type
        return [] as IMetricInheritance[];
    }
}