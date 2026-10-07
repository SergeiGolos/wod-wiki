import { describe, expect, it } from 'vitest';
import { QueryService } from '../src/QueryService';
import { captureContext } from '../src/calendar';
import type { EventRecord } from '@bitcobblers/wod-wiki-core';
import type { EventStore } from '../src/stores';

/**
 * Ticket 12/14 complete-fetch regression: an aggregate window spanning more
 * than 400 civil days must reach date-only observations whose METRIC date is
 * inside the window but whose fetch-hint timestamp is not. The by-metric-date
 * candidate union must enumerate EVERY covered civil date — no 400-date cap,
 * no skipped dates at DST boundaries — so a wellness row recorded months
 * after the fact is never silently dropped from a long-range query.
 */

const WINDOW_START = Date.parse('2023-01-01T00:00:00Z');
// 518 civil days — deliberately beyond the legacy 400-date enumeration cap.
const WINDOW_END = Date.parse('2024-06-01T00:00:00Z');

// Instant-anchored observation: fetch-hint timestamp inside the window.
// Ticket 14 provenance: a directly recorded summary is stamped 'direct' —
// coverage selection (ticket 16) otherwise ranks it a substitutable summary
// and the wellness detail would win the shared (resultId, metric) population.
const timed: EventRecord = {
  id: 'r1:0',
  resultId: 'r1',
  noteId: 'n1',
  timestamp: Date.parse('2023-03-10T12:00:00Z'),
  grain: 'summary',
  outputType: 'analytics',
  representationKind: 'direct',
  metrics: [{ type: 'tis', value: 30, metadata: { canonicalKey: 'tis' } }],
};

// Date-only observation: recorded civil date 2024-04-20 (in window), but the
// row's fetch-hint timestamp sits BEFORE the window (back-filled entry) —
// only the by-metric-date candidates can reach it.
const dateOnly: EventRecord = {
  id: 'wellness:n1:tis',
  resultId: 'r1',
  noteId: 'n1',
  timestamp: Date.parse('2022-12-01T12:00:00Z'),
  grain: 'summary',
  outputType: 'wellness',
  metrics: [{ type: 'tis', value: 12, metadata: { canonicalKey: 'tis' } }],
  metricTemporal: [{ temporalKind: 'civil-date', civilDate: '2024-04-20' }],
  metricDateKeys: ['d:2024-04-20'],
};

function makeEventStore(): EventStore {
  return {
    getEventsByTimeRange: async (start, end) =>
      [timed, dateOnly].filter((r) => r.timestamp >= start && r.timestamp < end),
    getEventsByMetricDates: async (dates) => {
      const wanted = new Set(dates);
      return [timed, dateOnly].filter((r) =>
        r.metricTemporal?.some((t) => t.temporalKind === 'civil-date' && t.civilDate !== undefined && wanted.has(t.civilDate)),
      );
    },
    getEventsByResult: async () => [],
    getEventsForNote: async () => [],
    getEventsByContent: async () => [],
    scanAll: async () => [timed, dateOnly],
    appendEvents: async () => {},
    finalizeSummaries: async () => {},
    deleteEvents: async () => {},
  };
}

describe('complete fetch — windows longer than 400 civil days', () => {
  it('reaches date-only observations whose metric date lies beyond the legacy 400-date cap', async () => {
    const service = new QueryService({ eventStore: makeEventStore() });
    // UTC and a DST-observing zone: enumeration must stay complete across
    // spring-forward/fall-back boundaries inside the 518-day window.
    for (const timeZone of ['UTC', 'America/New_York']) {
      const res = await service.runQuery(':sum{metric:tis}', {
        rangeStart: WINDOW_START,
        rangeEnd: WINDOW_END,
        context: captureContext(WINDOW_START, timeZone),
      });
      expect(res.error).toBeUndefined();
      // Both observations survive: the instant-anchored 30 and the
      // date-only 12 whose timestamp anchor is outside the window.
      expect(res.matched.length).toBe(2);
      expect(res.scalar).toBe(42);
    }
  });
});
