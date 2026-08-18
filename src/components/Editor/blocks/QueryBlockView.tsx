/**
 * QueryBlockView — the atomic renderer for a ```query fenced block (#801, #842).
 *
 * The block body is a single WQL string or structured block source. It is parsed
 * and executed through the same QueryService the Explorer uses: analytics queries
 * render a chart (scalar / timeseries / bars), find queries render a note/block list.
 * Includes modal inspector editing backed by WqlComposer (decision #837).
 */
import { useEffect, useMemo, useState } from 'react';
import { Edit3 } from 'lucide-react';
import {
  parseQuery,
  isFindQuery,
  isRowsQuery,
  queryService,
  type QueryResult,
  type FindQueryResult,
  type RowsQueryResult,
} from '@/services/analytics/query';
import { RowsTable } from '@/components/molecules/analytics/RowsTable';
import { RowsResultsChrome } from './RowsResultsChrome';
import { useChartShape } from '@/components/molecules/analytics/useChartShape';
import { QueryValue } from '@/components/molecules/analytics/QueryValue';
import { WqlTimeseries } from '@/components/molecules/analytics/WqlTimeseries';
import { WqlBars } from '@/components/molecules/analytics/WqlBars';
import { WqlEmptyState } from '@/components/molecules/analytics/WqlEmptyState';
import { WidgetChart, WidgetProblemBadge } from '@/components/molecules/analytics/WidgetChart';
import { splitWidgetBody, substituteTokens, isDashboardWidgetType, unknownTokensMessage, unknownWidgetTypeMessage } from '@/lib/dashboard/model';
import { extractBlockQueries } from '../utils/blockQueryPatcher';
import { WqlQueryInspectorModal } from './WqlQueryInspectorModal';
import { onResultSaved } from '@/services/resultRecorder';

export interface QueryBlockViewProps {
  /** Raw text between the ```query fences — the WQL query string or block source. */
  query: string;
  /** Injected QueryExecutor for executing WQL queries (zero singleton coupling). */
  executor?: {
    runQuery(query: string, options?: any): Promise<QueryResult>;
    runFind(parsed: any, options?: any): Promise<FindQueryResult>;
    runRows(parsed: any, options?: any): Promise<RowsQueryResult>;
  };
  /** Optional callback or subscription hook for when a result is saved, replacing hardcoded resultRecorder coupling. */
  onResultSaved?: (callback: () => void) => (() => void) | void;
  /** Optional callback when query is saved via the inspector modal. */
  onSaveQuery?: (newQuery: string, queryIndex?: number) => void;
  /** Query index within parent block (default 0). */
  queryIndex?: number;
  /** Read-only mode flag. */
  readOnly?: boolean;
  /** Widget type from the fence suffix (```query:timeseries) — explicit chart dispatch (#899). */
  widgetType?: string;
  /** Malformed fence-suffix reason — rendered as a badge instead of executing. */
  widgetError?: string;
  /** Current dashboard-token values for $name substitution (from the note's frontmatter). */
  tokenValues?: Record<string, string>;
}

