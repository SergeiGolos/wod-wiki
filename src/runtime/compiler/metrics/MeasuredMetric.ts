import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";
import { Dimension } from "../../../core/metrics/units";

/**
 * A dimensioned measurement that has no dedicated metric class (e.g. energy
 * `cal`, time `min`). Length and mass fuse into DistanceMetric / ResistanceMetric;
 * every other {@link Dimension} fuses into this generic carrier so the value and
 * unit are preserved for analytics.
 */
export class MeasuredMetric implements IMetric {
  readonly value: { amount: number | undefined; unit: string };
  readonly image: string;
  readonly origin: MetricOrigin;
  readonly type: MetricType | string;

  constructor(
    amount: number | undefined,
    public unit: string,
    public dimension: Dimension,
  ) {
    this.value = { amount, unit };
    this.image = amount !== undefined ? `${amount} ${unit}` : `? ${unit}`;
    this.origin = amount === undefined ? 'hinted' : 'parser';
    // Energy gets a stable string type so analytics can find calories; other
    // dimensions fall back to the generic Custom bucket.
    this.type = dimension === 'energy' ? 'energy' : MetricType.Custom;
  }
}
