import { IRealtimeProcessor } from './IRealtimeProcessor';
import { IOutputStatement } from '../models/OutputStatement';
import { MetricType, MetricOrigin } from '../models/Metric';
import type { IEffortResolver, IEffort, ResolvedEffort } from '@/effort-registry/types';
import { EFFORT_DATA_METRIC_TYPE } from './effortResolution';

/**
 * Two-Pass Effort Resolution — Realtime Processor
 *
 * Pass 1 (compile-time recovery):
 *   Output statements that carry an effort metric with `origin: 'compiler'`
 *   are treated as already-canonical. The processor looks them up by
 *   slug/alias and attaches the full {@link IEffort} record.
 *
 * Pass 2 (analytics-time fuzzy recovery):
 *   Output statements with free-form effort or action text get resolved
 *   through fuzzy alias matching. A successful match attaches the effort
 *   with `origin: 'analyzed'`; a synthetic fallback attaches it with
 *   `origin: 'analyzed-estimated'`.
 *
 * The resolved effort is stored as a metric of type `'effort-data'` so
 * downstream summary processors can consume it without importing the
 * registry directly.
 *
 * @see ADR-0008 Decision 6, Decision 7
 * @see PRD-EFFORT-REGISTRY FR5
 */
export class TwoPassEffortResolutionProcess implements IRealtimeProcessor {
  public readonly id = 'two-pass-effort-resolution';
  public readonly fenceTypes = ['wod', 'log', 'plan'] as const;

  constructor(private readonly resolver: IEffortResolver) {}

  process(output: IOutputStatement): IOutputStatement {
    const effortMetric = output.getMetric(MetricType.Effort);
    const actionMetric = output.getMetric(MetricType.Action);

    let label: string | undefined;
    let passOrigin: MetricOrigin = 'analyzed';

    // Prefer explicit Effort metric, fall back to Action metric
    if (effortMetric && typeof effortMetric.value === 'string') {
      label = effortMetric.value;
      passOrigin = effortMetric.origin === 'compiler' ? 'compiler' : 'analyzed';
    } else if (actionMetric && typeof actionMetric.value === 'string') {
      label = actionMetric.value;
      passOrigin = 'analyzed';
    }

    if (!label) return output;

    const { resolved, finalOrigin } = this.resolve(label, passOrigin);

    const effortDataMetric = {
      type: EFFORT_DATA_METRIC_TYPE,
      image: resolved.label,
      value: resolved,
      origin: finalOrigin,
      timestamp: new Date(),
    };

    // Insert effort-data right after the triggering effort/action metric
    // so downstream processors see it before elapsed metrics.
    const original = output.metrics.toArray();
    const reordered: typeof original = [];
    let inserted = false;
    for (const m of original) {
      reordered.push(m);
      if (!inserted && (m.type === MetricType.Effort || m.type === MetricType.Action)) {
        reordered.push(effortDataMetric);
        inserted = true;
      }
    }
    if (!inserted) reordered.push(effortDataMetric);

    output.metrics.clear();
    for (const m of reordered) {
      output.metrics.add(m);
    }

    return output;
  }

  private resolve(
    label: string,
    passOrigin: MetricOrigin,
  ): { resolved: ResolvedEffort; finalOrigin: MetricOrigin } {
    let effort: IEffort | null;

    if (passOrigin === 'compiler') {
      // Pass 1: compiler-resolved — try exact slug/alias first
      effort = this.resolver.resolveBySlug(label) ?? this.resolver.resolveByAlias(label);
      if (effort) {
        return { resolved: this.resolver.resolveDefinition(effort), finalOrigin: 'compiler' };
      }
      // Compiler claimed it but we can't find it — fall through to fuzzy
    }

    // Pass 2: fuzzy recovery (always returns an effort, never null)
    const resolved = this.resolver.resolveEffort(label);

    const finalOrigin: MetricOrigin = resolved.isEstimated ? 'analyzed-estimated' : 'analyzed';

    return { resolved, finalOrigin };
  }
}
