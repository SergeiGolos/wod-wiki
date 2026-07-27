import { useEffect, useState } from 'react';
import { useQueryState } from 'nuqs';
import { WqlQueryComposer } from '@/components/organisms/analytics/WqlQueryComposer';
import { queryService, type QueryResult } from '@/services/analytics/query';
import { ensureRollupFacts } from '@/services/analytics/rollup';
import {
  QueryValue,
  useAnalyticsRange,
  useChartShape,
  WidgetFrame,
  WqlBars,
  WqlEmptyState,
  WqlTimeseries,
} from '@/components/molecules/analytics';
import {
  ExplorerSidebar,
  ParsedQueryChips,
  PipelineAnatomy,
  RawPointsTable,
} from '@/components/organisms/analytics';
import {
  EXAMPLE_QUERIES,
  setMetricInQuery,
} from '@/utils/analytics/explorerQueries';
import { useExplorerVocabulary } from '@/utils/analytics/useExplorerVocabulary';
import { cn } from '@/lib/utils';

const EFFORT_NAMES = () =>
  [
    'thruster',
    'pull-up',
    'back-squat',
    'rowing',
    'double-under',
    'burpee',
    'snatch',
    'clean-and-jerk',
    'wall-ball',
    'box-jump',
  ] as const;

const DAY = 86_400_000;

export function AnalyticsExplorerPage() {
  const [q, setQ] = useQueryState('q', { defaultValue: '' });
  const [weeks, setWeeks] = useAnalyticsRange();
  const activeWeeks = weeks ?? 16;
  const [draft, setDraft] = useState(q);
  const [result, setResult] = useState<QueryResult | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const vocabulary = useExplorerVocabulary();

  useEffect(() => {
    setDraft(q);
  }, [q]);

  // Lazy rollup driver (CONTEXT.md 'Rollup Fact'): analytics-surface open
  // recomputes missing/stale ACWR/monotony/strain windows; no scheduler.
  useEffect(() => {
    void ensureRollupFacts().catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!q) {
      setResult(undefined);
      setLoading(false);
      return;
    }

    const now = Date.now();
    const rangeStart = now - activeWeeks * 7 * DAY;

    setLoading(true);
    // Warm the rollup windows on every query; await only when the query
    // itself consumes rollup facts (calc.*).
    const rollupReady = ensureRollupFacts().catch(() => undefined);
    (q.includes('calc.') ? rollupReady : Promise.resolve())
      .then(() => queryService.runQuery(q, { rangeStart, rangeEnd: now }))
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch(() => {
        if (!cancelled) setResult(undefined);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q, activeWeeks]);

  const shape = useChartShape(result);

  const submit = (value: string) => {
    setQ(value);
  };

  const exampleQuestion = EXAMPLE_QUERIES.find((e) => e.query === q)?.question ?? 'custom query';
  const firstUnit = result?.matched[0]?.unit;

  return (
    <div className="h-full flex flex-col min-h-0 p-4 overflow-y-auto">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">Metric Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Run WQL queries against your workout analytics store and inspect the pipeline anatomy.
        </p>
      </header>

      <div className="flex gap-4 min-h-0">
        <ExplorerSidebar
          metricKeys={vocabulary.metricKeys}
          tagKeys={vocabulary.tagKeys}
          query={draft}
          onSelectMetric={(metric) => submit(setMetricInQuery(draft, metric))}
        />

        <section className="flex-1 min-w-0">
          <WqlQueryComposer
            value={draft}
            onChange={setDraft}
            onSubmit={submit}
            mode="dual"
            effortNames={EFFORT_NAMES}
            className="mb-3"
          />
          <div className="bg-card border border-border rounded-lg p-3">

            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {EXAMPLE_QUERIES.map((ex) => (
                <button
                  key={ex.query}
                  onClick={() => submit(ex.query)}
                  title={ex.question}
                  className={cn(
                    'text-[11px] rounded-full border px-2.5 py-1 transition-colors',
                    q === ex.query
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground',
                  )}
                >
                  {ex.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-muted-foreground">Range:</span>
              {[4, 8, 16].map((w) => (
                <button
                  key={w}
                  onClick={() => setWeeks(w)}
                  className={cn(
                    'text-[11px] rounded border px-2 py-0.5 transition-colors',
                    activeWeeks === w
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  Past {w} weeks
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 mt-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              Anatomy of the query
            </div>
            {q ? (
              <>
                <ParsedQueryChips parsed={result?.parsed ?? { raw: q, agg: 'sum', metric: '', filters: [], groupBy: [] }} />
                {result && <PipelineAnatomy result={result} />}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Submit a query to see its anatomy.</div>
            )}
          </div>

          <div className="mt-3">
            <WidgetFrame title="Query result" question={exampleQuestion} query={q || '(empty)'}>
              <div className="h-64">
                {!q ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Enter a WQL query or choose an example to explore your data.
                  </div>
                ) : loading ? (
                  <WqlEmptyState result={undefined} />
                ) : shape.kind === 'error' ? (
                  <div className="h-full flex items-center justify-center text-sm text-destructive font-mono px-4 text-center">
                    {shape.message}
                  </div>
                ) : shape.kind === 'empty' ? (
                  <WqlEmptyState result={result} />
                ) : shape.kind === 'scalar' ? (
                  <QueryValue result={result!} unit={firstUnit ?? ''} label={`${result!.parsed.agg}(${result!.parsed.metric})`} />
                ) : shape.kind === 'timeseries' ? (
                  <WqlTimeseries result={result!} unit={firstUnit} />
                ) : (
                  <WqlBars result={result!} unit={firstUnit} />
                )}
              </div>
            </WidgetFrame>
          </div>

          {result && <RawPointsTable matched={result.matched} unit={firstUnit} />}
        </section>
      </div>
    </div>
  );
}
