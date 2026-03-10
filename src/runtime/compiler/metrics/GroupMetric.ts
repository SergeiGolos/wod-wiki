import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";
import { GroupType } from "../../../parser/timer.visitor";

export class GroupMetric implements IMetric {
    readonly value: GroupType;

    constructor(public group: GroupType, public image: string) {
        this.value = group;
    }
    readonly type = MetricType.Group;
  readonly origin: MetricOrigin = 'parser';
}

