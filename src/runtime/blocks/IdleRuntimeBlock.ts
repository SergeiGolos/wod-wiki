import { IRuntimeBlock } from "../IRuntimeBlock";

import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeAction, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";

export class IdleRuntimeBlock implements IRuntimeBlock {
    public key: BlockKey;
    public spans: IResultSpanBuilder;
    public metrics: RuntimeMetric[];
    public handlers: EventHandler[];
    public parent?: IRuntimeBlock | undefined;

    constructor() {
        this.key = new BlockKey('idle', [], []);
        this.spans = {} as IResultSpanBuilder; // Placeholder, as ResultSpanBuilder is an interface
        this.metrics = [];
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
