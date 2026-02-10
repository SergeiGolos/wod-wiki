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
  /** Currently selected entry IDs */
  selectedIds: Set<string>;
  /** Toggle selection callback */
  onToggle: (id: string) => void;
  /** Show enriched metadata (for full-span mode) */
  enriched?: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${mins}:00`;
}

function formatDate(date: Date, enriched: boolean): string {
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

        return (
          <button
            key={entry.id}
            onClick={() => onToggle(entry.id)}
            className={cn(
              'w-full text-left px-3 py-2 transition-colors',
              'hover:bg-muted/50',
              isSelected && 'bg-primary/10',
            )}
          >
            <div className="flex items-start gap-2">
              {/* Checkbox */}
              <div className={cn(
                'mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
                isSelected
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-muted-foreground/40',
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
                    {entry.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{formatDate(entry.date, enriched)}</span>
                  <span>·</span>
                  <span>{formatDuration(entry.duration)}</span>
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

                {/* Summary (shown only in enriched mode) */}
                {enriched && entry.workoutType && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {entry.workoutType}
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
