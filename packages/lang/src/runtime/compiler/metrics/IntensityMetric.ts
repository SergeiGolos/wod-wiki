import { IMetric, MetricType, MetricOrigin } from '@bitcobblers/wod-wiki-core';

/**
 * Percent-of-max intensity (e.g. `80%` — 80% of 1RM or max effort).
 *
 * The grammar lexes `%` as a symbol token, never a word, so it cannot ride
 * the unit registry; the base Units Dialect fuses a bare number followed by
 * a bare `%` effort into this metric. `Run 400m 80%` keeps its distance and
 * effort metrics and gains this intensity metric alongside them.
 */
export class IntensityMetric implements IMetric {
  readonly value: { amount: number | undefined, unit: string };
  readonly image: string;
  readonly origin: MetricOrigin;

  constructor(value: number | undefined, public unit: string = '%') {
    this.value = { amount: value, unit: unit };
    this.image = value !== undefined ? `${value}${unit}` : `?${unit}`;
    // If value is undefined, this is a collectible metric hinted from user input
    this.origin = value === undefined ? 'hinted' : 'parser';
  }
  readonly type = MetricType.Intensity;
}
