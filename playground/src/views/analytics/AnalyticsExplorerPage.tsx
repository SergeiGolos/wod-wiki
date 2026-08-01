/**
 * AnalyticsExplorerPage (`/analytics/explorer`) — WQL workbench over the
 * analytics store, composed with the shared `WqlComposer` organism
 * (issue #839, decisions #828/#836). The legacy dual-mode `WqlQueryComposer`
 * is gone; clause state round-trips through `?q=` via `useExplorerQueryState`
 * (the router-native #833 pattern — no nuqs on this route), with a
 * run-on-submit split: the live draft drives `ParsedQueryChips`, while only
 * the submitted snapshot gates the run effect and `PipelineAnatomy`.
 *
 * Run dispatch is unchanged: find queries go through `queryService.runFind`,
 * analytics queries through `queryService.runQuery` with range/unit options
 * (plus the lazy rollup driver for calc.* metrics). The composer's `execute`
 * seam is diagnostics-strip stage counts only, exactly as on /library.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { parseQuery, isFindQuery, queryService, type QueryResult, type FindQueryResult } from '@/services/analytics/query';
import { ensureStoreRollupFacts } from '@/services/analytics/rollup';
import {
  QueryValue,
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
  WqlComposer,
  clausesToWql,
  setMetricClause,
  wqlToClauses,
  type WqlExecutor,
} from '@/components/organisms/wql-composer';
import { EXAMPLE_QUERIES } from '@/utils/analytics/explorerQueries';
import { useExplorerVocabulary } from '@/utils/analytics/useExplorerVocabulary';
import {
  useExplorerQueryState,
  defaultExplorerClauses,
  EXPLORER_RANGE_OPTIONS,
} from '../../hooks/useExplorerQueryState';
import { SampleDataPrompt } from './SampleDataPrompt';
import { cn } from '@/lib/utils';

const DAY = 86_400_000;

/** Canonical WQL comparison: composer-restorable strings compare through the
 * clause model (so a deep-linked `sum:totalVolume{}` matches the restored
 * `sum:totalVolume` draft); anything else falls back to raw equality. */
function sameQuery(a: string, b: string): boolean {
  if (a === b) return true;
  const ca = wqlToClauses(a);
  const cb = wqlToClauses(b);
  return ca !== null && cb !== null && clausesToWql(ca) === clausesToWql(cb);
}

export function AnalyticsExplorerPage() {
  const { clauses, setClauses, draft, submitted, submit, weeks: activeWeeks, setWeeks } =
    useExplorerQueryState();
  const { unit: preferredUnit } = useAnalyticsUnitPreference();
  const { unit: effectiveUnit, forced: unitForced } = useMemo(
    () => getEffectiveAnalyticsUnit(submitted, preferredUnit),
    [submitted, preferredUnit],
  );
  const [result, setResult] = useState<QueryResult | undefined>(undefined);
  const [findResult, setFindResult] = useState<FindQueryResult | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const vocabulary = useExplorerVocabulary();
  const liveParsed = useMemo(() => parseQuery(draft), [draft]);

  const [refreshKey, setRefreshKey] = useState(0);

  // Live stage counts in the composer's diagnostics strip — dispatch on query
  // kind (same seam as LibraryPage). Deliberately separate from the run effect
  // below: the strip executor carries no range/unit options.
  const diagnosticsExecutor = useCallback<WqlExecutor>(
    (ast) => (isFindQuery(ast) ? queryService.runFind(ast) : queryService.runQuery(ast.raw)),
    [],
  );

  // Lazy rollup driver (CONTEXT.md 'Rollup Fact'): analytics-surface open
  // recomputes missing/stale ACWR/monotony/strain windows; no scheduler.
  useEffect(() => {
    void ensureStoreRollupFacts().catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!submitted) {
      setResult(undefined);
      setFindResult(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    const parsed = parseQuery(submitted);

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
      const rollupReady = ensureStoreRollupFacts().catch(() => undefined);
      (submitted.includes('calc.') ? rollupReady : Promise.resolve())
        .then(() => queryService.runQuery(submitted, { rangeStart, rangeEnd: now, preferredUnit }))
        .then((r) => { if (!cancelled) setResult(r); })
        .catch(() => { if (!cancelled) setResult(undefined); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }

    return () => {
      cancelled = true;
    };
  }, [submitted, activeWeeks, refreshKey, preferredUnit]);

  const shape = useChartShape(result);

  /** Sidebar metric click: pivot to the metrics plane, set the metric clause, run. */
  const selectMetric = (metric: string) => {
    const next = setMetricClause(clauses, metric);
    setClauses(next);
    submit(clausesToWql(next));
  };

  /** Example chip: hydrate the composer from the query and run it. */
  const runExample = (wql: string) => {
    setClauses(wqlToClauses(wql) ?? defaultExplorerClauses());
    submit(wql);
  };

  const exampleQuestion = EXAMPLE_QUERIES.find((e) => e.query === submitted)?.question ?? 'custom query';

  // Post-run telemetry shows only while the result answers the current draft.
  // The second disjunct covers deep links the clause model cannot restore
  // (e.g. negated !tags:x filters — the legacy visual composer could emit
  // them): the composer falls back to defaults, but the result still answers
  // the submitted URL query until the user edits the draft.
  const restoredDraft = useMemo(
    () => clausesToWql(wqlToClauses(submitted) ?? defaultExplorerClauses()),
    [submitted],
  );
  const resultIsCurrent =
    result !== undefined &&
    (sameQuery(result.parsed.raw, draft) ||
      (result.parsed.raw === submitted && draft === restoredDraft));

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
          onSelectMetric={selectMetric}
        />

        <section className="flex-1 min-w-0">
          <WqlComposer
            clauses={clauses}
            onClausesChange={setClauses}
            onSubmit={(wql) => submit(wql)}
            execute={diagnosticsExecutor}
            className="mb-3"
            customSlots={
              <button
                type="button"
                data-testid="run-query"
                onClick={() => submit()}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-1 text-[11px] font-semibold hover:opacity-90 transition-all shadow-sm shrink-0"
              >
                <Play size={12} /> Run Query
              </button>
            }
          />
          <div className="bg-card border border-border rounded-lg p-3">

            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {EXAMPLE_QUERIES.map((ex) => (
                <button
                  key={ex.query}
                  onClick={() => runExample(ex.query)}
                  title={ex.question}
                  className={cn(
                    'text-[11px] rounded-full border px-2.5 py-1 transition-colors',
                    submitted === ex.query
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
              {EXPLORER_RANGE_OPTIONS.map((w) => (
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
                {submitted ? (
                  <>
                    <ParsedQueryChips parsed={resultIsCurrent ? result.parsed : liveParsed} />
                    {resultIsCurrent && <PipelineAnatomy result={result} />}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Submit a query to see its anatomy.</div>
                )}
              </div>

              <div className="mt-3">
                <SampleDataPrompt layout="banner" refreshKey={refreshKey} onChanged={() => setRefreshKey((k) => k + 1)} />
              </div>

              <div className="mt-3">
                <WidgetFrame title="Query result" question={exampleQuestion} query={submitted || '(empty)'}>
                  <div className="h-64">
                    {!submitted ? (
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
