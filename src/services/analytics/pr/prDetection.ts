import type { AnalyticsDataPoint } from '@/types/storage';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { getMetricDirection, isBetterValue } from './directionOfBetter';

export interface PRMetricStatus {
  metricKey: string;
  metricLabel?: string;
  unit?: string;
  currentValue: number;
  previousBest?: number;
  isPR: boolean;
  improvement?: number;
  totalAttempts: number;
}

export interface PRDetectionOptions {
  factsStore?: {
    getAnalyticsByContentId: (blockContentId: string) => Promise<AnalyticsDataPoint[]>;
  };
}

export async function detectPRsForWorkoutResult(
  blockContentId: string,
  targetResultId: string,
  options?: PRDetectionOptions,
): Promise<PRMetricStatus[]> {
  const store = options?.factsStore ?? indexedDBService;
  const facts = await store.getAnalyticsByContentId(blockContentId);

  // Group facts by metric key
  const factsByMetric = new Map<string, AnalyticsDataPoint[]>();
  for (const fact of facts) {
    const key = fact.metricKey ?? fact.type;
    if (!key) continue;
    const existing = factsByMetric.get(key) ?? [];
    existing.push(fact);
    factsByMetric.set(key, existing);
  }

  const results: PRMetricStatus[] = [];

  for (const [metricKey, metricFacts] of factsByMetric.entries()) {
    // Sort facts chronologically by timestamp
    const sorted = [...metricFacts].sort((a, b) => a.timestamp - b.timestamp);
    const targetIndex = sorted.findIndex((f) => f.resultId === targetResultId);
    if (targetIndex === -1) continue;

    const targetFact = sorted[targetIndex];
    const currentValue = targetFact.value;
    if (typeof currentValue !== 'number') continue;

    // Prior attempts before this result (chronologically)
    const priorAttempts = sorted.slice(0, targetIndex);
    const direction = getMetricDirection(metricKey);

    let previousBest: number | undefined = undefined;

    if (priorAttempts.length > 0) {
      const priorValues = priorAttempts
        .map((f) => f.value)
        .filter((v): v is number => typeof v === 'number');

      if (priorValues.length > 0) {
        previousBest = direction === 'lower' ? Math.min(...priorValues) : Math.max(...priorValues);
      }
    }

    const isPR =
      previousBest === undefined
        ? true
        : isBetterValue(metricKey, currentValue, previousBest);

    const improvement = previousBest !== undefined ? currentValue - previousBest : undefined;

    results.push({
      metricKey,
      metricLabel: targetFact.label ?? targetFact.metricLabel ?? metricKey,
      unit: targetFact.unit ?? targetFact.metricUnit,
      currentValue,
      previousBest,
      isPR,
      improvement,
      totalAttempts: sorted.length,
    });
  }

  return results;
}
