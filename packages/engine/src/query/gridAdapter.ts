/**
 * Query-result → GridRow adapter.
 *
 * Flattens a QueryResult's series into ReviewGrid-shaped rows so CDL tables
 * render query results through the same column machinery as runtime output:
 * one row per series point, the aggregated value carried as a Metric cell,
 * fixed fields (absoluteStartTime, sourceBlockKey) readable via CDL
 * fixed-field / fallback sources.
 */

import { MetricContainer } from '../core/models/MetricContainer';
import { MetricType } from '../core/models/Metric';
import type { QueryResult } from './QueryService';

export interface GridRow {
  id: number;
  index: number;
  sourceBlockKey: string;
  outputType: string;
  stackLevel: number;
  absoluteStartTime: number;
  spans: unknown[];
  elapsed: number;
  total: number;
  cells: Map<MetricType, { metrics: MetricContainer; hasUserOverride: boolean }>;
}
export function queryResultToGridRows(result: QueryResult): GridRow[] {
  let id = 0;
  const rows: GridRow[] = [];
  for (const series of result.series) {
    for (const point of series.points) {
      id += 1;
      const metrics = new MetricContainer([{
        type: MetricType.Metric,
        image: `${point.value}`,
        value: point.value,
        origin: 'analyzed',
        timestamp: new Date(point.ts),
      }], `wql-${series.key}`);
      rows.push({
        id,
        index: id,
        sourceBlockKey: series.key,
        outputType: 'analytics',
        stackLevel: 0,
        absoluteStartTime: point.ts,
        spans: [],
        elapsed: 0,
        total: 0,
        cells: new Map([[MetricType.Metric, { metrics, hasUserOverride: false }]]),
      });
    }
  }
  return rows;
}
