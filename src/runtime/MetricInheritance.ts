
import { IMetricInheritance } from "./IMetricInheritance";
import { RuntimeMetric, MetricValue } from "./RuntimeMetric";

export class OverrideMetricInheritance implements IMetricInheritance {
    constructor(private newValues: MetricValue[]) {}

    compose(metric: RuntimeMetric): RuntimeMetric {
        this.newValues.forEach(newValue => {
            metric.values = metric.values.filter(v => v.type !== newValue.type);
            metric.values.push(newValue);
        });
        
        return metric;
    }
}

export class IgnoreMetricInheritance implements IMetricInheritance {
    constructor(private typesToIgnore: string[]) {}

    compose(metric: RuntimeMetric): RuntimeMetric {
        metric.values = metric.values.filter(value => !this.typesToIgnore.includes(value.type));
        return metric;
    }
}

export class InheritMetricInheritance implements IMetricInheritance {
    constructor(private valuesToAdd: MetricValue[]) {}

    compose(metric: RuntimeMetric): RuntimeMetric {
        this.valuesToAdd.forEach(valueToAdd => {
            const exists = metric.values.some(existingValue => existingValue.type === valueToAdd.type);
            if (!exists) {
                metric.values.push({ ...valueToAdd });
            }
        });
        return metric;
    }
}
