/**
 * Wellness calc pipeline test — capture → store rollup → WQL, over IN-MEMORY
 * stores (runStoreRollup + QueryService are both injectable). Unlike the
 * real-store integration, this is deterministic and immune to the shared
 * process-global fake-indexeddb across sibling integration files.
 *
 * Defends the contract the dashboards rely on: user-captured wellness facts
 * (soreness/sleep/hrv/weight/hang/hr/planned) become `calc.*` rollup rows
 * the query engine serves.
 */
import { describe, expect, it } from 'bun:test';
import type { AnalyticsDataPoint } from '@/types/storage';
import { QueryService, type FactQueryStore } from '@/services/analytics/query';
import { DAY, dayBucket, runStoreRollup, type StoreRollupStore } from '@/services/analytics/rollup';
import { wellnessFactsForNote } from '@/services/analytics/wellness';

const T0 = Date.parse('2026-08-09T12:00:00Z');
const ROLLUP_NOW = Date.parse('2026-08-13T12:00:00Z'); // 4 days later
const dayOf = (ms: number) => Math.floor(ms / DAY);

function makeStores() {
  const rows = new Map<string, AnalyticsDataPoint>();
  const rollup: StoreRollupStore = {
    getFactsByMetric: async (m) => [...rows.values()].filter((r) => r.metricKey === m),
    saveAnalyticsPoints: async (pts) => { for (const p of pts) rows.set(p.id, p); },
    deleteAnalyticsPoints: async (ids) => { for (const id of ids) rows.delete(id); },
  };
  const query: FactQueryStore = {
    getFactsByMetric: (m) => rollup.getFactsByMetric(m),
    getFactsByTimeRange: async (s, e) => [...rows.values()].filter((r) => r.timestamp >= s && r.timestamp <= e),
    getNoteTagLabels: async () => [],
  };
  return { rows, rollup, query };
}

function seedWellness(store: StoreRollupStore, noteId: string, entries: string, targetDay: number): Promise<void> {
  const facts = wellnessFactsForNote(noteId, `# M\n\n\`\`\`wellness\n${entries}\n\`\`\`\n`, { targetDate: targetDay * DAY, now: T0 });
  const rekeyed = facts.map((f) => ({ ...f, id: `${f.id}:d${targetDay}`, timestamp: targetDay * DAY + 12 * 3_600_000 }));
  return store.saveAnalyticsPoints(rekeyed);
}

async function scalar(query: FactQueryStore, wql: string): Promise<number | undefined> {
  const result = await new QueryService(query).runQuery(wql, {
    rangeStart: dayOf(ROLLUP_NOW - 5 * DAY) * DAY,
    rangeEnd: ROLLUP_NOW + DAY,
  });
  return result.scalar ?? result.series[0]?.points.at(-1)?.value;
}

