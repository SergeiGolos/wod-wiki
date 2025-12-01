import React from 'react';
import { cn } from '@/lib/utils';
import { FragmentVisualizer } from '@/views/runtime/FragmentVisualizer';
import { ICodeFragment } from '@/core/models/CodeFragment';

export interface HistoryRowProps {
  id: string;
  label: string;
  timestamp: number;
  duration?: number;
  type: string;
  depth: number;
  fragments: ICodeFragment[];
  isHeader?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

function formatTimestamp(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(ms: number): string {
  if (!ms) return '';
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export const HistoryRow: React.FC<HistoryRowProps> = ({
  label,
  timestamp,
  duration,
  depth,
  fragments,
  isHeader = false,
  isActive = false,
  onClick,
  className
}) => {
  // Base indent size in pixels
  const indentSize = 16;
  const indentStyle = { paddingLeft: `${depth * indentSize}px` };

  if (isHeader) {
    return (
      <div
        className={cn(
          "flex flex-col py-2 mt-2 mb-1 border-b border-border/50 select-none",
          isActive ? "bg-muted/30" : "",
          className
        )}
        style={indentStyle}
        onClick={onClick}
      >
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <span className="text-xs font-mono opacity-70">{formatTimestamp(timestamp)}</span>
          <div className="h-px bg-border flex-1 opacity-50" />
        </div>
        <div className="flex items-center justify-between pl-2">
           <div className="font-semibold text-sm text-foreground">
             {label}
           </div>
           {fragments.length > 0 && (
             <div className="flex-1 ml-4 overflow-hidden">
                <FragmentVisualizer fragments={fragments} compact className="gap-1" />
             </div>
           )}
           {duration !== undefined && (
             <div className="text-xs font-mono text-muted-foreground ml-2">
               {formatDuration(duration)}
             </div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center py-1 border-b border-border/10 hover:bg-muted/20 transition-colors",
        isActive ? "bg-primary/5 text-foreground" : "text-muted-foreground",
        className
      )}
      style={indentStyle}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="font-mono text-[10px] opacity-40 shrink-0 w-12 text-right">
             {formatTimestamp(timestamp)}
        </span>

        <div className="flex-1 flex items-center gap-2 overflow-hidden">
             {/* Use border-left to reinforce visual hierarchy if needed, but padding handles indentation */}
             <div className="truncate text-sm font-medium">
                {label}
             </div>

             {fragments.length > 0 && (
                <div className="flex-shrink-0 ml-2">
                  <FragmentVisualizer fragments={fragments} compact className="gap-1 opacity-80" />
                </div>
             )}
        </div>
      </div>

      {duration !== undefined && (
        <div className="text-[10px] font-mono opacity-60 shrink-0 ml-2 w-10 text-right">
           {formatDuration(duration)}
        </div>
      )}
    </div>
  );
};
