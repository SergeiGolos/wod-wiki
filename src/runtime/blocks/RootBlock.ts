import { IRuntimeBlock } from "../IRuntimeBlock";

import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeAction, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";

export class RootBlock implements IRuntimeBlock {
    public key: BlockKey;
    public spans: IResultSpanBuilder;
    public metrics: RuntimeMetric[];
    public handlers: EventHandler[];
    public parent?: IRuntimeBlock | undefined;

    constructor(children: string[]) {
        this.key = new BlockKey('root', children, []);
        this.spans = {} as IResultSpanBuilder; // Placeholder, as ResultSpanBuilder is an interface
        this.metrics = [];
        this.handlers = [];
    }

    public tick(): IRuntimeEvent[] {
        // Root block doesn't have a direct tick logic, it orchestrates children
        return [];
    }

    public inherit(): IMetricInheritance[] {
        // Root block might not inherit much, or could provide base inheritance
        return [] as IMetricInheritance[];
    }
}