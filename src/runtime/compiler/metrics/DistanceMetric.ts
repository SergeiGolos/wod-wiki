import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";
import { MetricBehavior } from "../../../types/MetricBehavior";


export class DistanceMetric implements IMetric {
  readonly value: { amount: number | undefined, units: string };
  readonly image: string;
  readonly origin: MetricOrigin;

  constructor(value: number | undefined, public units: string) {
    this.value = { amount: value, units: units };
    this.image = value !== undefined ? `${value} ${units}` : `? ${units}`;
    // If value is undefined, this is a collectible metrics from user input
    this.origin = value === undefined ? 'user' : 'parser';
    this.behavior = value === undefined ? MetricBehavior.Hint : MetricBehavior.Defined;
  }
  readonly type: string = "distance";
  readonly metricType = MetricType.Distance;
  readonly behavior: MetricBehavior;
} 

