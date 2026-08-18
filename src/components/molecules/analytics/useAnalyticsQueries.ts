import { useEffect, useState } from 'react';
import { queryService, type QueryResult } from '@/services/analytics/query';
import { ensureStoreRollupFacts } from '@/services/analytics/rollup';

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
  refreshKey = 0,
  preferredUnit?: string,
  executor?: { runQuery(query: string, options?: any): Promise<QueryResult> },
): AnalyticsQueriesState {
  const [results, setResults] = useState<Record<string, QueryResult>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const now = Date.now();
      const rangeStart = now - weeks * WEEK;
      // Lazy rollup driver (CONTEXT.md 'Rollup Fact'): warm ACWR/monotony/
      // strain windows on every open, but block only queries that consume
      // rollup facts — other widgets never wait on the recompute, and a
      // driver failure never blocks the widgets (facts are disposable).
      const rollupReady = ensureStoreRollupFacts().catch(() => undefined);
      const consumesRollups = queries.some((q) => q.query.includes('calc.'));
      try {
        if (consumesRollups) await rollupReady;
        const activeExecutor = executor ?? queryService;
        const settled = await Promise.all(
          queries.map(async (q) => [q.key, await activeExecutor.runQuery(q.query, { rangeStart, rangeEnd: now, preferredUnit })] as const),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [queries, weeks, refreshKey, preferredUnit, executor]);

  return { results, loading };
}
