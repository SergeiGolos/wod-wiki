import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";

export class RoundsMetric implements IMetric {
  readonly value: number | string;
  readonly image: string;
  readonly origin: MetricOrigin = 'parser';

  constructor(public count: number | string) {
    this.value = count;
    this.image = count.toString();
  }
  readonly type = MetricType.Rounds;
}

