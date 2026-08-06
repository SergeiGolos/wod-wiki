import { useEffect, useMemo, useState } from 'react';
import { Edit3 } from 'lucide-react';
import { isFindQuery, parseQuery, queryService, type QueryResult } from '@/services/analytics/query';
import { ensureStoreRollupFacts } from '@/services/analytics/rollup';
import {
  defaultTokenValues,
  isDashboardWidgetType,
  resolveWidgetType,
  substituteTokens,
  unknownTokensMessage,
  unknownWidgetTypeMessage,
  type DashboardDocument,
  type DashboardWidget,
} from '@/lib/dashboard/model';
import { WidgetFrame } from './WidgetFrame';
import { WidgetChart, WidgetProblemBadge } from './WidgetChart';
import { DashboardTokenControls } from './DashboardTokenControls';

export interface DashboardViewProps {
  /** Parsed dashboard note (buildDashboardDocument). */
  document: DashboardDocument;
  /** Current token values; defaults to each token's declared default. */
  tokenValues?: Record<string, string>;
  /** Present when the note is editable — control changes write back to frontmatter. */
  onTokenChange?: (name: string, value: string) => void;
  /** Present when the host offers query editing (composer modal owned by the host). */
  onEditQuery?: (widget: DashboardWidget) => void;
  /** Optional execution range (ms epoch). Omit to use each query's own window. */
  rangeStart?: number;
  rangeEnd?: number;
  preferredUnit?: string;
}

interface WidgetRun {
  result?: QueryResult;
  error?: string;
}

/** Grid span classes for a widget on the 1 / 2 / 4-column responsive grid. */
function spanClass(widget: DashboardWidget): string {
  if (widget.spanFull || widget.spanCols === 4) return 'md:col-span-2 xl:col-span-4';
  if (widget.spanCols === 3) return 'md:col-span-2 xl:col-span-3';
  if (widget.spanCols === 2) return 'md:col-span-2 xl:col-span-2';
  return '';
}

/**
 * DashboardView — the one dashboard renderer (#900, format locked in #899).
 * Consumes a parsed dashboard note and composes route-mode widget cards:
 * heading/paragraph markdown becomes each card's title/question, `dashboard.*`
 * tokens render as a control row, `$token` refs substitute at execution time,
 * and spans lay out on the 4-column grid. The inline note presentation stays
 * in QueryBlockView (bare charts beneath their visible markdown).
 */
export function DashboardView({
  document,
  tokenValues,
  onTokenChange,
  onEditQuery,
  rangeStart,
  rangeEnd,
  preferredUnit,
}: DashboardViewProps) {
  const values = useMemo(
    () => ({ ...defaultTokenValues(document.tokens), ...tokenValues }),
    [document.tokens, tokenValues],
  );

  // Resolve each widget's executable query & params (tokens substituted here
  // at execution time — decision #899-6).
  const resolved = useMemo(
    () =>
      document.widgets.map((widget) => {
        const { query, missing: queryMissing } = substituteTokens(widget.query, values);
        const paramSub = widget.params.map((p) => substituteTokens(p, values));
        const params = paramSub.map((s) => s.query);
        const paramMissing = paramSub.flatMap((s) => s.missing);
        const missing = [...new Set([...queryMissing, ...paramMissing])];
        return { widget, query, params, missing };
      }),
    [document.widgets, values],
  );
  const resolvedKey = useMemo(
    () => JSON.stringify(resolved.map((r) => [r.widget.key, r.query, r.params, r.missing])),
    [resolved],
  );

  const [runs, setRuns] = useState<Record<string, WidgetRun>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      const next: Record<string, WidgetRun> = {};
      const runnable: { widget: DashboardWidget; query: string }[] = [];

      for (const { widget, query, missing } of resolved) {
        if (widget.widgetError) {
          next[widget.key] = { error: widget.widgetError };
          continue;
        }
        const resolvedType = resolveWidgetType(widget.type);
        if (!isDashboardWidgetType(resolvedType)) {
          next[widget.key] = { error: unknownWidgetTypeMessage(widget.type) };
          continue;
        }
        if (missing.length > 0) {
          next[widget.key] = { error: unknownTokensMessage(missing) };
          continue;
        }
        const parsed = parseQuery(query);
        if (parsed.error) {
          next[widget.key] = { error: parsed.error };
          continue;
        }
        if (isFindQuery(parsed)) {
          next[widget.key] = { error: 'find: queries render inline in notes, not as dashboard widgets' };
          continue;
        }
        runnable.push({ widget, query });
      }

      // Lazy rollup driver (same pattern as useAnalyticsQueries): when any
      // widget consumes rollup facts, all widgets wait on the warm-up; a
      // driver failure never blocks the widgets (facts are disposable).
      const consumesRollups = runnable.some((r) => r.query.includes('calc.'));
      if (consumesRollups) {
        await ensureStoreRollupFacts().catch(() => undefined);
      }

      await Promise.all(
        runnable.map(async ({ widget, query }) => {
          try {
            next[widget.key] = {
              result: await queryService.runQuery(query, { rangeStart, rangeEnd, preferredUnit }),
            };
          } catch (err) {
            next[widget.key] = { error: err instanceof Error ? err.message : String(err) };
          }
        }),
      );

      if (!cancelled) {
        setRuns(next);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedKey, rangeStart, rangeEnd, preferredUnit]);

  return (
    <div data-testid="dashboard-view">
      <DashboardTokenControls tokens={document.tokens} values={values} onChange={onTokenChange} />

      {loading && <div className="text-sm text-muted-foreground mb-3">Loading widgets…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {resolved.map(({ widget, query, params }) => {
          const run = runs[widget.key];
          return (
            <div key={widget.key} className="relative group">
              {onEditQuery && (
                <button
                  onClick={() => onEditQuery(widget)}
                  title="Edit widget query"
                  data-testid={`edit-widget-${widget.key}`}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-card/80 border border-border text-muted-foreground hover:text-foreground hover:border-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <Edit3 size={13} />
                </button>
              )}
              <WidgetFrame
                title={widget.title ?? widget.query}
                question={widget.question ?? ''}
                query={query}
                span={spanClass(widget)}
              >
                <div
                  className={
                    widget.type === 'value' || widget.type === 'toplist' ? 'h-36' : 'h-56'
                  }
                >
                  {run?.error ? (
                    <WidgetProblemBadge message={run.error} />
                  ) : (
                    <WidgetChart
                      type={widget.type}
                      result={run?.result}
                      params={params}
                    />
                  )}
                </div>
              </WidgetFrame>
            </div>
          );
        })}
      </div>
    </div>
  );
}
