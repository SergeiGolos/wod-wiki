/**
 * WidgetComposerDialog — the ONE focused authoring flow for dashboard
 * widgets, shared by every entry point:
 *
 *  - Explorer Save → "Add to dashboard" (QueryToDashboardDialog wraps this,
 *    adding the destination picker and persistence).
 *  - Dashboard page "Add widget".
 *  - Dashboard page widget Edit (seeded from the existing widget).
 *  - Prebuilt "Inspect" — read-only: the composed query and a live preview,
 *    no Apply; the host offers "Clone to vault" via `footerExtra`.
 *
 * Steps: dataset (the subset, read-only) → calculation (the advanced
 * WqlComposer — the full pill model stays available) → visualization
 * (type + grid span) → preview → apply. The preview executes through the
 * injected executor with the SAME range/unit options the dashboard grid
 * uses, and substitutes the board's current token values — what the preview
 * shows is what the widget will render.
 *
 * Mounted in MobileActions' EditorDialog (keyboard-aware, mobile
 * full-screen) — no second dialog system.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  EditorDialog,
  WidgetChart,
  WqlComposer,
  type QueryExecutor,
} from '@bitcobblers/wod-wiki-ui';
import { parseQuery, isFindQuery, isRowsQuery, type QueryResult } from '@bitcobblers/wod-wiki-engine';
import {
  DASHBOARD_WIDGET_TYPES,
  substituteTokens,
  unknownTokensMessage,
} from '@/lib/dashboard/model';

export interface WidgetComposerApply {
  title?: string;
  question?: string;
  type: string;
  spanCols?: number;
  spanFull?: boolean;
  wql: string;
  params?: string[];
}

export interface WidgetComposerDialogProps {
  open: boolean;
  onClose: () => void;
  /** add = blank widget; edit = seeded from a widget; inspect = read-only. */
  mode: 'add' | 'edit' | 'inspect';
  /** Seed WQL for the calculation composer. */
  initialWql: string;
  /** Seed display fields (edit/inspect of an existing widget). */
  initial?: {
    title?: string;
    question?: string;
    type?: string;
    spanCols?: number;
    spanFull?: boolean;
    params?: string[];
  };
  /**
   * The dataset step: the subset WQL this calculation joins, shown
   * read-only. Pass `null` to render the "whole store" note; omit the prop
   * to hide the step (dashboard-page Add has no subset).
   */
  subsetQuery?: string | null;
  /**
   * Optional destination step (the Explorer's save flow injects its
   * choose/create-dashboard picker here) — rendered between the dataset and
   * the calculation.
   */
  destination?: ReactNode;
  /** Preview execution — same executor + range/unit context as the board. */
  executor?: QueryExecutor;
  rangeStart?: number;
  rangeEnd?: number;
  preferredUnit?: string;
  /** Board token values for preview substitution (execution-time context). */
  tokenValues?: Record<string, string>;
  /** Absent in inspect mode — the footer hides Apply. */
  onApply?: (spec: WidgetComposerApply) => void | Promise<void>;
  /** Extra footer content (e.g. the prebuilt "Clone to vault" action). */
  footerExtra?: ReactNode;
  applyLabel?: string;
}

const SPAN_OPTIONS = [
  { label: 'Auto', spanCols: undefined, spanFull: false },
  { label: '1 col', spanCols: 1, spanFull: false },
  { label: '2 cols', spanCols: 2, spanFull: false },
  { label: '4 cols', spanCols: 4, spanFull: false },
  { label: 'Full row', spanCols: undefined, spanFull: true },
] as const;

const PREVIEW_DEBOUNCE_MS = 300;

export function WidgetComposerDialog({ open, ...props }: WidgetComposerDialogProps) {
  // Gated at this level so every opening mounts a FRESH session — no draft
  // state (query, title, span, preview) can leak across widgets or queries.
  if (!open) return null;
  return <ComposerSession {...props} />;
}

