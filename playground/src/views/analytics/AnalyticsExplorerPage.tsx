import { useEffect, useMemo, useState } from 'react';
import { useQueryState } from 'nuqs';
import { WqlQueryComposer } from '@/components/organisms/analytics/WqlQueryComposer';
import { parseQuery, isFindQuery, queryService, type QueryResult, type FindQueryResult } from '@/services/analytics/query';
import { ensureRollupFacts } from '@/services/analytics/rollup';
import {
  QueryValue,
  useAnalyticsRange,
  useChartShape,
  WidgetFrame,
  WqlBars,
  WqlEmptyState,
  WqlTimeseries,
  AnalyticsUnitPreference,
  useAnalyticsUnitPreference,
  getEffectiveAnalyticsUnit,
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
import { SampleDataPrompt } from './SampleDataPrompt';
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
  const { unit: preferredUnit } = useAnalyticsUnitPreference();
  const { unit: effectiveUnit, forced: unitForced } = useMemo(
    () => getEffectiveAnalyticsUnit(q, preferredUnit),
    [q, preferredUnit],
  );
  const activeWeeks = weeks ?? 16;
  const [draft, setDraft] = useState(q);
  const [result, setResult] = useState<QueryResult | undefined>(undefined);
  const [findResult, setFindResult] = useState<FindQueryResult | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const vocabulary = useExplorerVocabulary();
  const liveParsed = useMemo(() => parseQuery(draft), [draft]);

  const [refreshKey, setRefreshKey] = useState(0);

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
      setFindResult(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    const parsed = parseQuery(q);

    if (isFindQuery(parsed)) {
      // Content query — fetch notes via runFind
      queryService.runFind(parsed)
        .then((r) => { if (!cancelled) setFindResult(r); })
        .catch(() => { if (!cancelled) setFindResult(undefined); })
        .finally(() => { if (!cancelled) setLoading(false); });
    } else {
      // Analytics query — existing chart pipeline
      setFindResult(undefined);
      const now = Date.now();
      const rangeStart = now - activeWeeks * 7 * DAY;
      const rollupReady = ensureRollupFacts().catch(() => undefined);
      (q.includes('calc.') ? rollupReady : Promise.resolve())
        .then(() => queryService.runQuery(q, { rangeStart, rangeEnd: now, preferredUnit }))
        .then((r) => { if (!cancelled) setResult(r); })
        .catch(() => { if (!cancelled) setResult(undefined); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }

    return () => {
      cancelled = true;
    };
  }, [q, activeWeeks, refreshKey, preferredUnit]);

  const shape = useChartShape(result);

  const submit = (value: string) => {
    setQ(value);
  };

  const exampleQuestion = EXAMPLE_QUERIES.find((e) => e.query === q)?.question ?? 'custom query';

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
              <span className="text-xs text-muted-foreground ml-4">Units:</span>
              <AnalyticsUnitPreference unit={unitForced ? effectiveUnit : undefined} forced={unitForced} />
            </div>
          </div>

          {isFindQuery(liveParsed) ? (
            /* ── Find query result: note list ── */
            <div className="mt-3 space-y-3">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  Find {liveParsed.target}
                  {liveParsed.scope && <span className="ml-1">in {liveParsed.scope}</span>}
                  {liveParsed.last && <span className="ml-1">last {liveParsed.last.size}{liveParsed.last.unit}</span>}
                </div>
                {liveParsed.error ? (
                  <div className="text-sm text-destructive font-mono">{liveParsed.error}</div>
                ) : loading ? (
                  <div className="text-sm text-muted-foreground">Searching…</div>
                ) : findResult && (findResult.notes.length > 0 || findResult.blocks.length > 0) ? (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground mb-1">
                      {findResult.stages.matched} of {findResult.stages.selected} {liveParsed.target}s matched
                    </div>
                    {findResult.blocks.length > 0 ? (
                      findResult.blocks.map((block) => (
                        <div key={block.id} className="border border-border rounded-md p-2.5 hover:bg-muted/50 transition-colors">
                          <div className="font-medium text-sm text-foreground">{block.noteTitle || block.noteId}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                            <span className="rounded bg-muted px-1.5 py-0.5">{block.dataType}</span>
                            {block.blockContentId && <span className="font-mono text-[10px]">{block.blockContentId}</span>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{block.rawContent}</div>
                        </div>
                      ))
                    ) : (
                      findResult.notes.map((note) => (
                        <div key={note.id} className="border border-border rounded-md p-2.5 hover:bg-muted/50 transition-colors">
                          <div className="font-medium text-sm text-foreground">{note.title}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                            <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                            {note.type && <span className="rounded bg-muted px-1.5 py-0.5">{note.type}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No {liveParsed.target}s found.</div>
                )}
              </div>
            </div>
          ) : (
            /* ── Analytics query result: anatomy + chart ── */
            <>
              <div className="bg-card border border-border rounded-lg p-4 mt-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  Anatomy of the query
                </div>
                {q ? (
                  <>
                    <ParsedQueryChips parsed={result && result.parsed.raw === draft ? result.parsed : liveParsed} />
                    {result && result.parsed.raw === draft && <PipelineAnatomy result={result} />}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Submit a query to see its anatomy.</div>
                )}
              </div>

              <div className="mt-3">
                <SampleDataPrompt layout="banner" refreshKey={refreshKey} onChanged={() => setRefreshKey((k) => k + 1)} />
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
                      <SampleDataPrompt result={result} refreshKey={refreshKey} onChanged={() => setRefreshKey(k => k + 1)} />
                    ) : shape.kind === 'scalar' ? (
                      <QueryValue result={result!} label={`${result!.parsed.agg}(${result!.parsed.metric})`} />
                    ) : shape.kind === 'timeseries' ? (
                      <WqlTimeseries result={result!} />
                    ) : (
                      <WqlBars result={result!} />
                    )}
                  </div>
                </WidgetFrame>
              </div>

              {result && <RawPointsTable matched={result.matched} displayUnit={result.unit} />}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
