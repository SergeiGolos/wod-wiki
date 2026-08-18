import { IMetric, MetricType, MetricOrigin } from '@wod-wiki/core';

export class EffortMetric implements IMetric {
  readonly value: string;
  readonly image: string;
  readonly origin: MetricOrigin = 'parser';

  constructor(public effort: string) {
    this.value = effort;
    this.image = effort;
  }
  readonly type = MetricType.Effort;
}

