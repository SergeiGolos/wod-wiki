import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";
import { MetricBehavior } from "../../../types/MetricBehavior";

export class RoundsMetric implements IMetric {
  readonly value: number | string;
  readonly image: string;
  readonly origin: MetricOrigin = 'parser';
  readonly behavior: MetricBehavior = MetricBehavior.Defined;

  constructor(public count: number | string) {
    this.value = count;
    this.image = count.toString();
  }
  readonly type: string = "rounds";
  readonly metricType = MetricType.Rounds;
}

