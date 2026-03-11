/**
 * MetricPill — Single metrics badge styled by type and origin.
 *
 * Renders a compact pill showing the metrics's display value,
 * color-coded by MetricType and visually distinguished when
 * the origin is 'user'.
 */

import React from 'react';
import { type IMetric, MetricType } from '@/core/models/Metric';
import { getMetricColorClasses } from '@/views/runtime/metricColorMap';
import { formatDurationSmart } from '@/lib/formatTime';

interface MetricPillProps {
  /** The metric to display */
  metric: IMetric;
}

/**
 * Render a single metrics as a pill/badge.
 * - Color is driven by `metricType` via `metricColorMap`.
 * - User-origin metric get a dashed border + italic text + `(u)` suffix.
 * - Tooltip shows full metadata on hover.
 */
export const MetricPill: React.FC<MetricPillProps> = ({ metric }) => {
  const colorClasses = getMetricColorClasses(metric.type);
  const isUser = metric.origin === 'user';
  const displayText = metricDisplayText(metric);

  const tooltip = buildTooltip(metric);

  return (
    <span
      className={[
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium border',
        colorClasses,
        isUser ? 'border-dashed italic ring-1 ring-offset-1 ring-primary/30' : '',
      ].join(' ')}
      title={tooltip}
    >
      {displayText}
      {isUser && (
        <span className="text-[10px] opacity-70 ml-0.5">(u)</span>
      )}
    </span>
  );
};

/**
 * Extract the display text from a metrics.
 */
function metricDisplayText(frag: IMetric): string {
  // Specialized formatting for time-based metric (values are in milliseconds)
  if (
    (frag.type === MetricType.Duration ||
      frag.type === MetricType.Time ||
      frag.type === MetricType.Elapsed ||
      frag.type === MetricType.Total) &&
    typeof frag.value === 'number'
  ) {
    return formatDurationSmart(frag.value);
  }

  if (frag.image) return frag.image;
  if (frag.value !== undefined && frag.value !== null) {
    if (typeof frag.value === 'object') {
      const val = frag.value as any;
      // Handle { text, role } objects common in Text metrics
      if ('text' in val) return val.text;
      // Handle { current, total? } objects common in CurrentRound metrics
      if ('current' in val) return `Round ${val.current}`;
      
      return JSON.stringify(frag.value);
    }
    return String(frag.value);
  }
  return frag.type;
}

/**
 * Build a tooltip string with metadata.
 */
function buildTooltip(frag: IMetric): string {
  const parts: string[] = [];
  parts.push(`Type: ${frag.type}`);
  if (frag.value !== undefined) parts.push(`Value: ${frag.value}`);
  if (frag.origin) parts.push(`Origin: ${frag.origin}`);
  if (frag.sourceBlockKey) parts.push(`Block: ${frag.sourceBlockKey}`);
  if (frag.timestamp) parts.push(`Time: ${frag.timestamp.toISOString()}`);
  if (frag.origin) parts.push(`Behavior: ${frag.origin}`);
  return parts.join('\n');
}
