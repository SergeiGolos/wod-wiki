import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";
import { MetricBehavior } from "../../../types/MetricBehavior";

export class RepMetric implements IMetric {
  readonly value?: number;
  readonly image: string;
  readonly origin: MetricOrigin;

  constructor(public reps?: number) {
    if (reps !== undefined) {
      if (reps < 0) {
        throw new Error(`Rep count cannot be negative: ${reps}`);
      }
      if (!Number.isInteger(reps)) {
        throw new Error(`Rep count must be an integer: ${reps}`);
      }
    }
    this.value = reps;
    this.image = reps !== undefined ? reps.toString() : '?';
    // If reps is undefined, this is a collectible metrics from user input
    this.origin = reps === undefined ? 'user' : 'parser';
    this.behavior = reps === undefined ? MetricBehavior.Hint : MetricBehavior.Defined;
  }
  readonly type: string = "rep";
  readonly metricType = MetricType.Rep;
  readonly behavior: MetricBehavior;
} 

