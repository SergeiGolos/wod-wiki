/**
 * AnalyticsExplorerPage (`/analytics/explorer`) — WQL workbench over the
 * analytics store, rebuilt around a single command bar (issue #897,
 * prototype variant C): examples combo + shared `WqlComposer` organism
 * (decisions #828/#836) + Run in one row, with the metric/filter vocabulary
 * demoted to a compact meta line beneath it (the old `ExplorerSidebar` is
 * retired from this page). One surface per concern: the result renders in a
 * single full-bleed `WidgetFrame`, pipeline anatomy (`ParsedQueryChips` +
 * `PipelineAnatomy`) hides behind an "Inspect pipeline" disclosure, and the
 * calculation's records list behind a "Records" disclosure — no stacked
 * bordered panels.
 *
 * Data flow is unchanged: clause state round-trips through `?q=` via
 * `useExplorerQueryState` (the router-native #833 pattern), with the
 * run-on-submit split — the live draft drives the meta-line validity
 * indicator, while only the submitted snapshot gates the run effect.
 *
 * Run dispatch is unchanged: find queries go through `queryService.runFind`,
 * analytics queries through `queryService.runQuery` with range/unit options
 * (calc.* metrics resolve directly against the unified event store).
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CalendarIcon, CheckCircle2, ChevronDown, ChevronRight, Play, Save } from 'lucide-react';
import { queryService } from '@/services/queryService';
import { parseQuery, isFindQuery, isRowsQuery, type QueryResult, type RowsQueryResult, type TagFilter } from '@bitcobblers/wod-wiki-engine';;
import { RowsTable } from '@bitcobblers/wod-wiki-ui';
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
} from '@bitcobblers/wod-wiki-ui';
import {
  ParsedQueryChips,
  PipelineAnatomy,
  RawPointsTable,
  windowLabel,
} from '@/components/organisms/analytics';
import {
  WqlComposer,
  clausesToWql,
  setMetricClause,
  wqlToClauses,
} from '@bitcobblers/wod-wiki-ui';
import { EXAMPLE_QUERIES } from '@/utils/analytics/explorerQueries';
import { useExplorerVocabulary } from '@/utils/analytics/useExplorerVocabulary';
import {
  useExplorerQueryState,
  defaultExplorerClauses,
} from '../../hooks/useExplorerQueryState';
import { ExplorerCommandBar } from './ExplorerCommandBar';
import { ExplorerOptionsMenu } from './ExplorerOptionsMenu';
import { SampleDataPrompt } from './SampleDataPrompt';
import { cn } from '@/lib/utils';

const DAY = 86_400_000;

/** WQL grammar hint shown as the composer input's placeholder (issue #897 —
 * syntax discoverable without taking up visual space). */
const WQL_GRAMMAR_PLACEHOLDER = 'agg:metric{filters} by {dims} .rollup(period)';

/** Filter keys the note store understands — the only calculation filters
 * that can derive a records query truthfully. Effort/discipline/intensity
 * are fact-row tags, not note fields; carrying them into a find would
 * silently not filter. */
const NOTE_FILTER_KEYS = new Set(['tags', 'catalog', 'text', 'type', 'has']);

/** `TagFilter[]` → `{key:v1|v2, …}` braces (empty string when no filters). */
function serializeTagFilters(filters: { key: string; negate: boolean; values: { value: string }[] }[]): string {
  if (filters.length === 0) return '';
  const body = filters
    .map(f => `${f.negate ? '!' : ''}${f.key}:${f.values.map(v => v.value).join('|')}`)
    .join(', ');
  return `{${body}}`;
}

