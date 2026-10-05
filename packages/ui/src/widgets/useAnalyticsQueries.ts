import { useEffect, useState } from 'react';
import { parseQuery, SharedQueryDocumentRunner, type QueryResult } from '@bitcobblers/wod-wiki-wql';
import type { QueryExecutor } from '../contracts/query';
import { createExecutorDocumentHost } from './DashboardView';
import { toChartResult } from './chartData';

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
      // Ticket 19 cutover: widget queries evaluate through the shared
      // document runner — family dispatch (aggregate/find/rows/pipeline),
      // AST-driven rollup-ensure, and one captured context per query run.
      const host = createExecutorDocumentHost(executor, {
        rangeStart,
        rangeEnd: now,
        preferredUnit,
        rollupEnsure: onEnsureRollupFacts,
      });
      const runner = new SharedQueryDocumentRunner(host);
      try {
        const settled = await Promise.all(
          queries.map(async (q) => {
            const res = await runner.run(q.query);
            const out = res.outputs[0];
            const error = out?.error ?? res.diagnostics[0];
            // The chart input keeps the raw query's own parse so consumers
            // reading `parsed.family`/`raw` see the authored family.
            const result = toChartResult({
              parsed: parseQuery(q.query),
              series: out?.series,
              unit: out?.unit,
              error,
              table: out?.table,
            }) as QueryResult & { notes?: unknown[]; blocks?: unknown[]; efforts?: unknown[]; runs?: unknown[] };
            if (out?.notes) result.notes = out.notes;
            if (out?.blocks) result.blocks = out.blocks;
            if (out?.efforts) result.efforts = out.efforts;
            if (out?.runs) result.runs = out.runs;
            return [q.key, result] as const;
          }),
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