function ComposerSession({
  onClose,
  mode,
  initialWql,
  initial,
  subsetQuery,
  destination,
  executor,
  rangeStart,
  rangeEnd,
  preferredUnit,
  tokenValues,
  onApply,
  footerExtra,
  applyLabel = mode === 'edit' ? 'Apply changes' : 'Add widget',
}: Omit<WidgetComposerDialogProps, 'open'>) {
  const readOnly = mode === 'inspect';
  const [wql, setWql] = useState(initialWql);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [question, setQuestion] = useState(initial?.question ?? '');
  // The select speaks resolved types ('table'); a bare ```query fence (raw
  // '') IS the table default — '' would leave the select uncontrolled-blank.
  const [type, setType] = useState(initial?.type || 'table');
  const [span, setSpan] = useState<{ spanCols?: number; spanFull?: boolean }>({
    spanCols: initial?.spanCols,
    spanFull: initial?.spanFull,
  });
  const [paramsText, setParamsText] = useState((initial?.params ?? []).join(' '));
  const [applying, setApplying] = useState(false);
  // A refused write (e.g. the note changed while this dialog was open) stays
  // on screen; the draft is untouched and the author can retry or cancel.
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseQuery(wql.trim()), [wql]);
  const widgetReady =
    !parsed.error && !isFindQuery(parsed) && !isRowsQuery(parsed) && wql.trim() !== '';

  // Preview: execute through the board's executor with the board's
  // range/unit context and token substitution — matching what the widget
  // itself will do on the grid.
  const [preview, setPreview] = useState<
    | { status: 'idle' | 'loading' }
    | { status: 'ok'; result: QueryResult }
    | { status: 'error'; message: string }
    | { status: 'blocked'; message: string }
  >({ status: 'idle' });
  const previewSeq = useRef(0);

  useEffect(() => {
    if (!widgetReady || !executor) {
      setPreview({ status: 'idle' });
      return;
    }
    const substituted = substituteTokens(wql.trim(), tokenValues ?? {});
    if (substituted.missing.length > 0) {
      setPreview({ status: 'blocked', message: unknownTokensMessage(substituted.missing) });
      return;
    }
    const seq = ++previewSeq.current;
    setPreview({ status: 'loading' });
    const timer = setTimeout(() => {
      executor
        .runQuery(substituted.query, { rangeStart, rangeEnd, preferredUnit })
        .then((result) => {
          if (previewSeq.current === seq) setPreview({ status: 'ok', result });
        })
        .catch((err: unknown) => {
          if (previewSeq.current === seq) {
            setPreview({ status: 'error', message: err instanceof Error ? err.message : String(err) });
          }
        });
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [wql, widgetReady, executor, rangeStart, rangeEnd, preferredUnit, tokenValues]);

  const handleApply = async () => {
    if (!widgetReady || !onApply || applying) return;
    setApplying(true);
    setError(null);
    try {
      await onApply({
        title: title.trim() || undefined,
        question: question.trim() || undefined,
        // 'table' is the bare-fence default — don't churn ```query into
        // ```query:table when the author never touched the type.
        type: type === 'table' ? '' : type,
        spanCols: span.spanFull ? undefined : span.spanCols,
        spanFull: span.spanFull || undefined,
        wql: wql.trim(),
        params: paramsText.trim() === '' ? undefined : paramsText.trim().split(/\s+/),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  };

  return (
    <EditorDialog
      open
      onClose={onClose}
      title={mode === 'inspect' ? 'Inspect widget' : mode === 'edit' ? 'Edit widget' : 'Add widget'}
      description={
        readOnly
          ? 'Read-only — clone the dashboard to edit this widget.'
          : 'Dataset, calculation, visualization, preview — then apply.'
      }
      footer={
        readOnly && !footerExtra ? undefined : (
          <>
            {footerExtra}
            <div className="flex-1" />
            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="widget-composer-apply"
                  disabled={!widgetReady || applying}
                  title={parsed.error ? parsed.error : undefined}
                  onClick={() => void handleApply()}
                  className="px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow transition-colors"
                >
                  {applying ? 'Applying…' : applyLabel}
                </button>
              </>
            )}
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {subsetQuery !== undefined && (
          <section>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Dataset — the subset
            </div>
            {subsetQuery ? (
              <code
                className="block rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground break-all"
                data-testid="widget-composer-subset"
              >
                {subsetQuery}
              </code>
            ) : (
              <p className="text-xs text-muted-foreground" data-testid="widget-composer-subset">
                No subset — the calculation runs over the whole store.
              </p>
            )}
          </section>
        )}

        {destination}

        <section>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Calculation
          </div>
          {readOnly ? (
            <code
              className="block rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground break-all"
              data-testid="widget-composer-query"
            >
              {wql}
            </code>
          ) : (
            <WqlComposer
              initialQuery={initialWql}
              onQueryChange={setWql}
              autoFocus
              showDiagnostics
              {...(executor ? { execute: (ast) => executor.runQuery(ast.raw, { rangeStart, rangeEnd, preferredUnit }) } : {})}
            />
          )}
          {!readOnly && wql.trim() !== '' && (
            <code
              className="mt-1.5 block rounded-md border border-primary/30 bg-primary/[0.04] px-3 py-2 font-mono text-xs text-foreground break-all"
              data-testid="widget-composer-wql"
            >
              {wql.trim()}
            </code>
          )}
        </section>

        {!readOnly && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Title
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Weekly volume"
                data-testid="widget-composer-title"
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Coaching question <span className="normal-case font-normal">(optional)</span>
              </span>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="How much work per week?"
                data-testid="widget-composer-question"
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Visualization
              </span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                data-testid="widget-composer-type"
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
              >
                {DASHBOARD_WIDGET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Size
              </span>
              <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1 self-start">
                {SPAN_OPTIONS.map((option) => {
                  const active = option.spanFull
                    ? span.spanFull === true
                    : option.spanCols == null
                      ? !span.spanFull && span.spanCols == null
                      : !span.spanFull && span.spanCols === option.spanCols;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setSpan(
                          option.spanFull
                            ? { spanFull: true }
                            : { spanCols: option.spanCols },
                        )
                      }
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Parameters <span className="normal-case font-normal">(goal targets, space-separated)</span>
              </span>
              <input
                type="text"
                value={paramsText}
                onChange={(e) => setParamsText(e.target.value)}
                placeholder="300 200"
                data-testid="widget-composer-params"
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
              />
            </label>
          </section>
        )}

        {readOnly && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px]">Title</span>
              <div className="text-foreground">{initial?.title || '—'}</div>
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px]">Question</span>
              <div className="text-foreground">{initial?.question || '—'}</div>
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px]">Type</span>
              <div className="font-mono text-foreground">{type || 'table'}</div>
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px]">Size</span>
              <div className="font-mono text-foreground">
                {initial?.spanFull ? 'full row' : initial?.spanCols ? `${initial.spanCols} cols` : 'default'}
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Preview
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-3 h-56 overflow-hidden">
            {preview.status === 'idle' &&
              (widgetReady ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Preview runs as you compose…
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-destructive font-mono px-4 text-center">
                  {parsed.error
                    ? parsed.error
                    : isFindQuery(parsed) || isRowsQuery(parsed)
                      ? 'find:/rows: queries render inline in notes — widgets take an aggregate calculation.'
                      : 'Compose a calculation to preview.'}
                </div>
              ))}
            {preview.status === 'loading' && (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Running preview…
              </div>
            )}
            {preview.status === 'blocked' && (
              <div className="h-full flex items-center justify-center text-xs text-destructive font-mono px-4 text-center">
                {preview.message}
              </div>
            )}
            {preview.status === 'error' && (
              <div className="h-full flex items-center justify-center text-xs text-destructive font-mono px-4 text-center">
                {preview.message}
              </div>
            )}
            {preview.status === 'ok' && (
              <WidgetChart
                type={type}
                result={preview.result}
                label={title.trim() || undefined}
                unit={preferredUnit}
                params={paramsText.trim() === '' ? undefined : paramsText.trim().split(/\s+/)}
              />
            )}
          </div>
        </section>

        {error && (
          <p
            role="alert"
            data-testid="widget-composer-error"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive font-mono"
          >
            {error}
          </p>
        )}
      </div>
    </EditorDialog>
  );
}