/** The find query's scope label — folded into the `source:` filter (C2). */
function sourceFilterLabel(filters: TagFilter[]): string | null {
  const src = filters.find(f => f.key === 'source' && !f.negate);
  return src ? src.values.map(v => v.value).join('|') : null;
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
  const [rowsResult, setRowsResult] = useState<RowsQueryResult | undefined>(undefined);
  const [entries, setEntries] = useState<Entry[] | undefined>(undefined);
  const [records, setRecords] = useState<Entry[] | undefined>(undefined);
  const [efforts, setEfforts] = useState<IEffort[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [dashOpen, setDashOpen] = useState(false);
  const vocabulary = useExplorerVocabulary();
  const liveParsed = useMemo(() => parseQuery(draft), [draft]);
  const scopeLabel = sourceFilterLabel(isFindQuery(liveParsed) ? liveParsed.filters : []);
  const findWindowLabel = isFindQuery(liveParsed) && liveParsed.window ? windowLabel(liveParsed.window) : null;
  const rowsWindowLabel = isRowsQuery(liveParsed) && liveParsed.window ? windowLabel(liveParsed.window) : null;
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
    if (isFindQuery(p) || isRowsQuery(p) || p.error) return null;
    if (p.join) {
      const jf = p.join;
      return `find:${jf.target}${serializeTagFilters(jf.filters)}${jf.last ? ` last ${jf.last.size}${jf.last.unit}` : ''}`;
    }
    const compatible = p.filters.filter(f => NOTE_FILTER_KEYS.has(f.key) && !f.negate);
    return `find:note${serializeTagFilters(compatible)} last ${activeWeeks}w`;
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
  const [anatomyOpen, setAnatomyOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!submitted) {
      setResult(undefined);
      setRowsResult(undefined);
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
      setRowsResult(undefined);
      setResult(undefined);
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
    } else if (isRowsQuery(parsed)) {
      // Rows query (rows:{…}, #949) — per-run logs grid re-derived from logs.
      setResult(undefined);
      setEntries(undefined);
      setEfforts(undefined);
      queryService.runRows(parsed)
        .then((r) => { if (!cancelled) setRowsResult(r); })
        .catch(() => { if (!cancelled) setRowsResult(undefined); })
        .finally(() => { if (!cancelled) setLoading(false); });
    } else {
      // Analytics query — resolves directly against the unified event store.
      setRowsResult(undefined);
      setEntries(undefined);
      setEfforts(undefined);
      const now = Date.now();
      const rangeStart = now - activeWeeks * 7 * DAY;
      queryService.runQuery(submitted, { rangeStart, rangeEnd: now, preferredUnit })
        .then((r) => { if (!cancelled) setResult(r); })
        .catch(() => { if (!cancelled) setResult(undefined); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }

    return () => {
      cancelled = true;
    };
  }, [submitted, activeWeeks, refreshKey, preferredUnit]);

  const shape = useChartShape(result);

  /** Metric chip click: pivot to the metrics plane, set the metric clause, run. */
  const selectMetric = (metric: string) => {
    const next = setMetricClause(clauses, metric);
    setClauses(next);
    submit(clausesToWql(next));
  };

  const [pickedExample, setPickedExample] = useState<string | null>(null);

  /** Example chip: hydrate the composer from the query and run it. */
  const runExample = (wql: string) => {
    setPickedExample(wql);
    setClauses(wqlToClauses(wql) ?? defaultExplorerClauses());
    submit(wql);
  };

  // The combo claims an example only while the draft is still that example's
  // own composed form — any manual edit resets it to "Examples…". Compare
  // against the composed draft, not the raw catalog string: clause
  // round-tripping normalizes the WQL (empty `{}` braces drop), and some
  // examples (`note:` filters) don't restore through the clause model at all.
  const activeExample = useMemo(() => {
    if (!pickedExample) return undefined;
    const composedDraft = clausesToWql(wqlToClauses(pickedExample) ?? defaultExplorerClauses());
    return draft === composedDraft
      ? EXAMPLE_QUERIES.find((e) => e.query === pickedExample)
      : undefined;
  }, [pickedExample, draft]);

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

  // The empty result surface carries its own "Inspect pipeline" toggle next
  // to the sample-data prompt (issue #897 — both next steps equally visible);
  // with data on screen the same toggle lives in the controls row below the
  // frame, so exactly one `inspect-pipeline` control is rendered at a time.
  const resultEmpty = !submitted || (!loading && shape.kind === 'empty');

  const inspectPipelineButton = (
    <button
      type="button"
      data-testid="inspect-pipeline"
      aria-expanded={anatomyOpen}
      onClick={() => setAnatomyOpen((o) => !o)}
      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {anatomyOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      Inspect pipeline
    </button>
  );

  return (
    <div className="bg-card flex flex-col flex-1">
      <StickyPageHeader
        title="Metric Explorer"
        actions={
          <div className="flex items-center gap-3">
            <ExplorerOptionsMenu
              weeks={activeWeeks}
              onWeeks={setWeeks}
              unitForced={unitForced}
            />
            {actions}
          </div>
        }
      />

      <div className="flex flex-col min-h-0 p-4">
        <ExplorerCommandBar active={activeExample} onRunExample={runExample}>
          <WqlComposer
            clauses={clauses}
            onClausesChange={setClauses}
            onSubmit={(wql) => submit(wql)}
            showDiagnostics={false}
            placeholder={WQL_GRAMMAR_PLACEHOLDER}
            customSlots={
              <button
                type="button"
                data-testid="run-query"
                onClick={() => submit()}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-1 text-[11px] font-semibold hover:opacity-90 transition-all shadow-sm shrink-0"
              >
                <Play size={12} /> Run
              </button>
            }
            diagnosticsActions={
              <button
                type="button"
                data-testid="save-query"
                disabled={!draftValid}
                onClick={() => setDashOpen(true)}
                title="Save this query — decide where it lands (dashboard, …)"
                className="flex items-center gap-1.5 rounded-lg border border-primary/40 text-primary px-3 py-1 text-[11px] font-semibold hover:bg-primary/10 transition-all shrink-0 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Save size={12} /> Save
              </button>
            }
          />
        </ExplorerCommandBar>

        {/* Meta line: quiet draft-validity indicator + the metric/filter
            vocabulary chips that replaced the sidebar (issue #897). */}
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1" data-testid="explorer-meta">
          {draft.trim().length > 0 && (
            <span data-testid="draft-validity" className="mr-1 inline-flex items-center gap-1 text-[11px]">
              {liveParsed.error ? (
                <span className="inline-flex items-center gap-1 font-mono text-red-600">
                  <AlertCircle size={11} className="shrink-0" /> {liveParsed.error}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-green-600">
                  <CheckCircle2 size={11} className="shrink-0" /> valid
                </span>
              )}
            </span>
          )}
          {vocabulary.metricKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => selectMetric(key)}
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-mono transition-colors',
                draft.includes(key)
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {key}
            </button>
          ))}
          <span className="mx-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            filters
          </span>
          {vocabulary.tagKeys.map((key) => (
            <span
              key={key}
              className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] font-mono text-muted-foreground/70"
            >
              {key}
            </span>
          ))}
        </div>

        <section className="min-w-0">
          {isFindQuery(liveParsed) ? (
            /* ── Find query result: the Library's date-grouped stream ── */
            <div className="mt-3">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  Find {liveParsed.target}
                  {scopeLabel && <span className="ml-1">in {scopeLabel}</span>}
                  {findWindowLabel && <span className="ml-1">{findWindowLabel}</span>}
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
          ) : isRowsQuery(liveParsed) ? (
            /* ── Rows query result: per-run logs grid (rows:{…}, #949) ── */
            <div className="mt-3">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  Rows{liveParsed.outputType ? `:${liveParsed.outputType}` : ''}
                  {rowsWindowLabel && <span className="ml-1">{rowsWindowLabel}</span>}
                </div>
                {liveParsed.error ? (
                  <div className="text-sm text-destructive font-mono">{liveParsed.error}</div>
                ) : loading ? (
                  <div className="text-sm text-muted-foreground">Loading rows…</div>
                ) : rowsResult?.error ? (
                  <div className="text-sm text-destructive font-mono">{rowsResult.error}</div>
                ) : rowsResult ? (
                  <RowsTable result={rowsResult} />
                ) : (
                  <div className="text-sm text-muted-foreground">No workout logs matched.</div>
                )}
              </div>
            </div>
          ) : (
            /* ── Analytics query result: one full-bleed surface, diagnostics
               and records behind on-demand disclosures (issue #897) ── */
            <>
              <div className="mt-3">
                <SampleDataPrompt layout="banner" refreshKey={refreshKey} onChanged={() => setRefreshKey((k) => k + 1)} />
              </div>

              <div className="mt-3">
                <WidgetFrame title="Query result" question={exampleQuestion} query={submitted || '(empty)'}>
                  <div className="h-64">
                    {!submitted ? (
                      <div className="h-full flex flex-col items-center justify-center gap-3">
                        <div className="text-sm text-muted-foreground">
                          Enter a WQL query or choose an example to explore your data.
                        </div>
                        {inspectPipelineButton}
                      </div>
                    ) : loading ? (
                      <WqlEmptyState result={undefined} />
                    ) : shape.kind === 'error' ? (
                      <div className="h-full flex items-center justify-center text-sm text-destructive font-mono px-4 text-center">
                        {shape.message}
                      </div>
                    ) : shape.kind === 'empty' ? (
                      <div className="h-full flex flex-wrap items-center justify-center gap-6">
                        <SampleDataPrompt result={result} refreshKey={refreshKey} onChanged={() => setRefreshKey(k => k + 1)} />
                        {inspectPipelineButton}
                      </div>
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

              {submitted && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {/* While loading, no Inspect toggle renders anywhere — it
                      appears in one stable spot once the run settles (in the
                      empty state, or here when data is on screen). */}
                  {!loading && !resultEmpty && inspectPipelineButton}
                  {recordsWql && records !== undefined && (
                    <button
                      type="button"
                      data-testid="records-toggle"
                      aria-expanded={recordsOpen}
                      onClick={() => setRecordsOpen((o) => !o)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {recordsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      Records in this calculation
                      <span className="text-[10px] font-bold text-muted-foreground/60 tabular-nums">
                        {records.length}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {anatomyOpen && (
                <div className="mt-3" data-testid="pipeline-anatomy">
                  {submitted ? (
                    <>
                      <ParsedQueryChips parsed={resultIsCurrent ? result.parsed : liveParsed} />
                      {resultIsCurrent && <PipelineAnatomy result={result} />}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">Submit a query to see its anatomy.</div>
                  )}
                </div>
              )}

              {recordsOpen && recordsWql && records !== undefined && (
                <div className="mt-3">
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
