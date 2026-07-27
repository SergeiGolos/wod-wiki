/**
 * workloadRollup — pure workload-window math behind Rollup Facts
 * (CONTEXT.md §Analytics). Foster sRPE periodization over daily SessionLoad:
 *
 *   dailyLoad[d] = Σ sessionLoad fact values in UTC day d
 *   acute        = mean daily load over the trailing 7 days  (D-6 … D)
 *   chronic      = mean daily load over the trailing 28 days (D-27 … D)
 *   ACWR         = acute / chronic            — emitted when chronic > 0
 *   monotony     = mean7 / sd7                — population SD (÷7) over the 7
 *                  daily values; emitted when sd7 > 0 (a flat week has no
 *                  meaningful monotony)
 *   strain       = monotony × (Σ of the 7 daily loads) — emitted with monotony
 *
 * Day buckets are UTC (`Math.floor(ts / DAY)`) — the same bucketing the
 * Query Service uses for the `day` dimension, so rollup rows land in the
 * buckets widgets already group by.
 */

export const DAY = 86_400_000;

/** Local day bucket for a canonical timestamp. */
export function dayBucket(ts: number): number {
  const d = new Date(ts);
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY);
}

/** The three Rollup Fact metric definitions (Canonical Metric Keys are `calc.<target>`). */
export const ROLLUP_METRICS = {
  acwr: { metricKey: 'calc.acwr', label: 'Acute:Chronic Workload Ratio', unit: 'ratio' },
  monotony: { metricKey: 'calc.monotony', label: 'Training Monotony', unit: 'ratio' },
  strain: { metricKey: 'calc.strain', label: 'Training Strain', unit: 'AU' },
} as const;

export type RollupMetricTarget = keyof typeof ROLLUP_METRICS;

/** One UTC day's computed windows; absent fields were suppressed (see header). */
export interface DayRollup {
  day: number;
  acwr?: number;
  monotony?: number;
  strain?: number;
}

/** Sum fact values into UTC day buckets. */
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
 * the first day with load through `throughDay` (inclusive, UTC day bucket).
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
