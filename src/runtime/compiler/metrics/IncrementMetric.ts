import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";
import { MetricBehavior } from "../../../types/MetricBehavior";

export class IncrementMetric implements IMetric {
  readonly value: number;
  readonly increment: number;
  readonly origin: MetricOrigin = 'parser';
  readonly behavior: MetricBehavior = MetricBehavior.Hint;

  constructor(public image: string) {
    this.increment = image == "^" ? 1 : -1;
    this.value = this.increment;
  }
  readonly type: string = "increment";
  readonly metricType = MetricType.Increment;
}

