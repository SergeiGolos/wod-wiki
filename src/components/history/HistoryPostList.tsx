/**
 * HistoryPostList - Selectable list of workout entries
 *
 * Features:
 * - Each row: checkbox + name + date + duration + tags (when space allows)
 * - Enriched mode for full-span (show summary, stats)
 * - Emits onToggle(id) for selection
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { HistoryEntry } from '@/types/history';

export interface HistoryPostListProps {
  /** Workout entries to display */
  entries: HistoryEntry[];
  /** Currently selected entry IDs (checkboxes) */
  selectedIds: Set<string>;
  /** Toggle checkbox selection callback */
  onToggle: (id: string) => void;
  /** Open entry for viewing callback (row click) */
  onOpen?: (id: string) => void;
  /** Currently active/open entry ID */
  activeEntryId?: string | null;
  /** Show enriched metadata (for full-span mode) */
  enriched?: boolean;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return secs > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${mins}:00`;
}

function formatDate(timestamp: number, enriched: boolean): string {
  const date = new Date(timestamp);
  if (enriched) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export const HistoryPostList: React.FC<HistoryPostListProps> = ({
  entries,
  selectedIds,
  onToggle,
  onOpen,
  activeEntryId,
  enriched = false,
}) => {
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
        No workout entries found
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {entries.map(entry => {
        const isSelected = selectedIds.has(entry.id);
        const isActive = entry.id === activeEntryId;

        return (
          <button
            key={entry.id}
            onClick={() => onOpen ? onOpen(entry.id) : onToggle(entry.id)}
            className={cn(
              'w-full text-left px-3 py-2 transition-colors',
              'hover:bg-muted/50',
              isSelected && 'bg-primary/10',
              isActive && !isSelected && 'bg-accent/50 border-l-2 border-primary',
            )}
          >
            <div className="flex items-start gap-2">
              {/* Checkbox — clicking stops propagation to row, toggles selection */}
              <div
                role="checkbox"
                aria-checked={isSelected}
                onClick={(e) => { e.stopPropagation(); onToggle(entry.id); }}
                className={cn(
                'mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer',
                isSelected
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-muted-foreground/40 hover:border-primary/60',
              )}>
                {isSelected && (
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn(
                    'font-medium truncate text-sm',
                    isSelected ? 'text-foreground' : 'text-foreground/80',
                  )}>
                    {entry.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{formatDate(entry.updatedAt, enriched)}</span>
                  {entry.results && (
                    <>
                      <span>·</span>
                      <span>{formatDuration(entry.results.duration)}</span>
                    </>
                  )}
                </div>

                {/* Tags (shown in enriched mode or when space allows) */}
                {enriched && entry.tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {entry.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
