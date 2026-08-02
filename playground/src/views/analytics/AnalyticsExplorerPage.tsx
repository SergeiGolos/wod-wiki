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
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarIcon, LayoutDashboard, Play } from 'lucide-react';
import { parseQuery, isFindQuery, queryService, type QueryResult } from '@/services/analytics/query';
import { ensureStoreRollupFacts } from '@/services/analytics/rollup';
import { StickyPageHeader, useStickyBoundaryOffset } from '@/panels/page-shells';
import { searchEntries } from '../../lib/entrySearch';
import { groupEntriesByDate } from '../../lib/entryGrouping';
import { formatDateHeader } from '../../lib/dateFormat';
import { LibraryRow } from '../library/LibraryRow';
import { QueryToDashboardDialog } from './QueryToDashboardDialog';
import type { Entry } from '../../lib/entryMapper';
import type { IEffort } from '@/effort-registry';
import {
  QueryValue,
  useChartShape,
  WidgetFrame,
  WqlBars,
  WqlEmptyState,
  WqlTimeseries,
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
} from '../../hooks/useExplorerQueryState';
import { ExplorerOptionsMenu } from './ExplorerOptionsMenu';
import { SampleDataPrompt } from './SampleDataPrompt';

const DAY = 86_400_000;

/** Filter keys the note store understands — the only calculation filters
 * that can derive a records query truthfully. Effort/discipline/intensity
 * are fact-row tags, not note fields; carrying them into a find would
 * silently not filter. */
const NOTE_FILTER_KEYS = new Set(['tags', 'catalog', 'text', 'type', 'has']);

/** TagFilter[] → `{key:v1|v2, …}` braces (empty string when no filters). */
function serializeTagFilters(filters: { key: string; negate: boolean; values: { value: string }[] }[]): string {
  if (filters.length === 0) return '';
  const body = filters
    .map(f => `${f.negate ? '!' : ''}${f.key}:${f.values.map(v => v.value).join('|')}`)
    .join(', ');
  return `{${body}}`;
}

/** The date-grouped records stream — shared by the find-result view and the
 * calculation's records section so both render exactly like the Library. */
