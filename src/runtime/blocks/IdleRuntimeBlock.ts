import { IRuntimeBlock } from "../IRuntimeBlock";

import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeAction, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";

export class IdleRuntimeBlock implements IRuntimeBlock {
    public readonly key: BlockKey;
    public parent?: IRuntimeBlock;
    public spans: IResultSpanBuilder;
    public metrics: RuntimeMetric[];
    public handlers: EventHandler[];

    constructor() {
        this.key = new BlockKey('idle', [], []);
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

    public isDone(): boolean { return false; }

    public reset(): void {}
}
