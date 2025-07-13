import { IRuntimeBlock } from "../IRuntimeBlock";

import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeAction, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";

export class RootBlock implements IRuntimeBlock {
    public readonly key: BlockKey;
    public parent?: IRuntimeBlock;
    public spans: IResultSpanBuilder;
    public metrics: RuntimeMetric[];
    public handlers: EventHandler[];

    constructor(children: string[]) {
        this.key = new BlockKey('root', children, []);
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