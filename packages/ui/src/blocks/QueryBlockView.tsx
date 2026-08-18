import { useEffect, useMemo, useState } from 'react';
import { Edit3 } from 'lucide-react';
import { type Segment } from '@wod-wiki/core';
import { parseQuery, isFindQuery, isRowsQuery, splitWidgetBody, substituteTokens, isDashboardWidgetType, unknownTokensMessage, unknownWidgetTypeMessage, type QueryResult, type FindQueryResult, type RowsQueryResult, type RowsRun } from '@wod-wiki/wql';
import type { QueryExecutor } from '../contracts/query';
import { RowsTable } from '../widgets/RowsTable';
import { RowsResultsChrome } from './RowsResultsChrome';
import { useChartShape } from '../widgets/useChartShape';
import { QueryValue } from '../widgets/QueryValue';
import { WqlTimeseries } from '../widgets/WqlTimeseries';
import { WqlBars } from '../widgets/WqlBars';
import { WqlEmptyState } from '../widgets/WqlEmptyState';
import { WidgetChart, WidgetProblemBadge } from '../widgets/WidgetChart';
import { extractBlockQueries } from '../utils/blockQueryPatcher';
import { WqlQueryInspectorModal } from './WqlQueryInspectorModal';

export interface QueryBlockViewProps {
  /** Raw text between the ```query fences — the WQL query string or block source. */
  query: string;
  /** Injected QueryExecutor for executing WQL queries (zero singleton coupling). */
  executor?: QueryExecutor;
  /** Optional callback or subscription hook for when a result is saved, replacing hardcoded resultRecorder coupling. */
  onResultSaved?: (callback: () => void) => (() => void) | void;
  /** Present when the query block is editable — opens the WQL composer. */
  onSaveQuery?: (nextQuery: string) => void;
  /** When multiple queries appear in one block, the index of this query. */
  queryIndex?: number;
  /** When true, editing the query is disallowed. */
  readOnly?: boolean;
  /** Fence-suffix widget type override (e.g. `query:chart`, `query:value`). */
  widgetType?: string;
  /** Frontmatter/syntax parse error for the enclosing widget block. */
  widgetError?: string;
  /** Token values from the note's frontmatter, for `$token` substitution. */
  tokenValues?: Record<string, string>;
  /** Optional RPE capture handler. */
  onCaptureRpe?: (resultId: string, rpe: number) => Promise<void>;
  /** Optional custom segment grid renderer. */
  renderSegments?: (segments: Segment[], run: RowsRun) => React.ReactNode;
}

