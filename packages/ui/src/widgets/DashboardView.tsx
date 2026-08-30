import { useEffect, useMemo, useState } from 'react';
import { isFindQuery, parseQuery, type QueryResult, defaultTokenValues, isDashboardWidgetType, resolveWidgetType, substituteTokens, unknownTokensMessage, unknownWidgetTypeMessage, type DashboardDocument, type DashboardWidget } from '@bitcobblers/wod-wiki-wql';
import type { QueryExecutor } from '../contracts/query';
import { WidgetFrame } from './WidgetFrame';
import { WidgetChart, WidgetProblemBadge } from './WidgetChart';
import { DashboardTokenControls } from './DashboardTokenControls';
import { WqlQueryInspectorModal } from '../blocks/WqlQueryInspectorModal';

export interface DashboardViewProps {
  /** Parsed dashboard note (buildDashboardDocument). */
  document: DashboardDocument;
  /** Injected QueryExecutor for executing WQL queries. Zero singleton coupling. */
  executor?: QueryExecutor;
  /** Optional rollup fact warmer callback. */
  onEnsureRollupFacts?: () => Promise<void>;
  /** Current token values; defaults to each token's declared default. */
  tokenValues?: Record<string, string>;
  /** Present when the note is editable — control changes write back to frontmatter. */
  onTokenChange?: (name: string, value: string) => void;
  /** Present when the host saves widget query edits — the composer modal lives here (view-first cards, hover edit). */
  onSaveWidgetQuery?: (widget: DashboardWidget, nextQuery: string) => void;
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
  const resolved = resolveWidgetType(widget.type);
  if (resolved === 'value') return 'col-span-1';
  if (resolved === 'table') return 'col-span-1 md:col-span-2';
  return 'col-span-1 md:col-span-2 lg:col-span-4';
}

/**
 * DashboardView — the state-free dashboard renderer (#900, format locked in #899).
 *
 * Takes a parsed DashboardDocument + current token values, runs all widget
 * queries concurrently via the injected QueryExecutor, and renders the responsive CSS grid.
 */
export function DashboardView({
  document,
  executor,
  onEnsureRollupFacts,
  tokenValues,
  onTokenChange,
  onSaveWidgetQuery,
  rangeStart,
  rangeEnd,
  preferredUnit,
}: DashboardViewProps) {
  const values = useMemo(
    () => ({ ...defaultTokenValues(document.tokens), ...tokenValues }),
    [document.tokens, tokenValues],
  );

  const resolved = useMemo(
    () =>
      document.widgets.map((widget) => {
        const { query, missing } = substituteTokens(widget.query, values);
        return { widget, query, missing };
      }),
    [document.widgets, values],
  );

  const [runs, setRuns] = useState<Record<string, WidgetRun>>({});
  // Widget currently open in the edit-composer modal; carries the raw
  // (token-bearing) query so Apply writes the parametrized WQL back.
  const [editing, setEditing] = useState<DashboardWidget | null>(null);
  const [loading, setLoading] = useState(true);

  const resolvedKey = useMemo(
    () => resolved.map((r) => `${r.widget.key}:${r.query}`).join('|'),
    [resolved],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      const next: Record<string, WidgetRun> = {};
      const runnable: Array<{ widget: DashboardWidget; query: string }> = [];

      for (const { widget, query, missing } of resolved) {
        if (widget.type !== '' && !isDashboardWidgetType(widget.type)) {
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

      if (!executor) {
        if (!cancelled) {
          setRuns(next);
          setLoading(false);
        }
        return;
      }

      const consumesRollups = runnable.some((r) => r.query.includes('calc.'));
      if (consumesRollups && onEnsureRollupFacts) {
        await onEnsureRollupFacts().catch(() => undefined);
      }

      await Promise.all(
        runnable.map(async ({ widget, query }) => {
          try {
            next[widget.key] = {
              result: await executor.runQuery(query, { rangeStart, rangeEnd, preferredUnit }),
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
  }, [resolvedKey, executor, onEnsureRollupFacts, rangeStart, rangeEnd, preferredUnit]);

  return (
    <div data-testid="dashboard-view">
      <DashboardTokenControls tokens={document.tokens} values={values} onChange={onTokenChange} />

      {loading && <div className="text-sm text-muted-foreground mb-3">Loading widgets…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {resolved.map(({ widget, query }) => {
          const run = runs[widget.key];
          return (
            <WidgetFrame
              key={widget.key}
              title={widget.title ?? ''}
              question={widget.question ?? ''}
              query={query}
              span={spanClass(widget)}
              onEdit={onSaveWidgetQuery ? () => setEditing(widget) : undefined}
            >
              {run?.error ? (
                <WidgetProblemBadge message={run.error} />
              ) : (
                <WidgetChart
                  type={widget.type}
                  result={run?.result}
                  label={widget.title}
                  unit={preferredUnit}
                  params={widget.params}
                />
              )}
            </WidgetFrame>
          );
        })}
      </div>

      {onSaveWidgetQuery && (
        <WqlQueryInspectorModal
          isOpen={editing !== null}
          onClose={() => setEditing(null)}
          initialQuery={editing?.query ?? ''}
          executor={executor}
          title="Edit Widget Query"
          subtitle={editing?.title ? `Use the Omni-Composer to edit "${editing.title}".` : undefined}
          applyLabel="Apply to Widget"
          onApply={(nextQuery) => {
            if (editing) onSaveWidgetQuery(editing, nextQuery);
          }}
        />
      )}
    </div>
  );
}
