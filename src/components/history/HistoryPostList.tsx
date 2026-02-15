/**
 * HistoryPostList - Selectable list of workout entries
 *
 * Features:
 * - Each row: checkbox + name + date + duration + tags (when space allows)
 * - Enriched mode for full-span (show summary, stats)
 * - "Add to Notebook" button per row
 * - Emits onToggle(id) for selection
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Edit2 } from 'lucide-react';
import type { HistoryEntry } from '@/types/history';
import { AddToNotebookButton } from '@/components/notebook/AddToNotebookButton';
import { CloneDateDropdown } from '@/components/workbench/CloneDateDropdown';
import type { IContentProvider } from '@/types/content-provider';

export interface HistoryPostListProps {
  /** Workout entries to display */
  entries: HistoryEntry[];
  /** Currently selected entry IDs (checkboxes) */
  selectedIds: Set<string>;
  /** Toggle checkbox selection callback */
  onToggle: (id: string, modifiers?: { ctrlKey: boolean; shiftKey: boolean }) => void;
  /** Currently active/open entry ID */
  activeEntryId?: string | null;
  /** Show enriched metadata (for full-span mode) */
  enriched?: boolean;
  /** Callback when notebook tag is toggled on an entry */
  onNotebookToggle?: (entryId: string, notebookId: string, isAdding: boolean) => void;
  /** Edit entry callback (pencil icon) */
  onEdit?: (id: string, type?: 'note' | 'template') => void;
  /** Clone entry callback (copy icon) — receives entryId and optional targetDate */
  onClone?: (id: string, targetDate?: number) => void;
  /** Content provider for calendar date hints */
  provider?: IContentProvider;
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
  activeEntryId,
  enriched = false,
  onNotebookToggle,
  onEdit,
  onClone,
  provider,
}) => {
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
        No session entries found
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {entries.map(entry => {
        const isSelected = selectedIds.has(entry.id);
        const isActive = entry.id === activeEntryId;

        return (
          <div
            key={entry.id}
            role="button"
            tabIndex={0}
            onClick={(e) => onToggle(entry.id, { ctrlKey: e.ctrlKey || e.metaKey, shiftKey: e.shiftKey })}
            onDoubleClick={(e) => {
              e.preventDefault(); // Prevent text selection
              if (onEdit) onEdit(entry.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle(entry.id, { ctrlKey: e.ctrlKey || e.metaKey, shiftKey: e.shiftKey });
              }
            }}
            className={cn(
              'w-full text-left px-3 py-2 transition-colors cursor-pointer outline-none focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset select-none',
              'hover:bg-muted/50',
              isSelected && 'bg-primary/10',
              isActive && !isSelected && 'bg-accent/50 border-l-2 border-primary',
            )}
          >
            <div className="flex items-center gap-3 w-full">
              {/* Action Button: Clone (Template) or Edit (Note) on the left */}
              <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                {entry.type === 'template' ? (
                  <CloneDateDropdown
                    onClone={(targetDate) => onClone?.(entry.id, targetDate)}
                    provider={provider}
                    variant="list-icon"
                    title="Clone to date..."
                  />
                ) : (
                  onEdit && (
                    <button
                      onClick={() => onEdit(entry.id, entry.type)}
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors"
                      title="Edit Note"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>

              {/* Content area that fills available space */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    'font-medium truncate text-sm',
                    isSelected ? 'text-foreground' : 'text-foreground/80',
                  )}>
                    {entry.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{formatDate(entry.targetDate, enriched)}</span>
                  {entry.results && (
                    <>
                      <span>·</span>
                      <span>{formatDuration(entry.results.duration)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Side: Tags + Notebook Button + Checkbox */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Tags (moved to right side, shown in enriched mode) */}
                {enriched && entry.tags.length > 0 && (
                  <div className="hidden sm:flex gap-1 flex-wrap justify-end max-w-[150px]">
                    {entry.tags
                      .filter(tag => !tag.startsWith('notebook:'))
                      .map(tag => (
                        <span
                          key={tag}
                          className="text-[9px] px-1 py-0.5 rounded-full bg-muted/60 text-muted-foreground/80 border border-border/50"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                )}

                {/* Add to Notebook button */}
                {onNotebookToggle && (
                  <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <AddToNotebookButton
                      entryTags={entry.tags}
                      onToggle={(notebookId, isAdding) => onNotebookToggle(entry.id, notebookId, isAdding)}
                      variant="icon"
                      className="h-8 w-8 text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all"
                    />
                  </div>
                )}


              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
