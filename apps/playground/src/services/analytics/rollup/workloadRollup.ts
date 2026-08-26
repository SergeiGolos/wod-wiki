/**
 * workloadRollup — pure workload-window math behind Rollup Facts
 * (CONTEXT.md §Analytics). Foster sRPE periodization over daily SessionLoad:
 *
 *   dailyLoad[d] = Σ sessionLoad fact values on local training day d
 *   acute        = mean daily load over the trailing 7 days  (D-6 … D)
 *   chronic      = mean daily load over the trailing 28 days (D-27 … D)
 *   ACWR         = acute / chronic            — emitted when chronic > 0
 *   monotony     = mean7 / sd7                — population SD (÷7) over the 7
 *                  daily values; emitted when sd7 > 0 (a flat week has no
 *                  meaningful monotony)
 *   strain       = monotony × (Σ of the 7 daily loads) — emitted with monotony
 *
 * Day buckets are LOCAL training days — `dayBucket` returns a civil-day
 * ordinal of the timestamp's local calendar date (consecutive calendar days
 * differ by exactly 1 in every timezone, including 23h/25h DST days). That
 * is the partitioning the Query Service's `day` dimension groups by (local
 * date strings) and the journal itself uses: Foster windows run over the
 * athlete's training days, not UTC days.
 */

export const DAY = 86_400_000;

/** Civil-day ordinal of `ts`'s LOCAL calendar date — injective per civil date worldwide. */
export function dayBucket(ts: number): number {
  const d = new Date(ts);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
}

/** One local training day's computed windows; absent fields were suppressed (see header). */
export interface DayRollup {
  day: number;
  acwr?: number;
  monotony?: number;
  strain?: number;
}

/** Sum fact values into local training-day buckets. */
export function dailySessionLoads(
  facts: readonly { timestamp: number; value: number }[],
): Map<number, number> {
  const loads = new Map<number, number>();
  for (const fact of facts) {
    const day = dayBucket(fact.timestamp);
    loads.set(day, (loads.get(day) ?? 0) + fact.value);
  }
  return loads;
}

/**
 * Compute the Foster windows for every day that can produce a value: from
 * the first day with load through `throughDay` (inclusive, day-bucket ordinal).
 * Earlier days have empty chronic windows and zero-variance acute windows,
 * so every value would be suppressed anyway.
 */
export function computeWorkloadRollups(
  loads: ReadonlyMap<number, number>,
  throughDay: number,
): DayRollup[] {
  const loadDays = [...loads.keys()].filter((d) => d <= throughDay);
  if (loadDays.length === 0) return [];
  const firstDay = Math.min(...loadDays);
  const loadAt = (d: number) => loads.get(d) ?? 0;

  const rollups: DayRollup[] = [];
  for (let day = firstDay; day <= throughDay; day++) {
    let sum7 = 0;
    let sum28 = 0;
    for (let k = 0; k < 28; k++) {
      const load = loadAt(day - k);
      sum28 += load;
      if (k < 7) sum7 += load;
    }
    const acute = sum7 / 7;
    const chronic = sum28 / 28;

    let variance = 0;
    for (let k = 0; k < 7; k++) {
      const diff = loadAt(day - k) - acute;
      variance += diff * diff;
    }
    const sd7 = Math.sqrt(variance / 7);

    const rollup: DayRollup = { day };
    if (chronic > 0) rollup.acwr = acute / chronic;
    if (sd7 > 0) {
      rollup.monotony = acute / sd7;
      rollup.strain = rollup.monotony * sum7;
    }
    if (rollup.acwr !== undefined || rollup.monotony !== undefined) {
      rollups.push(rollup);
    }
  }
  return rollups;
}
