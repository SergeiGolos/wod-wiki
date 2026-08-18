import { useEffect, useState } from 'react';
import type { QueryResult } from '@bitcobblers/wod-wiki-engine';
import type { QueryExecutor } from '../contracts/query';

const DAY = 86_400_000;
const WEEK = 7 * DAY;

export interface AnalyticsQueryDef {
  key: string;
  query: string;
}

export interface AnalyticsQueriesState {
  results: Record<string, QueryResult>;
  loading: boolean;
}

export function useAnalyticsQueries(
  queries: AnalyticsQueryDef[],
  weeks: number,
  executor?: QueryExecutor,
  refreshKey = 0,
  preferredUnit?: string,
  onEnsureRollupFacts?: () => Promise<void>,
): AnalyticsQueriesState {
  const [results, setResults] = useState<Record<string, QueryResult>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!executor) {
        if (!cancelled) setLoading(false);
        return;
      }

      const now = Date.now();
      const rangeStart = now - weeks * WEEK;
      const consumesRollups = queries.some((q) => q.query.includes('calc.'));
      try {
        if (consumesRollups && onEnsureRollupFacts) {
          await onEnsureRollupFacts().catch(() => undefined);
        }
        const settled = await Promise.all(
          queries.map(async (q) => [
            q.key,
            await executor.runQuery(q.query, { rangeStart, rangeEnd: now, preferredUnit }),
          ] as const),
        );
        if (!cancelled) setResults(Object.fromEntries(settled));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [queries, weeks, executor, refreshKey, preferredUnit, onEnsureRollupFacts]);

  return { results, loading };
}
