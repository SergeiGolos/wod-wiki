/**
 * WQL — Wod Query Language (Datadog-flavored). See CONTEXT.md glossary.
 *
 *   <aggregator>:<metric.namespace>{<tag filters>} by {<dimensions>} .rollup(<period>)
 *
 *   sum:totalVolume{discipline:strength} by {week}.rollup(1w)
 *   avg:tis{effort:thruster,!discipline:recovery} by {session}
 *
 * This module holds the AST shape and the reference string parser. The
 * Query Service executes the AST; the Lezer grammar (WQL grammar ticket)
 * replaces the string front-end and MUST produce this exact AST shape.
 *
 * Semantics reference: the dashboard POC's hand-rolled engine
 * (wod-wiki-dashboard-poc/app/src/lib/wql.ts) — behavior locked there,
 * retargeted here at Canonical Metric Keys and real fact rows.
 */

export type Aggregator = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'last' | 'delta';

export interface TagFilter {
  key: string;
  value: string;
  negate: boolean;
  wildcard: boolean;
}

export interface ParsedQuery {
  raw: string;
  agg: Aggregator;
  /** Canonical Metric Key (fact row `metricKey`). */
  metric: string;
  filters: TagFilter[];
  /** Tag keys, or virtual dims: day | week | session | round. */
  groupBy: string[];
  rollup?: { size: number; unit: 'd' | 'w' };
  error?: string;
}

export interface SeriesPoint { ts: number; value: number }
export interface Series { key: string; label: string; points: SeriesPoint[] }

const AGGS: Aggregator[] = ['sum', 'avg', 'min', 'max', 'count', 'last', 'delta'];

export function parseQuery(raw: string): ParsedQuery {
  const base: ParsedQuery = { raw, agg: 'sum', metric: '', filters: [], groupBy: [] };
  const text = raw.trim();

  // .rollup(1w)
  let rest = text;
  const rollupMatch = rest.match(/\.rollup\((\d+)([dw])\)\s*$/);
  if (rollupMatch) {
    base.rollup = { size: parseInt(rollupMatch[1], 10), unit: rollupMatch[2] as 'd' | 'w' };
    rest = rest.slice(0, rollupMatch.index).trim();
  }

  // by {dims}
  const byMatch = rest.match(/\s+by\s*\{([^}]*)\}\s*$/);
  if (byMatch) {
    base.groupBy = byMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
    rest = rest.slice(0, byMatch.index).trim();
  }

  // {filters}
  const filterMatch = rest.match(/\{([^}]*)\}\s*$/);
  if (filterMatch) {
    base.filters = filterMatch[1].split(',').map((s) => s.trim()).filter(Boolean).map((f) => {
      const negate = f.startsWith('!');
      const body = negate ? f.slice(1) : f;
      const [key, value = ''] = body.split(':').map((s) => s.trim());
      return { key, value: value.replace(/\*$/, ''), negate, wildcard: value.endsWith('*') };
    });
    rest = rest.slice(0, filterMatch.index).trim();
  }

  // agg:metric
  const head = rest.match(/^(\w+):([\w.]+)$/);
  if (!head) {
    base.error = `Cannot parse "${text}". Expected agg:metric{filters} by {dims} .rollup(period)`;
    return base;
  }
  if (!AGGS.includes(head[1] as Aggregator)) {
    base.error = `Unknown aggregator "${head[1]}". Try: ${AGGS.join(', ')}`;
    return base;
  }
  base.agg = head[1] as Aggregator;
  base.metric = head[2];
  return base;
}
