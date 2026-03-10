import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";

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

