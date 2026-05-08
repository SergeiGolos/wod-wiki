/**
 * MetricPill — Single metrics badge styled by type and origin.
 *
 * Renders a compact pill showing the metrics's display value,
 * color-coded by MetricType and visually distinguished when
 * the origin is 'user'.
 */

import React, { useMemo } from 'react';
import { type IMetric } from '@/core/models/Metric';
import { metricPresentation } from '@/core/metrics/presentation';
import { themeToken } from '@/components/metrics/presentation';

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
  const token = useMemo(
    () => themeToken(metricPresentation.present(metric, 'review-grid-cell')),
    [metric],
  );

  return (
    <span
      className={[
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium border',
        token.colorClasses,
        token.originClasses,
      ].join(' ')}
      title={token.tooltip}
    >
      {token.label}
      {token.userEntered && (
        <span className="text-[10px] opacity-70 ml-0.5">(u)</span>
      )}
    </span>
  );
};
