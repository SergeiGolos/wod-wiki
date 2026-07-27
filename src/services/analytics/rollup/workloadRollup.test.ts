/**
 * workloadRollup unit tests — every expectation is hand-computed from the
 * Foster window definitions in workloadRollup.ts (issue #736 acceptance:
 * rollup values must match hand-computed values over fixtures).
 */
import { describe, expect, it } from 'bun:test';

import {
  computeWorkloadRollups,
  dailySessionLoads,
  dayBucket,
  DAY,
} from './workloadRollup';

/** Build a load map from {day: load} entries. */
function loads(entries: Record<number, number>): Map<number, number> {
  return new Map(Object.entries(entries).map(([d, v]) => [Number(d), v]));
}

describe('dayBucket', () => {
  it('buckets by UTC day', () => {
    expect(dayBucket(0)).toBe(0);
    expect(dayBucket(DAY - 1)).toBe(0);
    expect(dayBucket(DAY)).toBe(1);
    expect(dayBucket(1_700_000_000_000)).toBe(Math.floor(1_700_000_000_000 / DAY));
  });
});

describe('dailySessionLoads', () => {
  it('sums facts into UTC day buckets', () => {
    const map = dailySessionLoads([
      { timestamp: 10, value: 100 },
      { timestamp: DAY + 5, value: 50 },
      { timestamp: DAY + 60_000, value: 70 },
      { timestamp: 3 * DAY, value: 200 },
    ]);
    expect(map.get(0)).toBe(100);
    expect(map.get(1)).toBe(120);
    expect(map.get(3)).toBe(200);
    expect(map.size).toBe(3);
  });
});

describe('computeWorkloadRollups', () => {
  it('returns nothing when there is no load', () => {
    expect(computeWorkloadRollups(new Map(), 40)).toEqual([]);
  });

  it('flat training: ACWR settles to 1, monotony/strain suppressed (zero variance)', () => {
    // 100 AU every day for 35 days — the flat-week case where sd7 = 0.
    const entries: Record<number, number> = {};
    for (let d = 0; d < 35; d++) entries[d] = 100;
    const rollups = computeWorkloadRollups(loads(entries), 34);

    expect(rollups).toHaveLength(35);
    // Days 0..5 have zero-padded 7-day windows → variance > 0 → monotony
    // emitted. From day 6 on the 7-day window is uniformly 100 → sd7 = 0 →
    // monotony/strain suppressed (the flat-week case).
    for (const r of rollups) {
      if (r.day < 6) {
        expect(r.monotony).toBeDefined();
      } else {
        expect(r.monotony).toBeUndefined();
        expect(r.strain).toBeUndefined();
      }
    }
    // Full windows: acute = 700/7 = 100, chronic = 2800/28 = 100 → ACWR 1.
    const settled = rollups.find((r) => r.day === 34)!;
    expect(settled.acwr).toBeCloseTo(1, 10);
    // Day 0 cold start: window holds only [100] → sum7 = sum28 = 100,
    // ACWR = (100/7) / (100/28) = 4.
    const cold = rollups.find((r) => r.day === 0)!;
    expect(cold.acwr).toBeCloseTo(4, 10);
  });

  it('single training week: hand-computed ACWR, monotony, strain', () => {
    // Loads [100, 0, 200, 0, 300, 0, 100] on days 0..6 (Σ 700, mean 100).
    const rollups = computeWorkloadRollups(
      loads({ 0: 100, 2: 200, 4: 300, 6: 100 }),
      6,
    );
    expect(rollups.map((r) => r.day)).toEqual([0, 1, 2, 3, 4, 5, 6]);

    const day6 = rollups[6];
    // acute = 700/7 = 100; chronic = 700/28 = 25 → ACWR 4.
    expect(day6.acwr).toBeCloseTo(4, 10);
    // diffs from mean 100 → [0,-100,100,0,200,0,0]; Σsq = 80000 (the three
    // rest days contribute (0-100)² each); var = 80000/7; sd ≈ 106.90450.
    expect(day6.monotony).toBeCloseTo(100 / Math.sqrt(80000 / 7), 10);
    expect(day6.monotony!).toBeCloseTo(0.93541, 4);
    // strain = monotony × 700.
    expect(day6.strain).toBeCloseTo((100 / Math.sqrt(80000 / 7)) * 700, 8);

    const day0 = rollups[0];
    // Window covers only day 0: sum7 = sum28 = 100 → ACWR (100/7)/(100/28) = 4.
    expect(day0.acwr).toBeCloseTo(4, 10);
    // 7-window values [0,0,0,0,0,0,100]: mean 100/7; Σsq = 60000/7…
    // = 6·(100/7)² + (600/7)² = 8571.428…; var = 8571.428…/7; sd ≈ 34.99285.
    const sd0 = Math.sqrt((6 * (100 / 7) ** 2 + (600 / 7) ** 2) / 7);
    expect(day0.monotony).toBeCloseTo((100 / 7) / sd0, 10);
    expect(day0.strain).toBeCloseTo(((100 / 7) / sd0) * 100, 8);
  });

  it('detraining decay: windows keep emitting while the chronic window has load, ACWR → 0', () => {
    // One 500 AU day, then silence. throughDay = 28 (day 28's 28-window is
    // days 1..28 — empty — so the last emitting day is 27).
    const rollups = computeWorkloadRollups(loads({ 0: 500 }), 28);
    expect(rollups.map((r) => r.day)).toEqual(
      Array.from({ length: 28 }, (_, i) => i),
    );

    const day27 = rollups[27];
    // chronic = 500/28 > 0, acute = 0 → ACWR exactly 0 (emitted, not suppressed).
    expect(day27.acwr).toBe(0);
    // Flat zero week → sd7 = 0 → monotony/strain suppressed.
    expect(day27.monotony).toBeUndefined();
    expect(day27.strain).toBeUndefined();
  });

  it('ignores load days beyond throughDay', () => {
    const rollups = computeWorkloadRollups(loads({ 10: 100 }), 5);
    expect(rollups).toEqual([]);
  });
});
