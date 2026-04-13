import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PlusIcon, CalendarIcon, FileTextIcon, PlayIcon, CheckCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FilteredListItem } from './types';

// ── Date utilities ─────────────────────────────────────────────────────────

/** Returns 'YYYY-MM-DD' in local time. Avoids UTC timezone shift from toISOString(). */
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateHeader(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface JournalDateScrollHandle {
  /** Imperatively scroll to a date. Only call this in response to deliberate user navigation. */
  scrollToDate(date: Date): void;
}

interface JournalDateScrollProps {
  items: FilteredListItem[];
  onSelect: (item: FilteredListItem) => void;
  onCreateEntry: (date: Date) => void;
  /**
   * Passive anchor: used only to set the initial window on first render.
   * Changing this prop does NOT trigger a scroll.
   * Use the imperative `scrollToDate` handle for user-intent navigation.
   */
  initialDate?: Date;
  onVisibleDateChange?: (dateKey: string) => void;
  stickyOffset?: number;
  className?: string;
}

// ── Item icon ──────────────────────────────────────────────────────────────

const ItemIcon = ({ type }: { type: FilteredListItem['type'] }) => {
  switch (type) {
    case 'note':   return <FileTextIcon className="size-4 text-blue-500" />;
    case 'block':  return <PlayIcon className="size-4 text-emerald-500" />;
    case 'result': return <CheckCircleIcon className="size-4 text-purple-500" />;
  }
};

// ── Component ──────────────────────────────────────────────────────────────

export const JournalDateScroll = forwardRef<JournalDateScrollHandle, JournalDateScrollProps>(
  (
    {
      items,
      onSelect,
      onCreateEntry,
      initialDate,
      onVisibleDateChange,
      stickyOffset = 0,
      className,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const bottomSentinelRef = useRef<HTMLDivElement>(null);

    // Map from date key → DOM element; populated via stable callback refs during render.
    const dateGroupRefs = useRef<Map<string, HTMLElement>>(new Map());

    // Prepend scroll anchoring
    const isPrependingRef = useRef(false);
    const scrollHeightBeforeRef = useRef(0);

    // Off-window scroll: key to scroll to once the window is rebuilt around it
    const pendingScrollKeyRef = useRef<string | null>(null);

    // Suppress IO visible-date reports during programmatic scroll
    const suppressReportRef = useRef(false);
    const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastReportedRef = useRef<string>('');

    // ── Date window ──────────────────────────────────────────────────────────

    const [dateWindow, setDateWindow] = useState<{ start: Date; end: Date }>(() => {
      const anchor = initialDate ?? new Date();
      return {
        start: addDays(anchor, -14),
        end: addDays(anchor, 7),
      };
    });

    // Descending list of all dates in the window (newest → oldest)
    const dates = useMemo(() => {
      const result: Date[] = [];
      let d = new Date(dateWindow.end);
      const stop = dateWindow.start;
      while (d >= stop) {
        result.push(new Date(d));
        d = addDays(d, -1);
      }
      return result;
    }, [dateWindow]);

    // Group items by local date key
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

    // ── Suppress visible-date reports during programmatic scroll ─────────────

    const suppressReportUntilScrollEnd = useCallback(() => {
      suppressReportRef.current = true;
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
      suppressTimerRef.current = setTimeout(() => {
        suppressReportRef.current = false;
      }, 1000);
      window.addEventListener(
        'scrollend',
        () => {
          suppressReportRef.current = false;
          if (suppressTimerRef.current) {
            clearTimeout(suppressTimerRef.current);
            suppressTimerRef.current = null;
          }
        },
        { once: true },
      );
    }, []);

    // ── Imperative handle ─────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      scrollToDate(date: Date) {
        const key = localDateKey(date);
        const el = dateGroupRefs.current.get(key);
        if (el) {
          suppressReportUntilScrollEnd();
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          // Date is outside the current window — rebuild window around this date
          pendingScrollKeyRef.current = key;
          setDateWindow({
            start: addDays(date, -7),
            end: addDays(date, 3),
          });
        }
      },
    }), [suppressReportUntilScrollEnd]);

    // After window rebuild: complete a pending off-window scroll once dates are rendered
    useEffect(() => {
      const key = pendingScrollKeyRef.current;
      if (!key) return;
      const el = dateGroupRefs.current.get(key);
      if (!el) return;
      pendingScrollKeyRef.current = null;
      suppressReportUntilScrollEnd();
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }, [dates, suppressReportUntilScrollEnd]);

    // ── Top sentinel: load future dates (prepend) ─────────────────────────────

    useEffect(() => {
      const sentinel = topSentinelRef.current;
      if (!sentinel) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting || isPrependingRef.current) return;
          isPrependingRef.current = true;
          // Capture page height before DOM changes so we can compensate scroll position
          scrollHeightBeforeRef.current = document.documentElement.scrollHeight;
          setDateWindow(w => ({ ...w, end: addDays(w.end, 7) }));
        },
        // root:null = window viewport; 600px top margin fires before sentinel scrolls into view
        { rootMargin: '600px 0px 0px 0px', threshold: 0 },
      );
      observer.observe(sentinel);
      return () => observer.disconnect();
    }, []);

    // After prepend: restore scroll position to prevent viewport jump
    useLayoutEffect(() => {
      if (scrollHeightBeforeRef.current === 0) return;
      const delta = document.documentElement.scrollHeight - scrollHeightBeforeRef.current;
      if (delta > 0) window.scrollBy({ top: delta, behavior: 'instant' });
      scrollHeightBeforeRef.current = 0;
      // Release the guard after the browser has painted
      requestAnimationFrame(() => {
        isPrependingRef.current = false;
      });
    }, [dateWindow.end]);

    // ── Bottom sentinel: load past dates (append) ─────────────────────────────

    useEffect(() => {
      const sentinel = bottomSentinelRef.current;
      if (!sentinel) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          setDateWindow(w => ({ ...w, start: addDays(w.start, -7) }));
        },
        // root:null = window viewport; 600px bottom margin fires before sentinel scrolls into view
        { rootMargin: '0px 0px 600px 0px', threshold: 0 },
      );
      observer.observe(sentinel);
      return () => observer.disconnect();
    }, []);

    // ── Visible date IO — ratioMap pattern to avoid oscillation ──────────────

    useEffect(() => {
      if (!onVisibleDateChange) return;
      const ratioMap = new Map<string, number>();

      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.target.id) ratioMap.set(entry.target.id, entry.intersectionRatio);
          });

          if (suppressReportRef.current) return;

          // Winner = date group with the highest visible ratio
          let bestId = '';
          let bestRatio = -1;
          ratioMap.forEach((ratio, id) => {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestId = id;
            }
          });

          if (bestId && bestId !== lastReportedRef.current) {
            lastReportedRef.current = bestId;
            onVisibleDateChange(bestId);
          }
        },
        // root:null = window viewport; focus on top ~40% of viewport to pick the "current" date
        { rootMargin: '-10% 0px -50% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] },
      );

      dateGroupRefs.current.forEach(el => el && observer.observe(el));
      return () => observer.disconnect();
    }, [dates, onVisibleDateChange]);

    // ── Stable callback ref factory ───────────────────────────────────────────

    const setDateGroupRef = useCallback(
      (key: string) => (el: HTMLElement | null) => {
        if (el) dateGroupRefs.current.set(key, el);
        else dateGroupRefs.current.delete(key);
      },
      [],
    );

    // ── Render ────────────────────────────────────────────────────────────────

    const todayKey = localDateKey(new Date());

    return (
      <div ref={containerRef} className={cn('overflow-y-auto bg-card', className)}>
        <div ref={topSentinelRef} className="h-px" />

        {dates.map(date => {
          const key = localDateKey(date);
          const dayItems = itemsByDate.get(key) ?? [];
          const isToday = key === todayKey;

          return (
            <div key={key} id={key} ref={setDateGroupRef(key) as React.RefCallback<HTMLDivElement>} className="flex flex-col">
              {/* Sticky date header */}
              <div
                className="sticky z-[5] px-6 py-2 bg-muted/80 backdrop-blur-sm border-y border-border flex items-center gap-2"
                style={{ top: stickyOffset }}
              >
                <CalendarIcon className="size-3 text-muted-foreground" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {formatDateHeader(date)}
                  {isToday && <span className="ml-2 text-primary font-black">— Today</span>}
                </span>
              </div>

              {/* Entries for this day */}
              {dayItems.length > 0 && (
                <div className="divide-y divide-border/50">
                  {dayItems.map(item => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => onSelect(item)}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors text-left group"
                    >
                      <div className="flex-shrink-0 size-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
                        <ItemIcon type={item.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="text-sm font-bold text-foreground truncate uppercase tracking-tight">
                            {item.title}
                          </h3>
                          {item.date && (
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                              {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate font-medium">{item.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Ghost "Add note" row — always visible, invites creating an entry */}
              <button
                onClick={() => onCreateEntry(date)}
                className="flex items-center gap-3 mx-4 my-2 px-4 py-2.5 rounded-lg border border-dashed border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group w-[calc(100%-2rem)]"
              >
                <div className="flex-shrink-0 size-7 rounded-md bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <PlusIcon className="size-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-xs text-muted-foreground/60 group-hover:text-primary transition-colors font-medium">
                  Add note for {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </button>
            </div>
          );
        })}

        <div ref={bottomSentinelRef} className="h-px" />
      </div>
    );
  },
);

JournalDateScroll.displayName = 'JournalDateScroll';
