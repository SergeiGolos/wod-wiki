import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";
import { MetricBehavior } from "../../../types/MetricBehavior";

export class EffortMetric implements IMetric {
  readonly value: string;
  readonly image: string;
  readonly origin: MetricOrigin = 'parser';
  readonly behavior: MetricBehavior = MetricBehavior.Defined;

  constructor(public effort: string) {
    this.value = effort;
    this.image = effort;
  }
  readonly type: string = "effort";
  readonly metricType = MetricType.Effort;
}

