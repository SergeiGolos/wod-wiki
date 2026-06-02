/**
 * Test helpers for CDL interpreter tests
 */

import type { GridRow, GridCell } from '../types';
import { MetricType } from '@/core/models/Metric';
import { MetricContainer } from '@/core/models/MetricContainer';

export function makeGridCell(metrics: { type: MetricType; value: unknown; image?: string; origin?: string }[]): GridCell {
  let container = MetricContainer.empty(metrics[0]?.type ?? MetricType.Text);
  for (const m of metrics) {
    container = container.add({
      type: m.type,
      value: m.value,
      image: m.image,
      origin: m.origin as any ?? 'runtime',
    });
  }
  return {
    metrics: container,
    hasUserOverride: metrics.some((m) => m.origin === 'user'),
  };
}

export function makeGridRow(
  partial: Omit<Partial<GridRow>, 'cells'> & {
    cells?: ReadonlyArray<readonly [MetricType, GridCell]> | Map<MetricType, GridCell>;
  },
): GridRow {
  const cells = partial.cells instanceof Map
    ? new Map<MetricType, GridCell>(partial.cells)
    : new Map<MetricType, GridCell>(partial.cells ?? []);
  return {
    id: partial.id ?? 1,
    index: partial.index ?? 1,
    sourceBlockKey: partial.sourceBlockKey ?? 'test-block',
    outputType: partial.outputType ?? 'segment',
    stackLevel: partial.stackLevel ?? 0,
    absoluteStartTime: partial.absoluteStartTime,
    duration: partial.duration,
    elapsed: partial.elapsed ?? 0,
    total: partial.total ?? 0,
    spans: partial.spans ?? [],
    completionReason: partial.completionReason,
    cells,
  };
}
