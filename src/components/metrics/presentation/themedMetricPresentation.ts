import type { IMetric } from '@/core/models/Metric';
import { metricPresentation } from '@/core/metrics/presentation';
import type { MetricPresentationToken, MetricPresentationSurface } from '@/core/metrics/presentation';
import { getMetricColorClasses, getMetricIcon } from '@/views/runtime/metricColorMap';

export interface ThemedMetricPresentationToken extends MetricPresentationToken {
  /** Tailwind color classes for badge background, border, and text */
  readonly colorClasses: string;
  /** Emoji icon, or null if this metric type has no icon */
  readonly icon: string | null;
  /** Extra Tailwind classes for user-entered origin affordance */
  readonly originClasses: string;
}

/**
 * Decorate a framework-agnostic token with Tailwind color classes and icons.
 * Keeps React/Tailwind knowledge out of the core policy module.
 */
export function themeToken(token: MetricPresentationToken): ThemedMetricPresentationToken {
  const valueStr = token.metric.image ?? String(token.metric.value ?? '');
  return {
    ...token,
    colorClasses: getMetricColorClasses(token.metric.type as string, valueStr),
    icon: getMetricIcon(token.metric.type as string, valueStr),
    originClasses: token.userEntered
      ? 'border-dashed italic ring-1 ring-offset-1 ring-primary/30'
      : '',
  };
}

/**
 * Present a group of metrics on the given surface, returning themed tokens
 * ready for React rendering.
 */
export function presentThemedGroup(
  metrics: readonly IMetric[],
  surface: MetricPresentationSurface,
): ThemedMetricPresentationToken[] {
  return metricPresentation.presentGroup(metrics, surface).map(themeToken);
}
