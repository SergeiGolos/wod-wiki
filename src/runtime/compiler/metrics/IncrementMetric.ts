import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";

export class IncrementMetric implements IMetric {
  readonly value: number;
  readonly increment: number;
  readonly origin: MetricOrigin = 'parser';

  constructor(public image: string) {
    this.increment = image == "^" ? 1 : -1;
    this.value = this.increment;
  }
  readonly type = MetricType.Increment;
}

