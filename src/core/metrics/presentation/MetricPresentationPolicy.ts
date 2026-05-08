import { type IMetric, MetricType } from '@/core/models/Metric';
import type {
  IMetricPresentationPolicy,
  MetricPresentationSurface,
  MetricPresentationToken,
  MetricRenderKind,
  MetricTone,
} from './types';
import { computeLabel, computeColumnLabel, buildTooltip } from './labelFormatting';

// ─── helpers ────────────────────────────────────────────────────────────────

function isRestMetric(metric: IMetric): boolean {
  const t = (metric.type as string).toLowerCase();
  if (t !== 'effort') return false;
  const v = (metric.value as string | undefined) ?? metric.image ?? '';
  return v.trim().toLowerCase() === 'rest';
}

function computeTone(metric: IMetric, rest: boolean): MetricTone {
  if (rest) return 'rest';
  const t = (metric.type as string).toLowerCase();
  const toneMap: Record<string, MetricTone> = {
    time: 'time', duration: 'time', elapsed: 'time', total: 'time', spans: 'time',
    rep: 'rep',
    effort: 'effort',
    distance: 'distance',
    rounds: 'rounds', increment: 'rounds', 'current-round': 'rounds',
    action: 'action',
    resistance: 'resistance',
    text: 'muted', label: 'muted', group: 'muted', lap: 'muted',
    system: 'system', 'system-time': 'system',
  };
  return toneMap[t] ?? 'unknown';
}

// ─── factory ────────────────────────────────────────────────────────────────

function createPolicy(): IMetricPresentationPolicy {
  const policy: IMetricPresentationPolicy = {

    isStructural(metric: IMetric): boolean {
      const t = metric.type as string;
      if (t === MetricType.Group || t === 'group') {
        const img = metric.image ?? '';
        return img === '+' || img === '-';
      }
      return t === MetricType.Lap || t === 'lap';
    },

    isHidden(metric: IMetric, surface: MetricPresentationSurface): boolean {
      if (this.isStructural(metric)) {
        return surface !== 'debug';
      }
      const t = metric.type as string;
      // Sound never shows in non-debug surfaces
      if ((t === MetricType.Sound || t === 'sound') && surface !== 'debug') return true;
      // review-grid-column suppresses combined time columns and system metrics
      if (surface === 'review-grid-column') {
        if (
          t === MetricType.Elapsed || t === 'elapsed' ||
          t === MetricType.Total   || t === 'total'
        ) return true;
        if (t === MetricType.System || t === 'system') return true;
      }
      return false;
    },

    present(metric: IMetric, surface: MetricPresentationSurface): MetricPresentationToken {
      const structural = this.isStructural(metric);
      const hidden = this.isHidden(metric, surface);
      const rest = isRestMetric(metric);
      const comment = (metric.type === MetricType.Text || metric.type === 'text')
        && metric.origin === 'parser';
      const userEntered = metric.origin === 'user';

      let renderKind: MetricRenderKind;
      if (hidden) {
        renderKind = 'hidden';
      } else if (comment) {
        renderKind = 'comment';
      } else if (
        surface === 'timer-subtitle' ||
        surface === 'history-label' ||
        surface === 'label-composer'
      ) {
        renderKind = 'plain-text';
      } else if (surface === 'review-grid-column') {
        renderKind = 'column-heading';
      } else {
        renderKind = 'badge';
      }

      return {
        metric,
        label: computeLabel(metric, surface),
        tooltip: buildTooltip(metric),
        renderKind,
        tone: computeTone(metric, rest),
        iconKey: rest ? 'rest' : (metric.type as string),
        visible: !hidden,
        structural,
        rest,
        comment,
        userEntered,
        columnLabel: computeColumnLabel(metric.type),
      };
    },

    presentGroup(
      metrics: readonly IMetric[],
      surface: MetricPresentationSurface,
    ): MetricPresentationToken[] {
      return metrics.map(m => this.present(m, surface));
    },

    columnLabel(type: MetricType | string): string {
      return computeColumnLabel(type);
    },
  };

  return policy;
}

/**
 * Singleton policy instance for app code.
 * Use `createMetricPresentationPolicy()` in tests for isolated instances.
 */
export const metricPresentation = createPolicy();

export { createPolicy as createMetricPresentationPolicy };
