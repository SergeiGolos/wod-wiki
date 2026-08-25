/**
 * workloadRollup unit tests — every expectation is hand-computed from the
 * Foster window definitions in workloadRollup.ts (issue #736 acceptance:
 * rollup values must match hand-computed values over fixtures).
 *
 * Bucketing contract (WQL language train ticket 014): dayBucket returns a
 * civil-day ordinal of the LOCAL calendar date — the partitioning the Query
 * Service's `day` dimension groups by. Tests build fixtures from local Date
 * components (valid under any ambient timezone) and pin the contract with
 * dual-timezone and DST-boundary child-process probes.
 */
import { describe, expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';

import {
  computeWorkloadRollups,
  dailySessionLoads,
  dayBucket,
} from './workloadRollup';

/** Build a load map from {day: load} entries. */
function loads(entries: Record<number, number>): Map<number, number> {
  return new Map(Object.entries(entries).map(([d, v]) => [Number(d), v]));
}

describe('dayBucket', () => {
  it('keeps one local calendar day in exactly one bucket', () => {
    const firstStamp = new Date(2026, 5, 10, 0, 0).getTime();
    const lastStamp = new Date(2026, 5, 10, 23, 59, 59).getTime();
    expect(dayBucket(firstStamp)).toBe(dayBucket(lastStamp));

    const nextDayStamp = new Date(2026, 5, 11, 0, 1).getTime();
    expect(dayBucket(nextDayStamp)).not.toBe(dayBucket(lastStamp));
  });

  it('numbers consecutive local days consecutively across US DST transitions', () => {
    // US spring-forward weekend (Mar 8 2026) and fall-back (Nov 1 2026):
    // the 23h/25h days are Mar 8 and Nov 1 themselves.
    const beforeSpring = new Date(2026, 2, 8, 12).getTime();
    const afterSpring = new Date(2026, 2, 9, 12).getTime();
    expect(dayBucket(afterSpring)).toBe(dayBucket(beforeSpring) + 1);

    const beforeFall = new Date(2026, 10, 1, 12).getTime();
    const afterFall = new Date(2026, 10, 2, 12).getTime();
    expect(dayBucket(afterFall)).toBe(dayBucket(beforeFall) + 1);
  });

  it('keeps the 23-hour European spring-forward day distinct from its neighbour', () => {
    // Europe/London springs forward mid-day Mar 29 2026, so local midnight
    // of Mar 29 is 00:00Z but local midnight of Mar 30 is 23:00Z — both
    // inside UTC day N. A floor(localMidnight / DAY) implementation
    // collapses the two training days into one bucket; the civil ordinal
    // keeps them 1 apart. Child process pins TZ (bun caches ICU state).
    const modulePath = new URL('./workloadRollup.ts', import.meta.url).pathname;
    const probe = `
      const { dayBucket } = require(${JSON.stringify(modulePath)});
      console.log(dayBucket(Date.UTC(2026, 2, 27, 12)), dayBucket(Date.UTC(2026, 2, 29, 12)), dayBucket(Date.UTC(2026, 2, 30, 12)));
    `;
    const result = spawnSync(process.execPath, ['-e', probe], {
      encoding: 'utf8',
      env: { ...process.env, TZ: 'Europe/London' },
    });
    if (result.status !== 0) throw new Error(result.stderr);
    const [fri, transitionSunday, monday] = result.stdout.trim().split(/\s+/).map(Number);
    expect(monday - transitionSunday).toBe(1);
    expect(transitionSunday - fri).toBe(2);
  });

  it('collapses every hour of a spring-forward day into one bucket', () => {
    // Hours 02:xx do not exist locally on Mar 8 2026 (US) — Date
    // normalizes them forward but the calendar date is unchanged.
    const buckets = new Set<number>();
    for (let h = 0; h < 24; h++) {
      buckets.add(dayBucket(new Date(2026, 2, 8, h, 30).getTime()));
    }
    expect(buckets.size).toBe(1);
  });

  it('collapses every hour of a fall-back day into one bucket', () => {
    const buckets = new Set<number>();
    for (let h = 0; h < 24; h++) {
      buckets.add(dayBucket(new Date(2026, 10, 1, h, 30).getTime()));
    }
    expect(buckets.size).toBe(1);
  });

  it('keeps pre-midnight local time in the previous bucket even when UTC has rolled over', () => {
    // In New York, 2026-03-08T04:30Z is still Saturday 23:30 — it must
    // bucket with Saturday afternoon, not with Sunday. An epoch-day
    // implementation (Math.floor(ts / DAY)) buckets by the UTC date and
    // fails this under any timezone. Child processes pin TZ at startup —
    // bun caches ICU timezone state after the first Date in-process.
    const modulePath = new URL('./workloadRollup.ts', import.meta.url).pathname;
    const probe = (isoArgs: string): string => `
      const { dayBucket } = require(${JSON.stringify(modulePath)});
      console.log(dayBucket(Date.UTC(${isoArgs})));
    `;
    const bucketUnder = (tz: string, isoArgs: string): number => {
      const result = spawnSync(process.execPath, ['-e', probe(isoArgs)], {
        encoding: 'utf8',
        env: { ...process.env, TZ: tz },
      });
      if (result.status !== 0) throw new Error(result.stderr);
      return Number(result.stdout.trim());
    };

    const ny = (...utc: number[]) => bucketUnder('America/New_York', utc.join(','));
    const saturdayEvening = ny(2026, 2, 8, 4, 30); // 23:30 Sat local
    const saturdayAfternoon = ny(2026, 2, 7, 21, 0); // 16:00 Sat local
    const sundayMorning = ny(2026, 2, 8, 10, 0); // 06:00 Sun local (EDT)

    expect(saturdayEvening).toBe(saturdayAfternoon);
    expect(saturdayEvening).not.toBe(sundayMorning);

    // Same shape on the other side of the IDL: Tokyo Sunday 23:30 JST
    // (2026-03-08T14:30Z) stays out of Monday's bucket.
    const tokyo = (...utc: number[]) => bucketUnder('Asia/Tokyo', utc.join(','));
    expect(tokyo(2026, 2, 8, 14, 30)).toBe(tokyo(2026, 2, 8, 6, 0)); // Sun 23:30 vs 15:00 JST
    expect(tokyo(2026, 2, 8, 14, 30)).not.toBe(tokyo(2026, 2, 9, 1, 0)); // ...vs Mon 10:00 JST
  });
});

describe('dailySessionLoads', () => {
  it('sums facts into local training-day buckets', () => {
    const day = new Date(2026, 5, 10).getTime(); // June 10, local midnight
    const map = dailySessionLoads([
      { timestamp: day, value: 100 },
      { timestamp: day + 60_000, value: 70 },
      { timestamp: new Date(2026, 5, 11, 9).getTime(), value: 50 },
    ]);
    expect(map.size).toBe(2);
    expect(map.get(dayBucket(day))).toBe(170);
    expect(map.get(dayBucket(day) + 1)).toBe(50);
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
    // Days 0..5 have zero-padded 7-day windows -> variance > 0 -> monotony
    // emitted. From day 6 on the 7-day window is uniformly 100 -> sd7 = 0 ->
    // monotony/strain suppressed (the flat-week case).
    for (const r of rollups) {
      if (r.day < 6) {
        expect(r.monotony).toBeDefined();
      } else {
        expect(r.monotony).toBeUndefined();
        expect(r.strain).toBeUndefined();
      }
    }
    // Full windows: acute = 700/7 = 100, chronic = 2800/28 = 100 -> ACWR 1.
    const settled = rollups.find((r) => r.day === 34)!;
    expect(settled.acwr).toBeCloseTo(1, 10);
    // Day 0 cold start: window holds only [100] -> sum7 = sum28 = 100,
    // ACWR = (100/7) / (100/28) = 4.
    const cold = rollups.find((r) => r.day === 0)!;
    expect(cold.acwr).toBeCloseTo(4, 10);
  });

  it('single training week: hand-computed ACWR, monotony, strain', () => {
    // Loads [100, 0, 200, 0, 300, 0, 100] on days 0..6 (sum 700, mean 100).
    const rollups = computeWorkloadRollups(
      loads({ 0: 100, 2: 200, 4: 300, 6: 100 }),
      6,
    );
    expect(rollups.map((r) => r.day)).toEqual([0, 1, 2, 3, 4, 5, 6]);

    const day6 = rollups[6];
    // acute = 700/7 = 100; chronic = 700/28 = 25 -> ACWR 4.
    expect(day6.acwr).toBeCloseTo(4, 10);
    // diffs from mean 100 -> [0,-100,100,0,200,0,0]; sumsq = 80000 (the three
    // rest days contribute (0-100)^2 each); var = 80000/7; sd ~ 106.90450.
    expect(day6.monotony).toBeCloseTo(100 / Math.sqrt(80000 / 7), 10);
    expect(day6.monotony!).toBeCloseTo(0.93541, 4);
    // strain = monotony x 700.
    expect(day6.strain).toBeCloseTo((100 / Math.sqrt(80000 / 7)) * 700, 8);

    const day0 = rollups[0];
    // Window covers only day 0: sum7 = sum28 = 100 -> ACWR (100/7)/(100/28) = 4.
    expect(day0.acwr).toBeCloseTo(4, 10);
    // 7-window values [0,0,0,0,0,0,100]: mean 100/7; sumsq = 60000/7...
    // = 6*(100/7)^2 + (600/7)^2 = 8571.428...; var = 8571.428.../7; sd ~ 34.99285.
    const sd0 = Math.sqrt((6 * (100 / 7) ** 2 + (600 / 7) ** 2) / 7);
    expect(day0.monotony).toBeCloseTo((100 / 7) / sd0, 10);
    expect(day0.strain).toBeCloseTo(((100 / 7) / sd0) * 100, 8);
  });

  it('detraining decay: windows keep emitting while the chronic window has load, ACWR -> 0', () => {
    // One 500 AU day, then silence. throughDay = 28 (day 28's 28-window is
    // days 1..28 — empty — so the last emitting day is 27).
    const rollups = computeWorkloadRollups(loads({ 0: 500 }), 28);
    expect(rollups.map((r) => r.day)).toEqual(
      Array.from({ length: 28 }, (_, i) => i),
    );

    const day27 = rollups[27];
    // chronic = 500/28 > 0, acute = 0 -> ACWR exactly 0 (emitted, not suppressed).
    expect(day27.acwr).toBe(0);
    // Flat zero week -> sd7 = 0 -> monotony/strain suppressed.
    expect(day27.monotony).toBeUndefined();
    expect(day27.strain).toBeUndefined();
  });

  it('ignores load days beyond throughDay', () => {
    const rollups = computeWorkloadRollups(loads({ 10: 100 }), 5);
    expect(rollups).toEqual([]);
  });
});
