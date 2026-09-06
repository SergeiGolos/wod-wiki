/**
 * Structured metric composer for the parser-test builder: pick a type (from
 * the MetricType vocabulary + the current statement's actual metrics), pick
 * an origin, edit a kind-aware value (number/clock, text, amount+unit,
 * object fields, `?`), optionally prefill any actual metric, and submit the
 * composed DSL line. The live preview is validated with the same
 * `parseMetricLine` the runner uses, so submit is always a parseable line.
 */

import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { MetricType, renderMetric } from '@bitcobblers/wod-wiki-engine';
import {
  ORIGIN_SUGGESTIONS,
  collectMetricOrigins,
  collectMetricTypes,
  composeDsl,
  metricToComposer,
  type ComposerMetric,
  type ComposerValueKind,
} from './dslComposer';

const KINDS: Array<{ kind: ComposerValueKind; label: string }> = [
  { kind: 'number', label: 'number / time' },
  { kind: 'text', label: 'text' },
  { kind: 'amount-unit', label: 'amount + unit' },
  { kind: 'fields', label: 'fields' },
  { kind: 'undefined', label: 'any (?)*' },
];

const INPUT_CLASS =
  'rounded border border-slate-300 dark:border-slate-600 bg-transparent px-1.5 py-0.5 font-mono text-[11px]';
const BUTTON_CLASS =
  'rounded border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800';

export interface MetricComposerProps {
  /** null = fresh metric; otherwise a draft to edit (add or chip edit). */
  initial: ComposerMetric | null;
  /** The paired statement's actual metrics — the "current structure". */
  actualMetrics: readonly IMetric[];
  submitLabel: string;
  /** Return a validation error string, or null on success (parent closes). */
  onSubmit: (dsl: string) => string | null;
  onCancel: () => void;
  testId?: string;
}

/** Compose one expectation metric from structured parts instead of raw DSL text. */
export function MetricComposer({
  initial,
  actualMetrics,
  submitLabel,
  onSubmit,
  onCancel,
  testId = 'metric-composer',
}: MetricComposerProps) {
  const [draft, setDraft] = useState<ComposerMetric>(
    initial ?? { type: '', kind: 'number', number: '' },
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const datalistId = useId();

  const set = (patch: Partial<ComposerMetric>) => setDraft((prev) => ({ ...prev, ...patch }));

  let preview: string | null = null;
  let previewError: string | null = null;
  try {
    preview = composeDsl(draft);
  } catch (e) {
    previewError = e instanceof Error ? e.message : String(e);
  }

  const submit = () => {
    if (previewError) return;
    const err = onSubmit(preview!);
    if (err) setSubmitError(err);
  };

  return (
    <div
      className="mt-2 space-y-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 p-2"
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={draft.type}
          onChange={(e) => set({ type: e.target.value })}
          list={datalistId}
          placeholder="type — e.g. rep"
          aria-label="Metric type"
          className={`${INPUT_CLASS} w-36`}
          data-testid="composer-type"
        />
        <datalist id={datalistId}>
          {collectMetricTypes(actualMetrics).map((t) => (
            <option key={`s-${t}`} value={t} />
          ))}
          {Object.values(MetricType).map((t) => (
            <option key={`e-${t}`} value={t} />
          ))}
        </datalist>
        <select
          value={draft.origin ?? ''}
          onChange={(e) => set({ origin: e.target.value || undefined })}
          aria-label="Metric origin"
          className={INPUT_CLASS}
          data-testid="composer-origin"
        >
          <option value="">any origin</option>
          {[...ORIGIN_SUGGESTIONS, ...collectMetricOrigins(actualMetrics)]
            .filter((o, i, all) => all.indexOf(o) === i)
            .map((o) => (
              <option key={o} value={o}>
                @{o}
              </option>
            ))}
        </select>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={submit}
            disabled={previewError !== null}
            className={`${BUTTON_CLASS} disabled:opacity-40`}
            data-testid="composer-submit"
          >
            {submitLabel}
          </button>
          <button type="button" onClick={onCancel} className={BUTTON_CLASS} aria-label="Cancel metric edit">
            <X size={11} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {KINDS.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            onClick={() => set({ kind })}
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              draft.kind === kind
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
            }`}
            data-testid={`composer-kind-${kind}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1" data-testid="composer-value">
        {draft.kind === 'number' && (
          <input
            value={draft.number ?? ''}
            onChange={(e) => set({ number: e.target.value })}
            placeholder="90 or 1:30"
            aria-label="Numeric or clock value"
            className={`${INPUT_CLASS} w-28`}
          />
        )}
        {draft.kind === 'text' && (
          <input
            value={draft.text ?? ''}
            onChange={(e) => set({ text: e.target.value })}
            placeholder="value — quoted automatically if it has spaces"
            aria-label="Text value"
            className={`${INPUT_CLASS} w-56`}
          />
        )}
        {draft.kind === 'amount-unit' && (
          <>
            <input
              value={draft.amount ?? ''}
              onChange={(e) => set({ amount: e.target.value })}
              placeholder="225"
              aria-label="Amount"
              className={`${INPUT_CLASS} w-20`}
            />
            <input
              value={draft.unit ?? ''}
              onChange={(e) => set({ unit: e.target.value })}
              placeholder="lb"
              aria-label="Unit"
              className={`${INPUT_CLASS} w-16`}
            />
          </>
        )}
        {draft.kind === 'fields' && (
          <div className="space-y-1">
            {(draft.fields ?? []).map((field, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  value={field.key}
                  onChange={(e) =>
                    set({ fields: (draft.fields ?? []).map((f, j) => (j === i ? { ...f, key: e.target.value } : f)) })
                  }
                  placeholder="key"
                  aria-label={`Field ${i + 1} key`}
                  className={`${INPUT_CLASS} w-28`}
                />
                <span className="text-slate-400">:</span>
                <input
                  value={field.value}
                  onChange={(e) =>
                    set({ fields: (draft.fields ?? []).map((f, j) => (j === i ? { ...f, value: e.target.value } : f)) })
                  }
                  placeholder="value"
                  aria-label={`Field ${i + 1} value`}
                  className={`${INPUT_CLASS} w-32`}
                />
                <button
                  type="button"
                  onClick={() => set({ fields: (draft.fields ?? []).filter((_, j) => j !== i) })}
                  className="text-slate-400 hover:text-red-500"
                  aria-label={`Remove field ${i + 1}`}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set({ fields: [...(draft.fields ?? []), { key: '', value: '' }] })}
              className={BUTTON_CLASS}
            >
              + field
            </button>
          </div>
        )}
        {draft.kind === 'undefined' && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            `?` — the value is athlete-fillable; only the type is asserted.
          </span>
        )}
      </div>

      {actualMetrics.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">from actual:</span>
          {actualMetrics.map((metric, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setDraft(metricToComposer(metric))}
              className={`${BUTTON_CLASS} font-mono text-[10px]`}
              title="Load this actual metric into the composer"
              data-testid={`composer-from-actual-${i}`}
            >
              {renderMetric(metric)}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span
          className={`rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 font-mono text-[11px] ${
            previewError ? 'text-red-600 dark:text-red-400' : ''
          }`}
          data-testid="composer-preview"
        >
          {previewError ?? preview}
        </span>
        {submitError && <span className="text-[10px] text-red-600 dark:text-red-400">{submitError}</span>}
      </div>
    </div>
  );
}
