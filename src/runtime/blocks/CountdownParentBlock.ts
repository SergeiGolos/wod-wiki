import { BlockKey } from "../../BlockKey";
import { IMetricInheritance } from "../IMetricInheritance";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { RuntimeMetric } from "../RuntimeMetric";

// A simple block for a basic effort with no special inheritance.
// A parent block for countdown-based workouts.

export class CountdownParentBlock implements IRuntimeBlock {
    public parent?: IRuntimeBlock;
    public metrics: RuntimeMetric[];

    constructor(public readonly key: BlockKey, metrics: RuntimeMetric[]) {
        this.metrics = metrics;
    }

    inherit(): IMetricInheritance[] { return []; } // No direct metric inheritance

    public spans: any;
    public handlers: any;
    public tick: any;
}
