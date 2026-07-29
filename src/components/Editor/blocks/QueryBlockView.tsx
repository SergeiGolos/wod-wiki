/**
 * QueryBlockView — the atomic renderer for a ```query fenced block (#801).
 *
 * The block body is a single WQL string. It is parsed and executed through
 * the same QueryService the Explorer uses: analytics queries render a chart
 * (scalar / timeseries / bars), find queries render a note/block list. The
 * block is a dumb view over the engine — it declares, never computes.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  parseQuery,
  isFindQuery,
  queryService,
  type QueryResult,
  type FindQueryResult,
} from '@/services/analytics/query';
import { useChartShape } from '@/components/molecules/analytics/useChartShape';
import { QueryValue } from '@/components/molecules/analytics/QueryValue';
import { WqlTimeseries } from '@/components/molecules/analytics/WqlTimeseries';
import { WqlBars } from '@/components/molecules/analytics/WqlBars';
import { WqlEmptyState } from '@/components/molecules/analytics/WqlEmptyState';

export interface QueryBlockViewProps {
  /** Raw text between the ```query fences — the WQL query string. */
  query: string;
}

export function QueryBlockView({ query }: QueryBlockViewProps) {
  const parsed = useMemo(() => parseQuery(query), [query]);
  const [result, setResult] = useState<QueryResult | undefined>(undefined);
  const [findResult, setFindResult] = useState<FindQueryResult | undefined>(undefined);
  const [runError, setRunError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (parsed.error) return;
    let cancelled = false;
    setRunError(undefined);
    if (isFindQuery(parsed)) {
      queryService.runFind(parsed)
        .then((r) => { if (!cancelled) setFindResult(r); })
        .catch((e) => { if (!cancelled) setRunError(String(e)); });
    } else {
      queryService.runQuery(query)
        .then((r) => { if (!cancelled) setResult(r); })
        .catch((e) => { if (!cancelled) setRunError(String(e)); });
    }
    return () => { cancelled = true; };
  }, [query, parsed]);

  // ── Parse / run error ──
  if (parsed.error) {
    return <QueryBlockShell><p className="text-sm text-destructive font-mono px-1 py-2">{parsed.error}</p></QueryBlockShell>;
  }
  if (runError) {
    return <QueryBlockShell><p className="text-sm text-destructive font-mono px-1 py-2">{runError}</p></QueryBlockShell>;
  }

  // ── Find query → note/block list ──
  if (isFindQuery(parsed)) {
    return (
      <QueryBlockShell>
        <FindResultList parsed={parsed} result={findResult} />
      </QueryBlockShell>
    );
  }

  // ── Analytics query → chart ──
  return (
    <QueryBlockShell>
      <div className="h-48">
        <AnalyticsChart result={result} metric={parsed.metric} />
      </div>
    </QueryBlockShell>
  );
}

/** Pick the right chart component for an analytics QueryResult. */
function AnalyticsChart({ result, metric }: { result: QueryResult | undefined; metric: string }) {
  const shape = useChartShape(result);
  if (shape.kind === 'error') {
    return <div className="h-full flex items-center justify-center text-sm text-destructive font-mono px-4 text-center">{shape.message}</div>;
  }
  if (!result || shape.kind === 'empty') {
    return <WqlEmptyState result={result} />;
  }
  if (shape.kind === 'scalar') {
    return <QueryValue result={result} label={`${result.parsed.agg}(${metric})`} />;
  }
  if (shape.kind === 'timeseries') {
    return <WqlTimeseries result={result} />;
  }
  return <WqlBars result={result} />;
}

/** Note/block list for a find query (mirrors the Explorer's find rendering). */
function FindResultList({ parsed, result }: { parsed: FindQueryResult['parsed']; result: FindQueryResult | undefined }) {
  if (!result) {
    return <div className="text-sm text-muted-foreground px-1 py-2">Searching…</div>;
  }
  if (result.notes.length === 0 && result.blocks.length === 0) {
    return <div className="text-sm text-muted-foreground px-1 py-2">No {parsed.target}s found.</div>;
  }
  return (
    <div className="space-y-1.5 px-1 py-1">
      <div className="text-[11px] text-muted-foreground">
        {result.stages.matched} of {result.stages.selected} {parsed.target}s matched
      </div>
      {result.blocks.length > 0 ? result.blocks.map((block) => (
        <div key={block.id} className="border border-border rounded-md p-2">
          <div className="font-medium text-sm">{block.noteTitle || block.noteId}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            <span className="rounded bg-muted px-1.5 py-0.5 mr-1">{block.dataType}</span>
            {block.blockContentId && <span className="font-mono">{block.blockContentId}</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{block.rawContent}</div>
        </div>
      )) : result.notes.map((note) => (
        <div key={note.id} className="border border-border rounded-md p-2">
          <div className="font-medium text-sm">{note.title}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            <span>{new Date(note.createdAt).toLocaleDateString()}</span>
            {note.type && <span className="rounded bg-muted px-1.5 py-0.5 ml-1">{note.type}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Consistent framed shell around an inline query result. */
function QueryBlockShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 my-1">
      {children}
    </div>
  );
}
