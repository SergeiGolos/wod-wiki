import { IMetric, MetricOrigin, MetricType } from '../models/Metric';
import { MetricContainer } from '../models/MetricContainer';

/**
 * Hint helpers — semantic markers expressed as metrics.
 *
 * A "hint" is a dot-namespaced string (e.g. `workout.amrap`,
 * `behavior.required_timer`) that dialects and the parser attach to a statement
 * so that compiler strategies and the label composer can make decisions. Hints
 * used to live in a parallel `Set<string>` channel on the statement; they now
 * flow through the single metric channel as {@link MetricType.Hint} metrics.
 *
 * Hint metrics are deliberately excluded from display resolution
 * (see ownership `legacyAdapters`) and from runtime block fragments
 * (see `BlockBuilder.setFragments`), so they never surface as visible metrics.
 */

/** A read surface that exposes metrics, via `rawMetrics` or a `metrics` field. */
interface MetricBearing {
  rawMetrics?: IMetric[];
  metrics?: MetricContainer | IMetric[];
}

/** Resolve a flat metric list from any metric-bearing source. */
function metricsOf(source: MetricBearing | undefined): IMetric[] {
  if (!source) return [];
  if (Array.isArray(source.rawMetrics)) return source.rawMetrics;
  const m = source.metrics;
  if (!m) return [];
  if (Array.isArray(m)) return m;
  // MetricContainer exposes a rawMetrics getter.
  return m.rawMetrics ?? [];
}

/** Create a single hint metric. */
export function hintMetric(hint: string, origin: MetricOrigin = 'dialect'): IMetric {
  return { type: MetricType.Hint, value: hint, image: hint, origin };
}

/**
 * Build (or extend) a {@link MetricContainer} of hint metrics from a list of
 * hint strings. Duplicate hint strings are collapsed.
 */
export function hintsToContainer(
  hints: readonly string[],
  existing?: MetricContainer,
  origin: MetricOrigin = 'dialect',
): MetricContainer {
  const container = existing ?? MetricContainer.empty('dialect');
  const seen = new Set(getHints(container));
  for (const hint of hints) {
    if (seen.has(hint)) continue;
    seen.add(hint);
    container.add(hintMetric(hint, origin));
  }
  return container;
}

/** All hint strings carried by a metric-bearing source. */
export function getHints(source: MetricBearing | undefined): string[] {
  return metricsOf(source)
    .filter(m => m.type === MetricType.Hint && typeof m.value === 'string')
    .map(m => m.value as string);
}

/** Whether a metric-bearing source carries a given hint. */
export function hasHint(source: MetricBearing | undefined, hint: string): boolean {
  return metricsOf(source).some(m => m.type === MetricType.Hint && m.value === hint);
}
