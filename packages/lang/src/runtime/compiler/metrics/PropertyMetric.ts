import {
  normalizeFieldPath,
  valueKindOf,
  type FieldRef,
} from '@bitcobblers/wod-wiki-core';
import { IMetric, MetricOrigin, MetricType } from '@bitcobblers/wod-wiki-core';

export interface PropertyMetricOptions {
  readonly type?: MetricType | string;
  readonly origin?: MetricOrigin;
  readonly image?: string;
  /** Physical dimension of a numeric variant, when already resolved by the
   *  caller through the unit registry. Omitted → dimensionless/unknown. */
  readonly dimension?: string;
}

function formatPropertyValue(value: string | number | boolean | null): string {
  if (value === null) return 'null';
  return String(value);
}

/**
 * Parser-authored custom property: `hrv: 48`, `Sleep Score: 85`.
 *
 * Carries its key into metric metadata as a typed field reference
 * (`fieldRef`: normalized path + value kind, ticket 11) so custom properties
 * survive projection under their own identity instead of collapsing into a
 * pooled `custom` key. The original spelling rides along as provenance
 * (`originalKey`); identity never depends on it.
 */
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
    const kind = valueKindOf(value);
    this.metadata = {
      originalKey: key,
      ...(kind !== 'object' && kind !== 'undefined'
        ? {
            fieldRef: {
              path: normalizeFieldPath(key),
              kind,
              ...(options.dimension ? { dimension: options.dimension } : {}),
            } satisfies FieldRef,
          }
        : {}),
    };
  }

  readonly type: MetricType | string;
  readonly metadata: Record<string, unknown>;
}
