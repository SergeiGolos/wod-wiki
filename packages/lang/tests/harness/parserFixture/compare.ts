/**
 * Semantic comparator for parser fixtures (spec: wayfinder
 * test-validation-harness asset 001).
 *
 * Match rules per metric line: canonical kebab type equality, literal check
 * (number / string / amount+unit sugar / object tails), origin pinned only
 * when written. Always ignored: timestamp, sourceBlockKey, image, name,
 * metadata, action.
 *
 * Modes: `closed` = exact multiset (extra actual metric fails);
 * `subset` = every expectation matches, extras pass. When an expectation
 * fails to match, its diff already names what the statement carries, so
 * leftover actuals are only reported when every expectation matched.
 */

import type { IMetric } from '@bitcobblers/wod-wiki-core';
import type { MetricLine } from './metricLine';
import { canonicalizeType } from './metricLine';

export type MatchMode = 'closed' | 'subset';

/** Render an actual metric in DSL-like form for readable diagnostics. */
export function renderMetric(m: IMetric): string {
  const type = canonicalizeType(String(m.type));
  const cap = type.charAt(0).toUpperCase() + type.slice(1);
  const origin = m.origin ? ` @${m.origin}` : '';
  if (m.value !== null && typeof m.value === 'object') {
    const inner = Object.entries(m.value as Record<string, unknown>)
      .map(([k, v]) => `${k}:${String(v)}`)
      .join(' ');
    return `${cap} ${inner}${origin}`;
  }
  if (typeof m.value === 'string') {
    return m.value.includes(' ')
      ? `${cap} "${m.value}"${origin}`
      : `${cap} ${m.value}${origin}`;
  }
  return `${cap} ${String(m.value)}${origin}`;
}

function literalMatches(line: MetricLine, metric: IMetric): boolean {
  const value = metric.value;
  switch (line.kind) {
    case 'number':
      return typeof value === 'number' && value === line.value;
    case 'undefined':
      return metric.value === undefined;
    case 'string':
      return value === line.value;
    case 'amountUnit': {
      if (value === null || typeof value !== 'object') return false;
      const v = value as { amount?: unknown; unit?: unknown };
      return v.amount === line.amount && v.unit === line.unit && metric.unit === line.unit;
    }
    case 'object': {
      if (value === null || typeof value !== 'object') return false;
      const obj = value as Record<string, unknown>;
      return Object.entries(line.fields ?? {}).every(([k, expected]) => {
        const actual = obj[k];
        if (typeof actual === 'number' && typeof expected === 'number') {
          return actual === expected;
        }
        return String(actual) === String(expected);
      });
    }
  }
}

function lineMatches(line: MetricLine, metric: IMetric): boolean {
  if (canonicalizeType(String(metric.type)) !== line.type) return false;
  if (line.origin !== undefined && metric.origin !== line.origin) return false;
  return literalMatches(line, metric);
}

/**
 * Compare one statement's expectations against its actual metrics.
 * Returns human-readable diffs (empty = pass).
 */
export function compareStatement(
  expectations: MetricLine[],
  actual: readonly IMetric[],
  mode: MatchMode,
): string[] {
  const diffs: string[] = [];
  const remaining = [...actual];
  let unmatched = 0;

  for (const line of expectations) {
    const hit = remaining.findIndex((m) => lineMatches(line, m));
    if (hit === -1) {
      unmatched += 1;
      const present = remaining.map(renderMetric).join('; ') || 'nothing';
      diffs.push(`unmatched expectation ${line.source} — statement carries: ${present}`);
    } else {
      remaining.splice(hit, 1);
    }
  }

  if (mode === 'closed' && unmatched === 0) {
    for (const m of remaining) {
      diffs.push(`unexpected metric ${renderMetric(m)} — not in the Expected block`);
    }
  }

  return diffs;
}
