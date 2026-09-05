/**
 * Structured metric composer model: converts between the expectation DSL
 * (`Rep 10 @parser`, `Resistance 225 lb`, `ClimbGrade raw:V5 system:v-scale`)
 * and a kind-aware draft shape the MetricComposer UI edits. Pure — no React.
 *
 * composeDsl output must always re-parse through `parseMetricLine`
 * (enforced by parserTestComposer.test.ts), so what the composer builds is
 * exactly what the runner compares.
 */

import type { IMetric, ICodeStatement } from '@bitcobblers/wod-wiki-engine';
import { parseMetricLine } from '@bitcobblers/wod-wiki-engine';

/** Source origins worth pinning in expectations; unpinned matches any origin. */
export const ORIGIN_SUGGESTIONS = ['parser', 'compiler', 'dialect', 'runtime', 'user'] as const;

const TIME_INPUT_RE = /^\d{1,2}(:\d{2}){1,2}$/;
const NUMBER_INPUT_RE = /^-?\d+(\.\d+)?$/;
const FIELD_KEY_RE = /^[\w-]+$/;

export type ComposerValueKind = 'number' | 'text' | 'amount-unit' | 'fields' | 'undefined';

export interface ComposerField {
  key: string;
  value: string;
}

/**
 * One metric draft. `number` kind holds a display form that is either a raw
 * number (`90`) or a clock literal (`1:30` → ms), mirroring the DSL.
 */
export interface ComposerMetric {
  type: string;
  kind: ComposerValueKind;
  number?: string;
  text?: string;
  amount?: string;
  unit?: string;
  fields?: ComposerField[];
  origin?: string;
}

/**
 * Display form of a canonical kebab type — first letter capitalized, matching
 * `renderMetric` and the fixture convention (`rep` → `Rep`). canonicalizeType
 * makes both forms equal at compare time; the composer just keeps chips
 * looking like the fixture catalog.
 */
