/**
 * JournalFeed — simple, flat list of date groups.
 *
 * Renders an explicit array of date keys (YYYY-MM-DD) in order.  No infinite
 * scroll, no IO observers, no URL sync.  The parent decides which dates to show
 * (either all dates that have records, or a single filtered date).
 */

import { useMemo } from 'react';
import { CalendarIcon, FileTextIcon, ChevronRightIcon } from 'lucide-react';
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
  /** When true, show a "No activity" placeholder for empty dates (useful for single-date view). */
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
  showEmptyDates = false,
  className,
}: JournalFeedProps) {
  const todayKey = localDateKey(new Date());

  // Group items by date key once
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

        // In feed mode we only show dates with content; skip silently.
        if (!showEmptyDates && isEmpty) return null;

        const workoutResults = dayResults.filter(i => i.group !== 'playground');
        const playgroundResults = dayResults.filter(i => i.group === 'playground');

        return (
          <div key={key} id={key} className="flex flex-col">
            {/* Date header */}
            <div className="sticky z-[5] px-6 py-2 bg-muted/80 backdrop-blur-sm border-y border-border flex items-center gap-2 top-0">
              <CalendarIcon className="size-3 text-muted-foreground" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {formatDateHeader(date)}
                {isToday && <span className="ml-2 text-primary font-black">— Today</span>}
              </span>
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

              {/* Empty state — only shown when showEmptyDates is true */}
              {isEmpty && showEmptyDates && (
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
