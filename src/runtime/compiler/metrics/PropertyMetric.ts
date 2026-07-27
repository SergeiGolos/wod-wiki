import { IMetric, MetricOrigin, MetricType } from '../../../core/models/Metric';

export interface PropertyMetricOptions {
  readonly type?: MetricType | string;
  readonly origin?: MetricOrigin;
  readonly image?: string;
}

function formatPropertyValue(value: string | number | boolean | null): string {
  if (value === null) return 'null';
  return String(value);
}

export class PropertyMetric implements IMetric {
  readonly key: string;
  readonly value: string | number | boolean | null;
  readonly image: string;
  readonly origin: MetricOrigin;

  constructor(key: string, value: string | number | boolean | null, options: PropertyMetricOptions = {}) {
    this.key = key;
    this.value = value;
    this.image = options.image ?? `${key}: ${formatPropertyValue(value)}`;
    this.origin = options.origin ?? 'parser';
    this.type = options.type ?? MetricType.Custom;
  }

  readonly type: MetricType | string;
}
