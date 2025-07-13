import { IRuntimeBlock } from "../IRuntimeBlock";
import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler,IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";

export class DoneRuntimeBlock implements IRuntimeBlock {
    public key: BlockKey;
    public spans: IResultSpanBuilder;
    public metrics: RuntimeMetric[];
    public handlers: EventHandler[];
    public parent?: IRuntimeBlock | undefined;

    constructor() {
        this.key = new BlockKey('done', [], []);
        this.spans = {} as IResultSpanBuilder;
        this.metrics = [];
        this.handlers = [];
    }

    public tick(): IRuntimeEvent[] {
        // Done block doesn't have a direct tick logic, it represents a final state
        return [];
    }

    public inherit(): IMetricInheritance {
        // Done block might not inherit much, or could provide base inheritance
        return {} as IMetricInheritance;
    }
}