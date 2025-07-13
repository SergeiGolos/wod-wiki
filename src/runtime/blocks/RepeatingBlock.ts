import { IRuntimeBlock } from "../IRuntimeBlock";

import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeAction, IRuntimeEvent} from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";

export class RepeatingBlock implements IRuntimeBlock {
    public parent?: IRuntimeBlock;
    public spans: IResultSpanBuilder;
    public metrics: RuntimeMetric[];
    public handlers: EventHandler[];

    constructor(public readonly key: BlockKey, metrics: RuntimeMetric[]) {
        this.metrics = metrics;
        this.spans = {} as IResultSpanBuilder;
        this.handlers = [];
    }

    public tick(): IRuntimeEvent[] {
        return [];
    }

    public inherit(): IMetricInheritance[] {
        return [];
    }
}