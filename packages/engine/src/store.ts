/**
 * In-memory UnifiedEventStore — the state-free store seam for QueryService,
 * the CLI query runner, and the Storybook workbench.
 *
 * One adapter over an in-memory row list:
 *  - inMemoryEventStore:  the UnifiedEventStore contract (ticket 003)
 */
import type { EventRecord } from '@bitcobblers/wod-wiki-core';
import type { EventStore } from '@bitcobblers/wod-wiki-wql';

export function inMemoryEventStore(events: readonly EventRecord[]): EventStore {
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
      // Ticket 005: only engine-authored summaries are finalize-owned;
      // user-authored summaries (origin 'user', e.g. wellness) are
      // reconcile-owned and must survive a result finalize.
      for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i];
        if (row.resultId === resultId && row.grain === 'summary' && row.origin !== 'user') rows.splice(i, 1);
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
