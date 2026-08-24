/**
 * In-memory UnifiedEventStore — the state-free store seam for QueryService,
 * the CLI query runner, and the Storybook workbench.
 *
 * Two adapters over one in-memory row list:
 *  - factRowsToEventRows: legacy flat fact fixtures → summary event rows
 *  - inMemoryEventStore:  the UnifiedEventStore contract (ticket 003)
 */
import type { AnalyticsDataPoint, UnifiedEventRecord } from '@bitcobblers/wod-wiki-core';
import type { UnifiedEventStore } from '@bitcobblers/wod-wiki-wql';

/** Wrap legacy flat fact fixtures into summary event rows — the inverse of
 *  QueryService's projectEventToFacts, so golden fixtures keep working. */
export function factRowsToEventRows(facts: readonly AnalyticsDataPoint[]): UnifiedEventRecord[] {
  return facts.map((f, i) => {
    const metricKey = f.metricKey ?? f.type;
    return {
      id: `fact:${f.resultId}:${metricKey}:${i}`,
      resultId: f.resultId,
      noteId: f.noteId,
      blockContentId: f.blockContentId,
      pageId: f.pageId,
      origin: f.origin,
      timestamp: f.timestamp,
      grain: f.grain === 'event' ? 'event' : 'summary',
      outputType: 'analytics',
      effortSlug: f.effortSlug,
      metrics: [{
        type: metricKey,
        value: f.value,
        ...(f.unit ? { unit: f.unit } : {}),
        metadata: {
          canonicalKey: metricKey,
          ...(f.effortSlug ? { effortSlug: f.effortSlug } : {}),
          ...(f.discipline ? { effortDiscipline: f.discipline } : {}),
          ...(f.intensityTier ? { effortIntensityTier: f.intensityTier } : {}),
        },
      }],
      segmentId: f.segmentId,
      segmentVersion: f.segmentVersion,
    };
  });
}
export function inMemoryEventStore(events: readonly UnifiedEventRecord[]): UnifiedEventStore {
  const rows = [...events];
  return {
    getEventsByTimeRange: async (start: number, end: number) =>
      rows.filter((r) => r.timestamp >= start && r.timestamp <= end),
    getEventsByResult: async (resultId: string) =>
      rows.filter((r) => r.resultId === resultId),
    getEventsForNote: async (noteId: string) =>
      rows.filter((r) => r.noteId === noteId),
    getEventsByContent: async (blockContentId: string) =>
      rows.filter((r) => r.blockContentId === blockContentId),
    scanAll: async () => rows,
    appendEvents: async (appended) => { rows.push(...appended); },
    finalizeSummaries: async (resultId, finals) => {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].resultId === resultId && rows[i].grain === 'summary') rows.splice(i, 1);
      }
      rows.push(...finals);
    },
    deleteEvents: async (ids) => {
      const doomed = new Set(ids);
      for (let i = rows.length - 1; i >= 0; i--) {
        if (doomed.has(rows[i].id)) rows.splice(i, 1);
      }
    },
  };
}

/** Convenience: build the store directly from legacy flat fact fixtures.
 *  Note tags are a NoteQueryStore concern under the unified seam (ticket 003). */
export function inMemoryEventStoreFromFacts(facts: readonly AnalyticsDataPoint[]): UnifiedEventStore {
  return inMemoryEventStore(factRowsToEventRows(facts));
}
