import { useMemo } from 'react';
import type { QueryResult } from '@/services/analytics/query';
import { useChartShape } from './useChartShape';
import { WqlEmptyState } from './WqlEmptyState';
import { formatTimestamp } from './chartData';

export interface WqlTableProps {
  result: QueryResult;
  unit?: string;
}

const MAX_ROWS = 12;

/**
 * WqlTable — the default `table` widget of the dashboard-note format (#899):
 * renders a QueryResult as a plain table. Scalars get one row, grouped (bar)
 * results get one row per series label, timeseries pivot to one row per
 * bucket with a column per series. Capped at MAX_ROWS, latest buckets first.
 */
export function WqlTable({ result, unit: unitProp }: WqlTableProps) {
  const shape = useChartShape(result);
  const unit = result.series[0]?.unit ?? unitProp ?? '';

  const rows = useMemo(() => {
    if (shape.kind === 'scalar') {
      return {
        head: ['metric', 'value'],
        body: [[result.parsed.metric, format(result.series[0].points[0].value)]],
        more: 0,
      };
    }
    if (shape.kind === 'bars') {
      const sorted = [...result.series].sort(
        (a, b) => (b.points[0]?.value ?? 0) - (a.points[0]?.value ?? 0),
      );
      return {
        head: [result.parsed.groupBy[0] ?? 'group', 'value'],
        body: sorted
          .slice(0, MAX_ROWS)
          .map((s) => [s.label, format(s.points[0]?.value ?? 0)]),
        more: Math.max(0, sorted.length - MAX_ROWS),
      };
    }
    if (shape.kind === 'timeseries') {
      const labels = result.series.map((s) => s.label);
      const byTs = new Map<number, Map<string, number>>();
      for (const s of result.series) {
        for (const p of s.points) {
          if (!byTs.has(p.ts)) byTs.set(p.ts, new Map());
          byTs.get(p.ts)!.set(s.label, p.value);
        }
      }
      const ordered = [...byTs.entries()].sort((a, b) => b[0] - a[0]);
      return {
        head: ['bucket', ...labels],
        body: ordered
          .slice(0, MAX_ROWS)
          .map(([ts, values]) => [
            formatTimestamp(ts),
            ...labels.map((l) => {
              const v = values.get(l);
              return v == null ? '—' : format(v);
            }),
          ]),
        more: Math.max(0, ordered.length - MAX_ROWS),
      };
    }
    return { head: [], body: [], more: 0 };
  }, [result, shape]);

  function format(v: number): string {
    return `${v.toLocaleString()}${unit ? ` ${unit}` : ''}`;
  }

  if (shape.kind === 'error' || shape.kind === 'empty') {
    return <WqlEmptyState result={result} />;
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="text-muted-foreground text-left border-b border-border">
            {rows.head.map((h) => (
              <th key={h} className="py-1.5 pr-4 font-normal last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.body.map((row, i) => (
            <tr key={i} className="border-b border-border/40 last:border-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={
                    j === 0
                      ? 'py-1.5 pr-4 text-muted-foreground whitespace-nowrap'
                      : 'py-1.5 pr-4 tabular-nums last:pr-0'
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.more > 0 && (
        <div className="text-[11px] text-muted-foreground pt-2">… {rows.more} more rows</div>
      )}
    </div>
  );
}
