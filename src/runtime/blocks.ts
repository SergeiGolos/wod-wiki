
import { IRuntimeBlock } from "./IRuntimeBlock";
import { BlockKey } from "../BlockKey";
import { IMetricInheritance } from "./IMetricInheritance";
import { InheritMetricInheritance } from "./MetricInheritance";
import { RuntimeMetric } from "./RuntimeMetric";

// A simple block for a basic effort with no special inheritance.
export class EffortBlock implements IRuntimeBlock {
    public parent?: IRuntimeBlock;
    public metrics: RuntimeMetric[];

    constructor(public readonly key: BlockKey, metrics: RuntimeMetric[]) {
        this.metrics = metrics;
    }

    inherit(): IMetricInheritance[] { return []; }

    // Other IRuntimeBlock methods are not needed for this example
    public spans: any;
    public handlers: any;
    public tick: any;
}

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
