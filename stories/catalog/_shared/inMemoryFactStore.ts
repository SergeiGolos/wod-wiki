/**
 * In-memory FactQueryStore over a golden IR fixture — the state-free store
 * seam for the Language Workbench story (#959 prototype).
 *
 * Same contract as the production IndexedDB adapter (FactQueryStore), so a
 * fixture file feeds the QueryService exactly like the database does.
 */
import type { AnalyticsDataPoint } from '@/types/storage';
import type { FactQueryStore } from '@bitcobblers/wod-wiki-engine';

export function inMemoryFactStore(
  facts: readonly AnalyticsDataPoint[],
  noteTags: Readonly<Record<string, readonly string[]>> = {},
): FactQueryStore {
  return {
    getFactsByMetric: async (metricKey: string) =>
      facts.filter((f) => f.metricKey === metricKey),
    getFactsByTimeRange: async (start: number, end: number) =>
      facts.filter((f) => f.timestamp >= start && f.timestamp <= end),
    getNoteTagLabels: async (noteId: string) => [...(noteTags[noteId] ?? [])],
  };
}
