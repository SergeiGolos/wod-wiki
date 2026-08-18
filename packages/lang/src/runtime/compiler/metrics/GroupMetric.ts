import { IMetric, MetricType, MetricOrigin } from '@bitcobblers/wod-wiki-core';


export type GroupType = string;

export class GroupMetric implements IMetric {
    readonly value: GroupType;

    constructor(public group: GroupType, public image: string) {
        this.value = group;
    }
    readonly type = MetricType.Group;
  readonly origin: MetricOrigin = 'parser';
}