describe('wellness calc pipeline (capture → rollup → WQL)', () => {
  it('publishes calc.soreness / calc.sleep / calc.hrv from captured wellness facts', async () => {
    const { rollup, query } = makeStores();
    await seedWellness(rollup, 'note-1', 'soreness: 7\nsleep: 7.5h\nhrv: 62', dayOf(ROLLUP_NOW) - 1);
    await seedWellness(rollup, 'note-1', 'soreness: 4\nsleep: 8h\nhrv: 70', dayOf(ROLLUP_NOW));

    await runStoreRollup(rollup, { now: ROLLUP_NOW });

    expect(await scalar(query, `avg:calc.soreness{}`)).toBeCloseTo(5.5); // (7+4)/2
    expect(await scalar(query, `last:calc.sleep{}`)).toBeCloseTo(8);
    expect(await scalar(query, `last:calc.hrv{}`)).toBeCloseTo(70);
  });

  it('emits no zero-filled calc.soreness rows for unchecked days', async () => {
    const { rows, rollup, query } = makeStores();
    await seedWellness(rollup, 'note-1', 'soreness: 6', dayOf(ROLLUP_NOW));
    await runStoreRollup(rollup, { now: ROLLUP_NOW });
    const soreness = rows.size === 0 ? [] : (await rollup.getFactsByMetric('calc.soreness'));
    expect(soreness.length).toBe(1);
    expect(soreness[0].value).toBe(6);
    expect(await scalar(query, `last:calc.soreness{}`)).toBe(6);
  });

  it('derives calc.readiness from the captured series', async () => {
    const { rollup, query } = makeStores();
    // soreness 4 → 24pts; sleep 8 → 30pts; hrv 70 → 70/90*30 ≈ 23.3 → ≈77.3
    await seedWellness(rollup, 'note-1', 'soreness: 4\nsleep: 8h\nhrv: 70', dayOf(ROLLUP_NOW));
    await runStoreRollup(rollup, { now: ROLLUP_NOW });
    const readiness = await scalar(query, `last:calc.readiness{}`);
    expect(readiness).toBeGreaterThan(70);
    expect(readiness).toBeLessThan(85);
  });

  it('derives calc.mvcBw (%BW) and calc.adherence from captured + workout facts', async () => {
    const { rollup, query } = makeStores();
    await seedWellness(rollup, 'note-1', 'weight: 80\nhang: 28', dayOf(ROLLUP_NOW));
    await seedWellness(rollup, 'note-2', 'planned: 1', dayOf(ROLLUP_NOW));
    await rollup.saveAnalyticsPoints([{
      id: 'session-1', noteId: 'note-2', grain: 'summary', segmentId: 's', segmentVersion: 1,
      resultId: 'session-1', origin: 'journal', type: 'sessionLoad', metricKey: 'sessionLoad',
      value: 100, unit: 'AU', label: 'Session Load',
      timestamp: dayOf(ROLLUP_NOW) * DAY + 12 * 3_600_000, createdAt: ROLLUP_NOW,
    }]);

    await runStoreRollup(rollup, { now: ROLLUP_NOW });

    expect(await scalar(query, `last:calc.mvcBw{}`)).toBeCloseTo(35); // 28/80*100
    expect(await scalar(query, `last:calc.adherence{}`)).toBeCloseTo(1); // 1 session / 1 planned
  });

  it('derives calc.ef using running-scoped distance and captured HR', async () => {
    const { rollup, query } = makeStores();
    await seedWellness(rollup, 'note-1', 'hr: 150', dayOf(ROLLUP_NOW));
    // 5km in 1500s = 3.33 m/s; distance facts carry discipline: running.
    await rollup.saveAnalyticsPoints([{
      id: 'dist', noteId: 'note-2', grain: 'summary', segmentId: 's', segmentVersion: 1,
      resultId: 'dist', origin: 'journal', type: 'totalDistance', metricKey: 'totalDistance',
      value: 5000, unit: 'm', label: 'Total Distance', discipline: 'running',
      timestamp: dayOf(ROLLUP_NOW) * DAY + 12 * 3_600_000, createdAt: ROLLUP_NOW,
    }, {
      id: 'elapsed', noteId: 'note-2', grain: 'summary', segmentId: 's', segmentVersion: 1,
      resultId: 'elapsed', origin: 'journal', type: 'elapsed', metricKey: 'elapsed',
      value: 1500_000, unit: 'ms', label: 'Elapsed', discipline: 'running',
      timestamp: dayOf(ROLLUP_NOW) * DAY + 12 * 3_600_000, createdAt: ROLLUP_NOW,
    }]);

    await runStoreRollup(rollup, { now: ROLLUP_NOW });

    const ef = await scalar(query, `last:calc.ef{}`);
    // pace = 5000m / 1500000ms; m/s = 5000/(1500000/1000) = 3.333 m/s.
    // ef = pace / hr * 100000 = 3.333/150*100000 ≈ 2222
    expect(ef).toBeCloseTo(3.3333 / 150 * 100000, -2);
  });
});