function GroupedEntryList({ entries, stickyOffset }: { entries: Entry[]; stickyOffset: number }) {
  return (
    <div className="-mx-4">
      {groupEntriesByDate(entries).map(([date, group]) => (
        <div key={date} className="flex flex-col">
          <div
            className="sticky z-[5] px-6 py-2 bg-muted/80 backdrop-blur-sm border-y border-border flex items-center gap-2"
            style={{ top: stickyOffset }}
          >
            <CalendarIcon className="size-3 text-muted-foreground flex-shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {date === '(undated)' ? 'Undated' : formatDateHeader(date)}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground/60 tabular-nums" data-testid="library-group-count">
              {group.length}
            </span>
          </div>
          <div className="flex flex-col gap-0 pb-1">
            {group.map(entry => (
              <LibraryRow
                key={entry.block ? `${entry.id}#${entry.block.segmentId}` : entry.id}
                entry={entry}
                dateLabel={entry.date ? formatDateHeader(entry.date) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Canonical WQL comparison: composer-restorable strings compare through the
 * clause model (so a deep-linked `sum:totalVolume{}` matches the restored
 * `sum:totalVolume` draft); anything else falls back to raw equality. */
function sameQuery(a: string, b: string): boolean {
  if (a === b) return true;
  const ca = wqlToClauses(a);
  const cb = wqlToClauses(b);
  return ca !== null && cb !== null && clausesToWql(ca) === clausesToWql(cb);
}

export interface AnalyticsExplorerPageProps {
  /**
   * Header action bar, injected by the composition root (App.tsx) as a
   * fully-wired `PageActions`. Optional so the page stays renderable in
   * isolation (tests, stories) without app-wide context providers.
   */
  actions?: ReactNode;
}

export function AnalyticsExplorerPage({ actions }: AnalyticsExplorerPageProps) {
  const { clauses, setClauses, draft, submitted, submit, weeks: activeWeeks, setWeeks } =
    useExplorerQueryState();
  const { unit: preferredUnit } = useAnalyticsUnitPreference();
  const { forced: unitForced } = useMemo(
    () => getEffectiveAnalyticsUnit(submitted, preferredUnit),
    [submitted, preferredUnit],
  );
  const [result, setResult] = useState<QueryResult | undefined>(undefined);
  const [entries, setEntries] = useState<Entry[] | undefined>(undefined);
  const [records, setRecords] = useState<Entry[] | undefined>(undefined);
  const [efforts, setEfforts] = useState<IEffort[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [dashOpen, setDashOpen] = useState(false);
  const vocabulary = useExplorerVocabulary();
  const liveParsed = useMemo(() => parseQuery(draft), [draft]);
  const stickyOffset = useStickyBoundaryOffset(104);

  // The subset for the Query→Dashboard flow: a find draft IS the subset; an
  // analytics draft contributes its where-join find half when present.
  const draftValid = !liveParsed.error && draft.trim().length > 0;
  const subsetQuery = useMemo(() => {
    if (!draftValid) return null;
    if (isFindQuery(liveParsed)) return draft;
    const m = /\s+where\s+(find:.*)$/.exec(draft);
    return m ? m[1]!.trim() : null;
  }, [liveParsed, draft, draftValid]);

  // The records behind a calculation: the explicit `where find:…` subset
  // wins verbatim; otherwise the calculation's note-compatible filters plus
  // the active range derive the subset. Fact-row-only filters (effort,
  // discipline, intensity) never leak in — they'd silently not filter notes.
  const recordsWql = useMemo(() => {
    if (!submitted) return null;
    const p = parseQuery(submitted);
    if (isFindQuery(p) || p.error) return null;
    if (p.join) {
      const jf = p.join;
      return `find:${jf.target}${serializeTagFilters(jf.filters)} in ${jf.scope ?? 'all'}${jf.last ? ` last ${jf.last.size}${jf.last.unit}` : ''}`;
    }
    const compatible = p.filters.filter(f => NOTE_FILTER_KEYS.has(f.key) && !f.negate);
    return `find:note${serializeTagFilters(compatible)} in all last ${activeWeeks}w`;
  }, [submitted, activeWeeks]);

  useEffect(() => {
    if (!recordsWql) {
      setRecords(undefined);
      return;
    }
    let cancelled = false;
    searchEntries(recordsWql)
      .then((rows) => { if (!cancelled) setRecords(rows); })
      .catch(() => { if (!cancelled) setRecords(undefined); });
    return () => { cancelled = true; };
  }, [recordsWql]);

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
      setEntries(undefined);
      setEfforts(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    const parsed = parseQuery(submitted);

    if (isFindQuery(parsed)) {
      // Content query — the shared WQL → Entry[] pipeline (same rows as the
      // Library, #833); effort targets come from the engine's effort plane.
      if (parsed.target === 'effort') {
        queryService.runFind(parsed)
          .then((r) => { if (!cancelled) { setEfforts(r.efforts ?? []); setEntries([]); } })
          .catch(() => { if (!cancelled) { setEfforts(undefined); setEntries(undefined); } })
          .finally(() => { if (!cancelled) setLoading(false); });
      } else {
        searchEntries(submitted)
          .then((rows) => { if (!cancelled) { setEntries(rows); setEfforts([]); } })
          .catch(() => { if (!cancelled) { setEntries(undefined); setEfforts(undefined); } })
          .finally(() => { if (!cancelled) setLoading(false); });
      }
    } else {
      // Analytics query — existing chart pipeline
      setEntries(undefined);
      setEfforts(undefined);
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
    <div className="bg-card flex flex-col flex-1">
      <StickyPageHeader
        title="Metric Explorer"
        subtitle="Run WQL queries against your workout analytics store and inspect the pipeline anatomy."
        actions={
          <div className="flex items-center gap-3">
            <ExplorerOptionsMenu
              weeks={activeWeeks}
              onWeeks={setWeeks}
              onRunExample={runExample}
              submitted={submitted}
              unitForced={unitForced}
            />
            {actions}
          </div>
        }
        subheader={
          <div className="px-6 py-2.5">
            <WqlComposer
              clauses={clauses}
              onClausesChange={setClauses}
              onSubmit={(wql) => submit(wql)}
              execute={diagnosticsExecutor}
              customSlots={
                <>
                  <button
                    type="button"
                    data-testid="run-query"
                    onClick={() => submit()}
                    className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-1 text-[11px] font-semibold hover:opacity-90 transition-all shadow-sm shrink-0"
                  >
                    <Play size={12} /> Run Query
                  </button>
                  <button
                    type="button"
                    data-testid="query-to-dashboard"
                    disabled={!draftValid}
                    onClick={() => setDashOpen(true)}
                    title="Decouple the data source (subset query) from the calculation, then send it to a dashboard"
                    className="flex items-center gap-1.5 rounded-lg border border-primary/40 text-primary px-3 py-1 text-[11px] font-semibold hover:bg-primary/10 transition-all shrink-0 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <LayoutDashboard size={12} /> Query → Dashboard
                  </button>
                </>
              }
            />
          </div>
        }
      />

      <div className="flex gap-4 min-h-0 p-4">
        <ExplorerSidebar
          metricKeys={vocabulary.metricKeys}
          tagKeys={vocabulary.tagKeys}
          query={draft}
          onSelectMetric={selectMetric}
        />

        <section className="flex-1 min-w-0">
          {isFindQuery(liveParsed) ? (
            /* ── Find query result: the Library's date-grouped stream ── */
            <div className="mt-3">
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
                ) : efforts && efforts.length > 0 ? (
                  <div className="flex flex-col divide-y divide-border/50">
                    {efforts.map(effort => (
                      <div key={effort.slug} className="flex items-center gap-3 py-2.5">
                        <span className="text-sm font-medium text-foreground">{effort.label}</span>
                        <span className="text-xs text-muted-foreground font-mono">{effort.slug}</span>
                        {effort.baseAttributes.discipline && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {effort.baseAttributes.discipline}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : entries && entries.length > 0 ? (
                  <GroupedEntryList entries={entries} stickyOffset={stickyOffset} />
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

              {recordsWql && records !== undefined && (
                <div className="bg-card border border-border rounded-lg p-4 mt-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                    Records in this calculation
                  </div>
                  <code className="block mb-3 rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground" data-testid="records-wql">
                    {recordsWql}
                  </code>
                  {records.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No records match this calculation.</div>
                  ) : (
                    <GroupedEntryList entries={records} stickyOffset={stickyOffset} />
                  )}
                </div>
              )}

              {result && <RawPointsTable matched={result.matched} displayUnit={result.unit} />}
            </>
          )}
        </section>
      </div>

      <QueryToDashboardDialog open={dashOpen} onOpenChange={setDashOpen} subsetQuery={subsetQuery} />
    </div>
  );
}
