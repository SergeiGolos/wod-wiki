/**
 * In-memory FactQueryStore over a golden IR fixture — the state-free store
 * seam for QueryService and Storybook workbench.
 *
 * Implements FactQueryStore contract without database or browser dependencies.
 */
import type { AnalyticsDataPoint } from '@/types/storage';
import type { FactQueryStore } from '@/services/analytics/query';

export function inMemoryFactStore(
  facts: readonly AnalyticsDataPoint[],
  noteTags: Readonly<Record<string, readonly string[]>> = {},
): FactQueryStore {
  return {
    getFactsByMetric: async (metricKey: string) =>
      facts.filter((f) => f.metricKey === metricKey || f.type === metricKey),
    getFactsByTimeRange: async (start: number, end: number) =>
      facts.filter((f) => f.timestamp >= start && f.timestamp <= end),
    getNoteTagLabels: async (noteId: string) => [...(noteTags[noteId] ?? [])],
  };
}
