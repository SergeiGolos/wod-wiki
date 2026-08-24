/**
 * Wellness event pipeline test — capture → unified event store → WQL.
 *
 * Ticket 005 deletes the eager store rollup; calc.* derivations are now
 * read-time responsibilities of the engine. This test defends the contract
 * the dashboards still rely on: user-captured wellness rows become queryable
 * raw metric keys (soreness, sleep, hrv, weight, hang, hr, planned) through
 * the engine's QueryService over the unified event store.
 */
import { describe, expect, it } from 'bun:test';
import { QueryService, inMemoryEventStore } from '@bitcobblers/wod-wiki-engine';
import type { UnifiedEventRecord } from '@/types/storage';
import { DAY } from '@/services/analytics/rollup';
import { wellnessEventsForNote } from '@/services/analytics/wellness';

const T0 = Date.parse('2026-08-09T12:00:00Z');
const ROLLUP_NOW = Date.parse('2026-08-13T12:00:00Z'); // 4 days later
const dayOf = (ms: number) => Math.floor(ms / DAY);

function seedWellness(noteId: string, entries: string, targetDay: number): UnifiedEventRecord[] {
  return wellnessEventsForNote(
    noteId,
    `# M\n\n\`\`\`wellness\n${entries}\n\`\`\`\n`,
    { targetDate: targetDay * DAY, now: T0 },
  );
}

function makeQueryService(events: UnifiedEventRecord[]) {
  const eventStore = inMemoryEventStore(events);
  return new QueryService(eventStore);
}

async function scalar(query: QueryService, wql: string): Promise<number | undefined> {
  const result = await query.runQuery(wql, {
    rangeStart: dayOf(ROLLUP_NOW - 5 * DAY) * DAY,
    rangeEnd: ROLLUP_NOW + DAY,
  });
  return result.scalar ?? (() => { const p = result.series[0]?.points; return p?.length ? p[p.length - 1]?.value : undefined; })();
}

describe('wellness event pipeline (capture → inMemoryEventStore → WQL)', () => {
  it('resolves avg:soreness and last:sleep from captured wellness events', async () => {
    const events = [
      ...seedWellness('note-1', 'soreness: 7\nsleep: 7.5h', dayOf(ROLLUP_NOW) - 1),
      ...seedWellness('note-1', 'soreness: 3\nsleep: 8h', dayOf(ROLLUP_NOW)),
    ];
    const query = makeQueryService(events);

    expect(await scalar(query, 'avg:soreness{}')).toBeCloseTo(5);
    expect(await scalar(query, 'last:sleep{}')).toBeCloseTo(8);
  });

  it('resolves hrv and weight from captured wellness events', async () => {
    const events = seedWellness('note-1', 'hrv: 62\nweight: 80kg', dayOf(ROLLUP_NOW));
    const query = makeQueryService(events);

    expect(await scalar(query, 'last:hrv{}')).toBeCloseTo(62);
    expect(await scalar(query, 'last:weight{}')).toBeCloseTo(80);
  });

  it('resolves hang and hr from captured wellness events', async () => {
    const events = seedWellness('note-1', 'hang: 28kg\nhr: 150bpm', dayOf(ROLLUP_NOW));
    const query = makeQueryService(events);

    expect(await scalar(query, 'last:hang{}')).toBeCloseTo(28);
    expect(await scalar(query, 'last:hr{}')).toBeCloseTo(150);
  });

  it('resolves planned sessions from captured wellness events', async () => {
    const events = seedWellness('note-1', 'planned: 2', dayOf(ROLLUP_NOW));
    const query = makeQueryService(events);

    expect(await scalar(query, 'last:planned{}')).toBeCloseTo(2);
  });

  it('keeps rows for two notes independent', async () => {
    const events = [
      ...seedWellness('note-1', 'soreness: 8', dayOf(ROLLUP_NOW)),
      ...seedWellness('note-2', 'soreness: 4', dayOf(ROLLUP_NOW)),
    ];
    const query = makeQueryService(events);

    expect(await scalar(query, 'avg:soreness{}')).toBeCloseTo(6);
  });
});
