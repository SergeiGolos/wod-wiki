import React, { useState } from 'react';
import { type GridRow } from '@/components/review-grid/types';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Bug } from 'lucide-react';

interface DebugTraceViewerProps {
  rows: GridRow[];
  className?: string;
  defaultExpanded?: boolean;
}

const OUTPUT_TYPE_COLORS: Record<string, string> = {
  load: 'border-muted-foreground/30 text-muted-foreground italic opacity-70',
  compiler: 'border-accent text-accent-foreground',
  event: 'border-primary text-primary',
  system: 'border-border text-foreground',
  completion: 'border-success text-success',
};

export const DebugTraceViewer: React.FC<DebugTraceViewerProps> = ({ 
  rows, 
  className,
  defaultExpanded = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Filter rows for debug view
  const debugRows = rows.filter(r => 
    ['load', 'compiler', 'event', 'system', 'completion'].includes(r.outputType)
  );

  const formatTimestamp = (ms?: number) => {
    if (!ms) return '--:--:--.---';
    const d = new Date(ms);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  const getCompletionColor = (reason?: string) => {
    if (!reason) return '';
    if (reason === 'timer-expired' || reason === 'rounds-complete') return 'text-success';
    return 'text-warning';
  };

  return (
    <div className={cn("border-t border-border bg-muted/30", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors group"
      >
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-label uppercase text-muted-foreground group-hover:text-foreground">
          <Bug className="w-3.5 h-3.5" />
          <span>🐛 Debug Trace — {debugRows.length} events</span>
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {isExpanded && (
        <div className="max-h-[40vh] overflow-auto border-t border-border bg-muted/10">
          <table className="w-full border-collapse font-mono text-[11px] tabular-nums">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm shadow-sm z-10">
              <tr className="text-left text-muted-foreground border-bottom border-border">
                <th className="px-2 py-1 font-medium w-8 text-center">#</th>
                <th className="px-2 py-1 font-medium w-32">Timestamp</th>
                <th className="px-2 py-1 font-medium w-40">Block</th>
                <th className="px-2 py-1 font-medium w-24">Type</th>
                <th className="px-2 py-1 font-medium w-12 text-center">D</th>
                <th className="px-2 py-1 font-medium">System / Event</th>
                <th className="px-2 py-1 font-medium w-32">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {debugRows.map((row) => {
                const colorClass = OUTPUT_TYPE_COLORS[row.outputType] || 'border-border';
                const systemMetric = row.cells.get('system' as any)?.metrics.getDisplayMetrics({ types: ['system' as any] })[0];
                const eventMetric = row.cells.get('event' as any)?.metrics.getDisplayMetrics({ types: ['event' as any] })[0];
                
                const eventName = systemMetric?.value || eventMetric?.value || '--';

                return (
                  <tr 
                    key={row.id} 
                    className={cn(
                      "hover:bg-accent/5 transition-colors group h-7",
                      "border-l-4",
                      colorClass.split(' ')[0]
                    )}
                  >
                    <td className="px-2 py-0 text-center text-muted-foreground/50">{row.index}</td>
                    <td className="px-2 py-0 text-muted-foreground">{formatTimestamp(row.absoluteStartTime)}</td>
                    <td className="px-2 py-0 truncate max-w-[150px]" title={row.sourceBlockKey}>
                      {row.sourceBlockKey}
                    </td>
                    <td className="px-2 py-0">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase",
                        row.outputType === 'completion' 
                          ? (row.completionReason === 'timer-expired' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')
                          : `bg-muted text-muted-foreground border border-border/50`
                      )}>
                        {row.outputType}
                      </span>
                    </td>
                    <td className="px-2 py-0 text-center text-muted-foreground">{row.stackLevel}</td>
                    <td className="px-2 py-0 truncate">
                      {String(eventName)}
                    </td>
                    <td className={cn("px-2 py-0 italic", getCompletionColor(row.completionReason))}>
                      {row.completionReason || ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {debugRows.length === 0 && (
            <div className="py-8 text-center text-muted-foreground italic">
              No debug events captured.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
