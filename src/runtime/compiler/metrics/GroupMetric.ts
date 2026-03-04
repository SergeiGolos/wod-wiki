import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";
import { GroupType } from "../../../parser/timer.visitor";
import { MetricBehavior } from "../../../types/MetricBehavior";

export class GroupMetric implements IMetric {
    readonly value: GroupType;
    readonly origin: MetricOrigin = 'parser';

    constructor(public group: GroupType, public image: string) {
        this.value = group;
    }
    readonly type: string = "group";
    readonly metricType = MetricType.Group;
    readonly behavior: MetricBehavior = MetricBehavior.Defined;
}

