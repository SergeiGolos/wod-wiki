import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";

export class DistanceMetric implements IMetric {
  readonly value: { amount: number | undefined, unit: string };
  readonly image: string;
  readonly origin: MetricOrigin;

  constructor(value: number | undefined, public unit: string) {
    this.value = { amount: value, unit: unit };
    this.image = value !== undefined ? `${value} ${unit}` : `? ${unit}`;
    // If value is undefined, this is a collectible metrics from user input
    this.origin = value === undefined ? 'user' : 'parser';
    this.origin = value === undefined ? 'hinted' : 'parser';
  }
  readonly type = MetricType.Distance;
} 

