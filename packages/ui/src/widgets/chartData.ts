import type { AnyParsedQuery, QueryResult, Series, TabularResult } from '@bitcobblers/wod-wiki-wql';

export interface MergedPoint {
  ts: number;
  [label: string]: number | string;
}

/**
 * Adapter — pipeline/document outputs ride the QueryResult shape the widget
 * renderers already consume. The `parsed` union widens to the aggregate
 * member: chart renderers read only `error`/`family` off it, never metric
 * fields of the narrower members.
 */
export function toChartResult(input: {
  parsed: AnyParsedQuery;
  series?: Series[];
  unit?: string;
  error?: string;
  table?: TabularResult;
}): QueryResult {
  // Presentation-union cast (AnyParsedQuery → aggregate member): renderers
  // consume `.error`/`.family` only; the raw query text stays intact.
  const parsed = input.parsed as QueryResult['parsed'];
  return {
    parsed,
    series: input.series ?? [],
    stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
    matched: [],
    ...(input.unit !== undefined ? { unit: input.unit } : {}),
    ...(input.error ? { error: input.error } : {}),
    ...(input.table ? { table: input.table } : {}),
  };
}

export function mergeSeries(series: Series[]): MergedPoint[] {
  const map = new Map<number, MergedPoint>();
  for (const s of series) {
    for (const p of s.points) {
      if (!map.has(p.ts)) map.set(p.ts, { ts: p.ts });
      map.get(p.ts)![s.label] = p.value;
    }
  }
  return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
}

export function compactNumber(value: number): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function tooltipTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
