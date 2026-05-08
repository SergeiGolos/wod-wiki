/**
 * JournalFeed — simple, flat list of date groups.
 *
 * Renders an explicit array of date keys (YYYY-MM-DD) in order.  No infinite
 * scroll, no IO observers, no URL sync.  The parent decides which dates to show.
 */

import { useMemo } from 'react';
import { CalendarIcon, FileTextIcon, ChevronRightIcon, PlusIcon, CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResultListItem } from '@/components/results/ResultListItem';
import type { FilteredListItem } from './queriable-list/types';
import type { JournalEntrySummary } from './queriable-list/JournalDateScroll';
import { localDateKey } from './queriable-list/JournalDateScroll';

// ── helpers ────────────────────────────────────────────────────────────────

function formatDateHeader(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ── props ──────────────────────────────────────────────────────────────────

export interface JournalFeedProps {
  /** Ordered list of YYYY-MM-DD keys to display (caller controls order & filtering). */
  dateKeys: string[];
  items: FilteredListItem[];
  journalEntries: Map<string, JournalEntrySummary>;
  onSelect: (item: FilteredListItem) => void;
  onOpenEntry?: (dateKey: string) => void;
  onCreateEntry?: (date: Date) => void;
  /**
   * Called when the user clicks the "Create note" card.
   * Only shown for dates present in `createNoteDates`.
   */
  onCreateNote?: (dateKey: string) => void;
  /**
   * Explicit set of date keys that should show the create-note card.
   * Keeps the feed clean — e.g. only today in feed mode, or the selected
   * date in filter mode.
   */
  createNoteDates?: Set<string>;
  /**
   * Date keys currently selected (highlighted with a ring).
   * Used for multi-select visual feedback.
   */
  selectedDateKeys?: Set<string>;
  /**
   * Called when the user clicks a date header.
   * `isMultiSelect` is true when Ctrl or Meta was held — add/remove from
   * the selection instead of replacing it.
   */
  onDateHeaderClick?: (key: string, isMultiSelect: boolean) => void;
  /** When true, show a "No activity" placeholder for dates with no content. */
  showEmptyDates?: boolean;
  className?: string;
}

// ── component ──────────────────────────────────────────────────────────────

export function JournalFeed({
  dateKeys,
  items,
  journalEntries,
  onSelect,
  onOpenEntry,
  onCreateEntry,
  onCreateNote,
  createNoteDates,
  selectedDateKeys,
  onDateHeaderClick,
  showEmptyDates = false,
  className,
}: JournalFeedProps) {
  const todayKey = localDateKey(new Date());

  const itemsByDate = useMemo(() => {
    const map = new Map<string, FilteredListItem[]>();
    items.forEach(item => {
      if (!item.date) return;
      const key = localDateKey(new Date(item.date));
      const group = map.get(key) ?? [];
      group.push(item);
      map.set(key, group);
    });
    return map;
  }, [items]);

  if (dateKeys.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-20 text-muted-foreground/50', className)}>
        <p className="text-sm font-medium">No journal entries yet.</p>
        <p className="text-xs mt-1">Start a workout or create a journal entry to see it here.</p>
      </div>
    );
  }

  return (
    <div className={cn('bg-card flex flex-col', className)} data-testid="journal-feed">
      {dateKeys.map(key => {
        const date = new Date(key + 'T00:00:00');
        const dayItems = itemsByDate.get(key) ?? [];
        const dayResults = dayItems.filter(i => i.type === 'result');
        const noteEntry = journalEntries.get(key);
        const isToday = key === todayKey;
        const isFuture = date > new Date(todayKey + 'T23:59:59');
        const isEmpty = !noteEntry && dayResults.length === 0;
        const isSelected = selectedDateKeys?.has(key) ?? false;
        const showCreateCard = !noteEntry && onCreateNote && (createNoteDates?.has(key) ?? false);

        // Skip empty dates unless pinned (today always shows) or in filter mode
        if (!showEmptyDates && isEmpty && key !== todayKey) return null;

        const workoutResults = dayResults.filter(i => i.group !== 'playground');
        const playgroundResults = dayResults.filter(i => i.group === 'playground');

        return (
          <div
            key={key}
            id={key}
            className={cn(
              'flex flex-col transition-colors',
              isSelected && 'ring-2 ring-inset ring-primary/30',
            )}
          >
            {/* Date header — clickable for focus / ctrl+click for multi-select */}
            <div
              className={cn(
                'sticky z-[5] px-6 py-2 backdrop-blur-sm border-y border-border flex items-center gap-2 top-0 transition-colors',
                onDateHeaderClick
                  ? 'cursor-pointer select-none'
                  : '',
                isSelected
                  ? 'bg-primary/10 border-primary/20'
                  : 'bg-muted/80 hover:bg-muted',
              )}
              // onMouseDown fires before the browser context-menu on macOS,
              // so Ctrl+click is caught here rather than in onClick.
              onMouseDown={onDateHeaderClick
                ? (e) => {
                    if (e.button !== 0) return; // left button only
                    e.preventDefault();          // prevent text-selection on repeated clicks
                    onDateHeaderClick(key, e.ctrlKey || e.metaKey);
                  }
                : undefined
              }
              // Suppress the macOS context menu when Ctrl is held so the
              // multi-select action above is the only thing that happens.
              onContextMenu={onDateHeaderClick
                ? (e) => { if (e.ctrlKey) e.preventDefault(); }
                : undefined
              }
              title={onDateHeaderClick ? 'Click to focus · Ctrl+click (⌘+click on Mac) to multi-select' : undefined}
            >
              {/* Selection indicator */}
              {isSelected ? (
                <div className="size-3.5 rounded-sm bg-primary flex items-center justify-center flex-shrink-0">
                  <CheckIcon className="size-2.5 text-primary-foreground stroke-[3]" />
                </div>
              ) : (
                <CalendarIcon className="size-3 text-muted-foreground flex-shrink-0" />
              )}

              <span className={cn(
                'text-[10px] font-black uppercase tracking-widest',
                isSelected ? 'text-primary' : 'text-muted-foreground',
              )}>
                {formatDateHeader(date)}
                {isToday && (
                  <span className={cn('ml-2 font-black', isSelected ? 'text-primary' : 'text-primary')}>
                    — Today
                  </span>
                )}
              </span>

              {isSelected && (
                <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-primary/60">
                  Selected
                </span>
              )}
            </div>

            <div className="flex flex-col gap-0 pb-1">
              {/* Note card */}
              {noteEntry && (
                <button
                  onClick={() => onOpenEntry?.(key)}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/40 transition-colors text-left group"
                >
                  <div className="flex-shrink-0 size-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <FileTextIcon className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">{noteEntry.title}</h3>
                    <p className="text-[11px] text-muted-foreground font-medium">Note</p>
                  </div>
                  <ChevronRightIcon className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
                </button>
              )}

              {/* Results grouped */}
              {[
                { label: 'Workouts', results: workoutResults },
                { label: 'Playground', results: playgroundResults },
              ].map(({ label, results }) =>
                results.length > 0 ? (
                  <div key={label} className="flex flex-col">
                    <div className="flex items-center gap-2 px-6 pt-2 pb-1">
                      <div className="h-px flex-1 bg-border/40" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                        {label}
                      </span>
                      <div className="h-px flex-1 bg-border/40" />
                    </div>
                    {results.map(item => (
                      <ResultListItem
                        key={`result-${item.id}`}
                        timeLabel={
                          item.date
                            ? new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'
                        }
                        title={item.title}
                        subtitle={item.subtitle}
                        onClick={() => onSelect(item)}
                      />
                    ))}
                  </div>
                ) : null,
              )}

              {/* Create note card — only for dates in createNoteDates */}
              {showCreateCard && (
                <button
                  onClick={() => onCreateNote!(key)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-primary/5 transition-colors text-left group border-b border-dashed border-border/40"
                >
                  <div className="flex-shrink-0 size-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <PlusIcon className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {isToday ? "Start today's journal entry" : 'Create journal entry'}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 font-medium mt-0.5">
                      Blank · Collection · History · Feed
                    </p>
                  </div>
                  <ChevronRightIcon className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
                </button>
              )}

              {/* Empty state — only in filter mode */}
              {isEmpty && showEmptyDates && !showCreateCard && (
                isFuture ? (
                  <button
                    data-date={key}
                    onClick={() => onCreateEntry?.(date)}
                    className="flex items-center gap-3 px-6 py-3 text-left hover:bg-muted/30 transition-colors group"
                  >
                    <span className="text-[11px] text-muted-foreground/50 font-medium group-hover:text-primary transition-colors">
                      + Plan a workout
                    </span>
                  </button>
                ) : (
                  <div className="px-6 py-2.5">
                    <span className="text-[11px] text-muted-foreground/30 font-medium">No activity</span>
                  </div>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
