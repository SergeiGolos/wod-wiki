import { BlockKey } from "../../BlockKey";
import { IMetricInheritance } from "../IMetricInheritance";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { InheritMetricInheritance } from "../MetricInheritance";
import { RuntimeMetric } from "../RuntimeMetric";

// A parent block for rounds-based workouts.

export class RoundsParentBlock implements IRuntimeBlock {
    public parent?: IRuntimeBlock;
    public metrics: RuntimeMetric[];

    constructor(public readonly key: BlockKey, metrics: RuntimeMetric[]) {
        this.metrics = metrics;
    }

    inherit(): IMetricInheritance[] {
        const rounds = this.metrics.find(m => m.type === 'rounds')?.value || 1;
        return [new InheritMetricInheritance([{ type: 'repetitions', value: rounds, unit: '' }])];
    }

    public spans: any;
    public handlers: any;
    public tick: any;
}
