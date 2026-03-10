import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";

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
    this.origin = reps === undefined ? 'hinted' : 'parser';
  }
  readonly type = MetricType.Rep;
} 

