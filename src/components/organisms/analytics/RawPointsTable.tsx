import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { AnalyticsDataPoint } from '@/types/storage';

export interface RawPointsTableProps {
  matched: AnalyticsDataPoint[];
  unit?: string;
}

export function RawPointsTable({ matched, unit }: RawPointsTableProps) {
  const [show, setShow] = useState(false);
  if (matched.length === 0) return null;

  const tagsForRow = (row: AnalyticsDataPoint): string[] => {
    const tags: string[] = [];
    if (row.effortSlug) tags.push(`effort:${row.effortSlug}`);
    if (row.discipline) tags.push(`discipline:${row.discipline}`);
    if (row.intensityTier) tags.push(`intensity:${row.intensityTier}`);
    if (row.origin) tags.push(`origin:${row.origin}`);
    return tags;
  };

  return (
    <div className="bg-card border border-border rounded-lg mt-3">
      <button
        onClick={() => setShow(!show)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
      >
        {show ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Raw metric points behind this query ({matched.length})
        <span className="text-[11px] ml-auto">one row per fact from the analytics store</span>
      </button>
      {show && (
        <div className="px-4 pb-3 overflow-x-auto">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="text-muted-foreground text-left border-b border-border">
                <th className="py-1.5 pr-4 font-normal">ts</th>
                <th className="py-1.5 pr-4 font-normal">metric</th>
                <th className="py-1.5 pr-4 font-normal">value</th>
                <th className="py-1.5 font-normal">tags</th>
              </tr>
            </thead>
            <tbody>
              {matched.slice(0, 12).map((p) => (
                <tr key={p.id} className="border-b border-border/40">
                  <td className="py-1.5 pr-4 text-muted-foreground whitespace-nowrap">
                    {new Date(p.timestamp).toISOString().slice(0, 10)}
                  </td>
                  <td className="py-1.5 pr-4 text-primary whitespace-nowrap">{p.metricKey}</td>
                  <td className="py-1.5 pr-4 tabular-nums">
                    {p.value}
                    {unit ? ` ${unit}` : ''}
                  </td>
                  <td className="py-1.5 text-muted-foreground">
                    {tagsForRow(p).map((t) => (
                      <span
                        key={t}
                        className="inline-block bg-background/80 rounded px-1.5 py-0.5 mr-1 mb-0.5"
                      >
                        {t}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {matched.length > 12 && (
            <div className="text-[11px] text-muted-foreground pt-2">
              … {matched.length - 12} more points
            </div>
          )}
        </div>
      )}
    </div>
  );
}
