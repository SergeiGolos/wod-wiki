import { type IMetric, MetricType } from '@/core/models/Metric';
import { formatDurationSmart } from '@/lib/formatTime';
import type { MetricPresentationSurface } from './types';

/** Metric types whose numeric value represents milliseconds. */
const TIME_LIKE_TYPES = new Set<string>([
  MetricType.Duration,
  MetricType.Time,
  MetricType.Elapsed,
  MetricType.Total,
]);

export function isTimeLikeMetric(type: MetricType | string): boolean {
  return TIME_LIKE_TYPES.has(type as string);
}

/** Convert an IMetric value/image pair to a usable base string. */
function baseText(metric: IMetric): string {
  if (metric.image) return metric.image;
  if (metric.value === undefined || metric.value === null) return metric.type;
  if (typeof metric.value === 'object') {
    const v = metric.value as Record<string, unknown>;
    if ('text' in v) return String(v.text);
    if ('current' in v) return `Round ${v.current}`;
    return JSON.stringify(metric.value);
  }
  return String(metric.value);
}

/**
 * Compute the display label for a metric on a given surface.
 * All per-type formatting rules live here — nowhere else.
 */
export function computeLabel(metric: IMetric, _surface: MetricPresentationSurface): string {
  // Time-based: format ms value with smart HH:MM or MM:SS
  if (isTimeLikeMetric(metric.type) && typeof metric.value === 'number') {
    return formatDurationSmart(metric.value);
  }

  const base = baseText(metric);

  // Rounds: append "Round" / "Rounds" suffix when base is a bare number (UX-03)
  if (metric.type === MetricType.Rounds || (metric.type as string) === 'rounds') {
    const trimmed = base.trim();
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      return `${base} ${n === 1 ? 'Round' : 'Rounds'}`;
    }
  }

  return base;
}

/**
 * Build a tooltip string for a metric — identical to the existing buildTooltip
 * in MetricPill so callers can migrate without losing fidelity.
 */
export function buildTooltip(metric: IMetric): string {
  const parts: string[] = [];
  parts.push(`Type: ${metric.type}`);
  if (metric.value !== undefined) parts.push(`Value: ${metric.value}`);
  if (metric.origin) parts.push(`Origin: ${metric.origin}`);
  if (metric.sourceBlockKey) parts.push(`Block: ${metric.sourceBlockKey}`);
  if (metric.timestamp) parts.push(`Time: ${metric.timestamp.toISOString()}`);
  return parts.join('\n');
}

/**
 * Canonical column labels for the review grid.
 * Replaces METRIC_LABELS in GridHeader.tsx.
 */
const COLUMN_LABEL_MAP: Partial<Record<string, string>> = {
  duration:        'Duration',
  rep:             'Reps',
  effort:          'Effort',
  distance:        'Distance',
  rounds:          'Rounds',
  resistance:      'Resistance',
  action:          'Action',
  increment:       'Increment',
  metric:          'Metric',
  label:           'Label',
  text:            'Text',
  'current-round': 'Current Round',
  volume:          'Volume',
  intensity:       'Intensity',
  load:            'Load',
  work:            'Work',
  lap:             'Lap',
  group:           'Group',
  time:            'Time',
  elapsed:         'Elapsed',
  total:           'Total',
  'system-time':   'System Time',
  spans:           'Spans',
  system:          'System',
};

export function computeColumnLabel(type: MetricType | string): string {
  const key = (type as string).toLowerCase();
  return COLUMN_LABEL_MAP[key] ?? (key.charAt(0).toUpperCase() + key.slice(1));
}
