/**
 * wellness capture tests — the ```wellness fence is the input surface for
 * the proposed wellness metrics (calc.soreness et al. land as calc.* seeds
 * over these raw facts). Defends the observable contracts:
 *
 * 1. A wellness block parses `key: value [unit]` lines into entries.
 * 2. Facts are day-grained, user-origin, keyed by the raw metric key, and
 *    id-addressed per note+key (re-save upserts, removal deletes).
 * 3. captureWellnessFacts reconciles: writes new/changed rows only, deletes
 *    rows for keys the block no longer carries.
 */
import { describe, expect, it } from 'bun:test';
import {
  captureWellnessFacts,
  extractWellnessEntries,
  parseWellnessContent,
  wellnessFactsForNote,
  type WellnessFactStore,
} from './wellness';
import type { AnalyticsDataPoint } from '@/types/storage';
import { DAY } from './rollup/workloadRollup';

const T0 = Date.parse('2026-08-09T12:00:00Z');

function makeStore(): WellnessFactStore & { rows: Map<string, AnalyticsDataPoint> } {
  const rows = new Map<string, AnalyticsDataPoint>();
  return {
    rows,
    async saveAnalyticsPoints(points) {
      for (const p of points) rows.set(p.id, p);
    },
    async deleteAnalyticsPoints(ids) {
      for (const id of ids) rows.delete(id);
    },
    async getFactsByMetric(metricKey) {
      return [...rows.values()].filter((r) => r.metricKey === metricKey);
    },
  };
}

describe('parseWellnessContent', () => {
  it('parses key: value lines with optional units', () => {
    const entries = parseWellnessContent('soreness: 7\nsleep: 7.5h\nhrv: 62\nweight: 81kg\nhang: 30kg\nhr: 148bpm\nplanned: 1');
    expect(entries.map((e) => `${e.key}=${e.value}${e.unit}`)).toEqual([
      'soreness=7rating',
      'sleep=7.5h',
      'hrv=62ms',
      'weight=81kg',
      'hang=30kg',
      'hr=148bpm',
      'planned=1count',
    ]);
  });

  it('ignores unknown keys, garbage lines, and out-of-range values', () => {
    const entries = parseWellnessContent('notes: felt great\nsoreness: 42\nsoreness: 3\n## comment\nsleep: zzz');
    expect(entries).toEqual([{ key: 'soreness', value: 3, unit: 'rating', label: 'Soreness' }]);
  });
});

describe('extractWellnessEntries', () => {
  it('pulls entries out of fenced blocks and keeps the last value per key', () => {
    const doc = '# Morning\n\n```wellness\nsoreness: 6\nsleep: 7\n```\n\n```time\n5s\n```\n\n```wellness\nsoreness: 5\n```\n';
    const entries = extractWellnessEntries(doc);
    expect(entries.map((e) => `${e.key}=${e.value}`)).toEqual(['soreness=5', 'sleep=7']);
  });
});

describe('captureWellnessFacts', () => {
  it('writes day-grained user facts with deterministic per-note ids', async () => {
    const store = makeStore();
    const targetDate = Date.parse('2026-08-09T00:00:00Z');
    const out = await captureWellnessFacts('note-1', '```wellness\nsoreness: 7\nsleep: 8h\n```', store, { targetDate, now: T0 });
    expect(out.written).toBe(2);

    const soreness = store.rows.get('wellness:note-1:soreness')!;
    expect(soreness).toMatchObject({
      noteId: 'note-1',
      metricKey: 'soreness',
      value: 7,
      origin: 'user',
      grain: 'summary',
    });
    // Day-grained: timestamp is the day bucket of the note's target date.
    expect(soreness.timestamp).toBe(Math.floor(targetDate / DAY) * DAY);
  });

  it('upserts changed values in place and deletes removed keys', async () => {
    const store = makeStore();
    const targetDate = Date.parse('2026-08-09T00:00:00Z');
    await captureWellnessFacts('note-1', '```wellness\nsoreness: 7\nsleep: 8h\n```', store, { targetDate, now: T0 });

    const out = await captureWellnessFacts('note-1', '```wellness\nsoreness: 4\n```', store, { targetDate, now: T0 });
    expect(out.written).toBe(1); // soreness changed
    expect(out.deleted).toBe(1); // sleep removed
    expect(store.rows.get('wellness:note-1:soreness')!.value).toBe(4);
    expect(store.rows.has('wellness:note-1:sleep')).toBe(false);
  });

  it('a note with no wellness block deletes its stale wellness rows', async () => {
    const store = makeStore();
    const targetDate = Date.parse('2026-08-09T00:00:00Z');
    await captureWellnessFacts('note-1', '```wellness\nsoreness: 7\n```', store, { targetDate, now: T0 });
    const out = await captureWellnessFacts('note-1', '# Just a note\n', store, { targetDate, now: T0 });
    expect(out.deleted).toBe(1);
    expect(store.rows.size).toBe(0);
  });

  it('never touches other notes\' wellness rows', async () => {
    const store = makeStore();
    const targetDate = Date.parse('2026-08-09T00:00:00Z');
    await captureWellnessFacts('note-a', '```wellness\nsoreness: 7\n```', store, { targetDate, now: T0 });
    await captureWellnessFacts('note-b', '```wellness\nsoreness: 3\n```', store, { targetDate, now: T0 });
    await captureWellnessFacts('note-a', '# cleared\n', store, { targetDate, now: T0 });
    expect(store.rows.get('wellness:note-b:soreness')!.value).toBe(3);
  });
});