function displayType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/** ms → `m:ss` / `h:mm:ss` when the value is whole seconds, else null. */
export function toTimeText(ms: number): string | null {
  if (!Number.isFinite(ms) || ms < 0 || ms % 1000 !== 0) return null;
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

function quoteValue(text: string): string {
  return /\s/.test(text) ? JSON.stringify(text) : text;
}

function composeField(field: ComposerField): string {
  if (!FIELD_KEY_RE.test(field.key)) {
    throw new Error(`field key must be [\\w-]+ (got: ${JSON.stringify(field.key)})`);
  }
  return `${field.key}:${quoteValue(field.value)}`;
}

/** Build the DSL line for a draft. Throws with a human-readable message when invalid. */
export function composeDsl(draft: ComposerMetric): string {
  const rawType = draft.type.trim();
  if (!rawType || /\s/.test(rawType)) {
    throw new Error('metric type is required and cannot contain spaces');
  }
  const type = displayType(rawType);
  let body: string;
  switch (draft.kind) {
    case 'number': {
      const value = (draft.number ?? '').trim();
      if (!TIME_INPUT_RE.test(value) && !NUMBER_INPUT_RE.test(value)) {
        throw new Error('numeric value must be a plain number (90) or clock literal (1:30)');
      }
      body = value;
      break;
    }
    case 'text': {
      const text = draft.text ?? '';
      if (!text.trim()) throw new Error('text value is required');
      body = quoteValue(text);
      break;
    }
    case 'amount-unit': {
      const amount = (draft.amount ?? '').trim();
      const unit = (draft.unit ?? '').trim();
      if (!NUMBER_INPUT_RE.test(amount)) throw new Error('amount must be a plain number');
      if (!unit || /\s/.test(unit)) throw new Error('unit is a single token (e.g. lb, km)');
      body = `${amount} ${unit}`;
      break;
    }
    case 'fields': {
      const pairs = (draft.fields ?? []).filter((f) => f.key.trim() || f.value.trim());
      if (pairs.length === 0) throw new Error('at least one key:value field is required');
      body = pairs.map(composeField).join(' ');
      break;
    }
    case 'undefined':
      body = '?';
      break;
  }
  return `${type} ${body}${draft.origin ? ` @${draft.origin}` : ''}`;
}

/** Parse one DSL line into a draft; throws FixtureSyntaxError on bad grammar. */
export function decomposeDsl(dsl: string): ComposerMetric {
  const line = parseMetricLine(dsl.startsWith('- ') ? dsl : `- ${dsl}`, 'composer', 0);
  const base: ComposerMetric = {
    type: displayType(line.type),
    kind: 'undefined',
    ...(line.origin ? { origin: line.origin } : {}),
  };
  switch (line.kind) {
    case 'number': {
      const ms = typeof line.value === 'number' ? line.value : NaN;
      base.kind = 'number';
      base.number = toTimeText(ms) ?? String(line.value);
      return base;
    }
    case 'string':
      base.kind = 'text';
      base.text = String(line.value);
      return base;
    case 'amountUnit':
      base.kind = 'amount-unit';
      base.amount = String(line.amount);
      base.unit = line.unit;
      return base;
    case 'object':
      base.kind = 'fields';
      base.fields = Object.entries(line.fields ?? {}).map(([key, value]) => ({ key, value: String(value) }));
      return base;
    case 'undefined':
      return base;
  }
}

/** Actual metric → editable draft ("compose from the current structure"). */
export function metricToComposer(metric: IMetric): ComposerMetric {
  const base: ComposerMetric = {
    type: displayType(String(metric.type)),
    kind: 'undefined',
    ...(metric.origin ? { origin: String(metric.origin) } : {}),
  };
  const value = metric.value;
  if (value === undefined || value === null) return base;
  if (typeof value === 'number') {
    base.kind = 'number';
    base.number = toTimeText(value) ?? String(value);
    return base;
  }
  if (typeof value === 'string') {
    base.kind = 'text';
    base.text = value;
    return base;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // Canonical amount+unit sugar (`Resistance 225 lb`): the comparator asserts
    // value.amount/value.unit AND metric.unit together, so only offer the
    // sugar form when the top-level unit backs it; otherwise use object tails.
    if (typeof obj.amount === 'number' && typeof obj.unit === 'string' && metric.unit === obj.unit) {
      base.kind = 'amount-unit';
      base.amount = String(obj.amount);
      base.unit = obj.unit;
      return base;
    }
    base.kind = 'fields';
    base.fields = Object.entries(obj).map(([key, v]) => ({ key, value: String(v) }));
    return base;
  }
  base.kind = 'text';
  base.text = String(value);
  return base;
}

/** Metric vocabulary observed on one statement — the composer's type datalist. */
export function collectMetricTypes(metrics: readonly IMetric[]): string[] {
  const seen: Record<string, true> = {};
  const types: string[] = [];
  for (const metric of metrics) {
    const type = String(metric.type);
    if (!seen[type]) {
      seen[type] = true;
      types.push(type);
    }
  }
  return types;
}

/** Origins observed on one statement — merged into the composer's origin picker. */
export function collectMetricOrigins(metrics: readonly IMetric[]): string[] {
  const seen: Record<string, true> = {};
  const origins: string[] = [];
  for (const metric of metrics) {
    const origin = metric.origin ? String(metric.origin) : '';
    if (origin && !seen[origin]) {
      seen[origin] = true;
      origins.push(origin);
    }
  }
  return origins;
}

/** Metric vocabulary observed across a whole parse. */
export function collectTypeSuggestions(statements: readonly ICodeStatement[]): string[] {
  return collectMetricTypes(statements.flatMap((statement) => statement.metrics.getAll()));
}

/** Origins observed across a whole parse. */
export function collectOriginSuggestions(statements: readonly ICodeStatement[]): string[] {
  return collectMetricOrigins(statements.flatMap((statement) => statement.metrics.getAll()));
}