export function QueryBlockView({
  query,
  executor,
  onResultSaved,
  onSaveQuery,
  queryIndex: _queryIndex = 0,
  readOnly = false,
  widgetType,
  widgetError,
  tokenValues,
  onCaptureRpe,
  renderSegments,
}: QueryBlockViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const extracted = useMemo(() => extractBlockQueries(query), [query]);
  const { query: effectiveQuery, params: effectiveParams, missing } = useMemo(() => {
    const raw = extracted.length > 0 ? extracted[0].query : query;
    const { query: body, params: rawParams } = splitWidgetBody(raw);
    const subQuery = substituteTokens(body, tokenValues ?? {});
    const paramSubs = rawParams.map((p) => substituteTokens(p, tokenValues ?? {}));
    const missing = [...new Set([...subQuery.missing, ...paramSubs.flatMap((s) => s.missing)])];
    return { query: subQuery.query, params: paramSubs.map((s) => s.query), missing };
  }, [extracted, query, tokenValues]);

  const parsed = useMemo(() => parseQuery(effectiveQuery), [effectiveQuery]);
  const unknownType =
    widgetType != null && widgetType !== '' && !isDashboardWidgetType(widgetType);
  const [result, setResult] = useState<QueryResult | undefined>(undefined);
  const [findResult, setFindResult] = useState<FindQueryResult | undefined>(undefined);
  const [rowsResult, setRowsResult] = useState<RowsQueryResult | undefined>(undefined);
  const [runError, setRunError] = useState<string | undefined>(undefined);
  const [rowsRefreshKey, setRowsRefreshKey] = useState(0);

  useEffect(() => {
    if (onResultSaved) {
      const unsub = onResultSaved(() => {
        setRowsRefreshKey((k) => k + 1);
      });
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }
  }, [onResultSaved]);

  useEffect(() => {
    let cancelled = false;
    setRunError(undefined);
    setResult(undefined);
    setFindResult(undefined);
    setRowsResult(undefined);

    if (parsed.error) return;
    if (widgetError || unknownType || missing.length > 0) return;
    if (!executor) return;

    if (isFindQuery(parsed)) {
      void executor
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
        void executor
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
      void executor
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
  }, [effectiveQuery, parsed, widgetError, unknownType, missing, executor, rowsRefreshKey]);

  const canEdit = onSaveQuery !== undefined && !readOnly;
  const onEdit = canEdit ? () => setIsModalOpen(true) : undefined;

  const resultId = useMemo(() => {
    if (!isRowsQuery(parsed)) return undefined;
    const resultFilter = parsed.filters.find((f) => f.key === 'result');
    return resultFilter?.values[0]?.value;
  }, [parsed]);

  return (
    <div data-testid="query-block-view">
      {widgetError ? (
        <QueryBlockShell onEdit={onEdit} readOnly={readOnly}>
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
            {widgetError}
          </div>
        </QueryBlockShell>
      ) : unknownType ? (
        <QueryBlockShell onEdit={onEdit} readOnly={readOnly}>
          <WidgetProblemBadge message={unknownWidgetTypeMessage(widgetType)} />
        </QueryBlockShell>
      ) : missing.length > 0 ? (
        <QueryBlockShell onEdit={onEdit} readOnly={readOnly}>
          <WidgetProblemBadge message={unknownTokensMessage(missing)} />
        </QueryBlockShell>
      ) : parsed.error ? (
        <QueryBlockShell onEdit={onEdit} readOnly={readOnly}>
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
            Query syntax error: {parsed.error}
          </div>
        </QueryBlockShell>
      ) : runError ? (
        <QueryBlockShell onEdit={onEdit} readOnly={readOnly}>
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
            Query execution error: {runError}
          </div>
        </QueryBlockShell>
      ) : isRowsQuery(parsed) ? (
        <QueryBlockShell onEdit={onEdit} readOnly={readOnly}>
          {rowsResult?.error ? (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
              {rowsResult.error}
            </div>
          ) : resultId && rowsResult && rowsResult.runs.length > 0 ? (
            <RowsResultsChrome
              resultId={resultId}
              sessionResult={rowsResult}
              executor={executor}
              onCaptureRpe={onCaptureRpe}
              onCaptured={() => setRowsRefreshKey((k) => k + 1)}
              renderSegments={renderSegments}
            />
          ) : rowsResult ? (
            <RowsTable result={rowsResult} renderSegments={renderSegments} />
          ) : (
            <div className="text-xs text-muted-foreground py-2">Loading rows…</div>
          )}
        </QueryBlockShell>
      ) : isFindQuery(parsed) ? (
        <QueryBlockShell onEdit={onEdit} readOnly={readOnly}>
          <FindResultList parsed={parsed} result={findResult} />
        </QueryBlockShell>
      ) : (
        <QueryBlockShell onEdit={onEdit} readOnly={readOnly}>
          <AnalyticsChart
            result={result}
            metric={parsed.metric}
            widgetType={widgetType}
            params={effectiveParams}
          />
        </QueryBlockShell>
      )}

      {canEdit && (
        <WqlQueryInspectorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialQuery={effectiveQuery}
          executor={executor}
          onApply={(nextQuery) => {
            onSaveQuery(nextQuery);
          }}
        />
      )}
    </div>
  );
}

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

  if (widgetType != null && widgetType !== '') {
    return <WidgetChart type={widgetType} result={result} label={metric} params={params} />;
  }

  if (shape.kind === 'scalar') {
    return <QueryValue result={result!} label={metric} />;
  }
  if (shape.kind === 'timeseries') {
    return <WqlTimeseries result={result!} />;
  }
  if (shape.kind === 'bars') {
    return <WqlBars result={result!} />;
  }
  return <WqlEmptyState result={result} />;
}

function FindResultList({ parsed, result }: { parsed: FindQueryResult['parsed']; result: FindQueryResult | undefined }) {
  if (!result) {
    return <div className="text-xs text-muted-foreground py-2">Loading…</div>;
  }
  const isBlock = parsed.target === 'block';
  const items = isBlock ? result.blocks : result.notes;

  if (items.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-2">
        No {parsed.target}s matched this query.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium text-muted-foreground mb-1">
        {items.length} {parsed.target}{items.length === 1 ? '' : 's'} matched
      </div>
      <ul className="space-y-0.5 max-h-48 overflow-y-auto font-mono text-xs">
        {items.map((item) => (
          <li key={item.id} className="py-0.5 px-1.5 rounded hover:bg-muted/50 truncate">
            {isBlock ? (item as any).title || (item as any).blockContentId || item.id : (item as any).title || item.id}
          </li>
        ))}
      </ul>
    </div>
  );
}

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
    <div className="relative group/block my-2 p-3 rounded-lg border border-border/80 bg-card/60 shadow-sm">
      {onEdit && !readOnly && (
        <button
          type="button"
          onClick={onEdit}
          title="Edit query in Omni-Composer"
          className="absolute top-2 right-2 p-1 rounded bg-muted/80 text-muted-foreground hover:text-foreground opacity-0 group-hover/block:opacity-100 transition-opacity z-10"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      )}
      {children}
    </div>
  );
}