export function QueryBlockView({
  query,
  executor,
  onResultSaved: onResultSavedProp,
  onSaveQuery,
  queryIndex = 0,
  readOnly = false,
  widgetType,
  widgetError,
  tokenValues,
}: QueryBlockViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const extracted = useMemo(() => extractBlockQueries(query), [query]);
  // Strip trailing `/` widget params (#899-7), then substitute $token refs at
  // execution time with the note's current frontmatter values (#899-6).
  const { query: effectiveQuery, params: effectiveParams, missing } = useMemo(() => {
    const raw = extracted.length > 0 ? extracted[0].query : query;
    const { query: body, params: rawParams } = splitWidgetBody(raw);
    const subQuery = substituteTokens(body, tokenValues ?? {});
    const paramSubs = rawParams.map((p) => substituteTokens(p, tokenValues ?? {}));
    const missing = [...new Set([...subQuery.missing, ...paramSubs.flatMap((s) => s.missing)])];
    return { query: subQuery.query, params: paramSubs.map((s) => s.query), missing };
  }, [extracted, query, tokenValues]);
  const parsed = useMemo(() => parseQuery(effectiveQuery), [effectiveQuery]);
  // Unknown fence-suffix types badge without executing (#899 — never silent).
  const unknownType =
    widgetType != null && widgetType !== '' && !isDashboardWidgetType(widgetType);
  const [result, setResult] = useState<QueryResult | undefined>(undefined);
  const [findResult, setFindResult] = useState<FindQueryResult | undefined>(undefined);
  const [rowsResult, setRowsResult] = useState<RowsQueryResult | undefined>(undefined);
  const [runError, setRunError] = useState<string | undefined>(undefined);
  // Bumped by the rows chrome after an RPE capture so the grid re-derives (#948).
  const [rowsRefreshKey, setRowsRefreshKey] = useState(0);
  useEffect(() => {
    const subscribe = onResultSavedProp ?? onResultSaved;
    return subscribe(() => {
      setRowsRefreshKey((k) => k + 1);
    });
  }, [onResultSavedProp]);

  useEffect(() => {
    let cancelled = false;
    setRunError(undefined);
    setResult(undefined);
    setFindResult(undefined);
    setRowsResult(undefined);

    if (parsed.error) return;
    if (widgetError || unknownType || missing.length > 0) return;

    const activeExecutor = executor ?? queryService;
    if (isFindQuery(parsed)) {
      void activeExecutor
        .runFind(parsed)
        .then((res) => {
          if (!cancelled) setFindResult(res);
        })
        .catch((err) => {
          if (!cancelled) setRunError(err instanceof Error ? err.message : String(err));
        });
    } else if (isRowsQuery(parsed)) {
      let retryTimer: number | NodeJS.Timeout | undefined;
      const executeRows = (attemptCount: number) => {
        void activeExecutor
          .runRows(parsed)
          .then((res) => {
            if (cancelled) return;
            setRowsResult(res);
            if (res.runs.length === 0 && attemptCount < 4) {
              const delays = [50, 150, 350, 750];
              retryTimer = setTimeout(() => {
                if (!cancelled) executeRows(attemptCount + 1);
              }, delays[attemptCount] ?? 500);
            }
          })
          .catch((err) => {
            if (!cancelled) setRunError(err instanceof Error ? err.message : String(err));
          });
      };
      executeRows(0);
      return () => {
        cancelled = true;
        if (retryTimer) clearTimeout(retryTimer);
      };
    } else {
      void activeExecutor
        .runQuery(effectiveQuery)
        .then((res) => {
          if (!cancelled) setResult(res);
        })
        .catch((err) => {
          if (!cancelled) setRunError(err instanceof Error ? err.message : String(err));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [effectiveQuery, parsed, rowsRefreshKey]);

  const handleEditClick = () => {
    setIsModalOpen(true);
  };

  const handleApplyQuery = (newQuery: string) => {
    onSaveQuery?.(newQuery, queryIndex);
  };

  // ── Malformed fence suffix / unknown $tokens — loud badges (#899) ──
  if (widgetError) {
    return (
      <QueryBlockShell readOnly={readOnly}>
        <WidgetProblemBadge message={widgetError} />
      </QueryBlockShell>
    );
  }
  if (unknownType) {
    return (
      <QueryBlockShell readOnly={readOnly}>
        <WidgetProblemBadge message={unknownWidgetTypeMessage(widgetType ?? '')} />
      </QueryBlockShell>
    );
  }
  if (missing.length > 0) {
    return (
      <QueryBlockShell readOnly={readOnly}>
        <WidgetProblemBadge message={unknownTokensMessage(missing)} />
      </QueryBlockShell>
    );
  }

  // ── Parse / run error ──
  if (parsed.error) {
    return (
      <QueryBlockShell onEdit={onSaveQuery ? handleEditClick : undefined} readOnly={readOnly}>
        <p className="text-sm text-destructive font-mono px-1 py-2">{parsed.error}</p>
        {onSaveQuery && (
          <WqlQueryInspectorModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            initialQuery={effectiveQuery}
            onApply={handleApplyQuery}
          />
        )}
      </QueryBlockShell>
    );
  }
  if (runError) {
    return (
      <QueryBlockShell onEdit={onSaveQuery ? handleEditClick : undefined} readOnly={readOnly}>
        <p className="text-sm text-destructive font-mono px-1 py-2">{runError}</p>
        {onSaveQuery && (
          <WqlQueryInspectorModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            initialQuery={effectiveQuery}
            onApply={handleApplyQuery}
          />
        )}
      </QueryBlockShell>
    );
  }

  // ── Rows query → per-run pivoted grid (rows:{…}, #949) ──
  if (isRowsQuery(parsed)) {
    // The written-on-completion shape (rows:{result:…}, #944) gets the
    // results chrome: widen toggle + inline RPE (#948). Any other rows block
    // renders the plain grouped grid.
    const sessionResultId = parsed.filters.find((f) => f.key === 'result')?.values[0]?.value;
    return (
      <QueryBlockShell onEdit={onSaveQuery ? handleEditClick : undefined} readOnly={readOnly}>
        {rowsResult?.error ? (
          <p className="text-sm text-destructive font-mono px-1 py-2">{rowsResult.error}</p>
        ) : rowsResult ? (
          sessionResultId ? (
            <RowsResultsChrome
              resultId={sessionResultId}
              sessionResult={rowsResult}
              onCaptured={() => setRowsRefreshKey((k) => k + 1)}
            />
          ) : (
            <RowsTable result={rowsResult} />
          )
        ) : (
          <p className="text-xs text-muted-foreground italic px-1 py-2">Loading rows…</p>
        )}
        {onSaveQuery && (
          <WqlQueryInspectorModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            initialQuery={effectiveQuery}
            onApply={handleApplyQuery}
          />
        )}
      </QueryBlockShell>
    );
  }

  // ── Find query → note/block list ──
  if (isFindQuery(parsed)) {
    return (
      <QueryBlockShell onEdit={onSaveQuery ? handleEditClick : undefined} readOnly={readOnly}>
        <FindResultList parsed={parsed} result={findResult} />
        {onSaveQuery && (
          <WqlQueryInspectorModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            initialQuery={effectiveQuery}
            onApply={handleApplyQuery}
          />
        )}
      </QueryBlockShell>
    );
  }

  // ── Analytics query → chart ──
  return (
    <QueryBlockShell onEdit={onSaveQuery ? handleEditClick : undefined} readOnly={readOnly}>
      <div className="h-48">
        <AnalyticsChart result={result} metric={parsed.metric} widgetType={widgetType} params={effectiveParams} />
      </div>
      {onSaveQuery && (
        <WqlQueryInspectorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialQuery={effectiveQuery}
          onApply={handleApplyQuery}
        />
      )}
    </QueryBlockShell>
  );
}

/** Pick the right chart component for an analytics QueryResult. */
function AnalyticsChart({
  result,
  metric,
  widgetType,
  params,
}: {
  result: QueryResult | undefined;
  metric: string;
  widgetType?: string;
  params?: string[];
}) {
  const shape = useChartShape(result);

  // Explicit fence suffix (```query:timeseries) wins over shape inference.
  if (widgetType != null) {
    return <WidgetChart type={widgetType} result={result} label={metric} params={params} />;
  }

  if (!result) {
    return <WqlEmptyState result={result} />;
  }
  if (shape.kind === 'empty') {
    return <WqlEmptyState result={result} />;
  }
  if (shape.kind === 'scalar') {
    return <QueryValue result={result} label={metric} />;
  }
  if (shape.kind === 'bars') {
    return <WqlBars result={result} />;
  }
  return <WqlTimeseries result={result} />;
}

/** Note/block list for a find query (mirrors the Explorer's find rendering). */
function FindResultList({ parsed, result }: { parsed: FindQueryResult['parsed']; result: FindQueryResult | undefined }) {
  if (!result) {
    return <p className="text-xs text-muted-foreground italic px-1 py-2">Searching…</p>;
  }

  const { notes, blocks, stages } = result;
  const count = parsed.target === 'block' ? blocks.length : notes.length;

  if (count === 0) {
    return <WqlEmptyState result={undefined} />;
  }

  return (
    <div className="space-y-2 py-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1 border-b border-border/50 pb-1">
        <span className="font-mono text-[11px]">{parsed.raw}</span>
        <span>
          {count} of {stages.matched} {parsed.target}s matched
        </span>
      </div>
      <ul className="divide-y divide-border/40 max-h-56 overflow-y-auto">
        {parsed.target === 'block'
          ? blocks.map((b) => (
              <li key={b.id} className="py-1.5 px-1 hover:bg-muted/40 rounded text-xs flex items-center justify-between">
                <span className="font-medium text-foreground truncate">{b.rawContent}</span>
                <span className="text-[10px] font-mono text-muted-foreground ml-2 shrink-0">{b.dataType}</span>
              </li>
            ))
          : notes.map((n) => (
              <li key={n.id} className="py-1.5 px-1 hover:bg-muted/40 rounded text-xs flex items-center justify-between">
                <span className="font-medium text-foreground truncate">{n.title}</span>
              </li>
            ))}
      </ul>
    </div>
  );
}

/** Consistent framed shell around an inline query result. */
function QueryBlockShell({
  children,
  onEdit,
  readOnly,
}: {
  children: React.ReactNode;
  onEdit?: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="relative group rounded-lg border border-border bg-card px-3 py-2 my-1">
      {onEdit && !readOnly && (
        <button
          onClick={onEdit}
          title="Edit query with Omni-Composer"
          data-testid="edit-query-block"
          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-card/80 border border-border text-muted-foreground hover:text-foreground hover:border-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
        >
          <Edit3 size={13} />
        </button>
      )}
      {children}
    </div>
  );
}
