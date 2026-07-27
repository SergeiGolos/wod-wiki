import type { Series } from '@/services/analytics/query';

export interface MergedPoint {
  ts: number;
  [label: string]: number | string;
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

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function tooltipTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
