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
import { CalendarIcon, FileTextIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FilteredListItem } from './types';
import { ResultListItem } from '@/components/results/ResultListItem';

// ── Journal entry summary (note metadata for a given date) ─────────────────

export interface JournalEntrySummary {
  title: string;
  updatedAt: number;
}

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
  onCreateEntry?: (date: Date) => void;
  /** Metadata for dates that have an existing journal note. */
  journalEntries?: Map<string, JournalEntrySummary>;
  /** Called when the user clicks an existing note card. */
  onOpenEntry?: (dateKey: string) => void;
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

// ── Component ──────────────────────────────────────────────────────────────

export const JournalDateScroll = forwardRef<JournalDateScrollHandle, JournalDateScrollProps>(
  (
    {
      items,
      onSelect,
      onCreateEntry,
      journalEntries,
      onOpenEntry,
      onVisibleDateChange,
      stickyOffset = 0,
      className,
    },
    ref,
  ) => {
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const bottomSentinelRef = useRef<HTMLDivElement>(null);

    // Stored observer refs so we can reconnect them after programmatic scrolls
    const topObserverRef = useRef<IntersectionObserver | null>(null);
    const bottomObserverRef = useRef<IntersectionObserver | null>(null);

    // Map from date key → DOM element; populated via stable callback refs during render.
    const dateGroupRefs = useRef<Map<string, HTMLElement>>(new Map());

    // Append guards — prevent burst-loading when sentinels stay visible
    const isPrependingRef = useRef(false);  // top sentinel: loading more future dates (prepends at top)
    const isAppendingRef = useRef(false);   // bottom sentinel: loading older history (appends at bottom)

    // Suppress sentinel firing until the initial mount scroll has completed
    const mountScrollDoneRef = useRef(false);

    // Refs to allow observer callbacks to read current values without stale closures.
    // Both start and end are tracked so the IO callbacks (empty deps []) never use stale state.
    const dateWindowStartRef = useRef<Date>(new Date());
    const dateWindowEndRef = useRef<Date>(new Date());

    // Scroll-anchor for prepend compensation.
    // Captured (key + viewport-relative top) just before inserting new dates at the top,
    // then consumed by useLayoutEffect to restore the user's visual position.
    const prependAnchorRef = useRef<{ key: string; top: number } | null>(null);

    // ── Auto-measure sticky chrome height ────────────────────────────────────
    // A non-sticky probe div sits at the very top of the content area.
    // Its document-relative Y (getBoundingClientRect().top + scrollY) equals the
    // height of all sticky chrome above it (CanvasPage title bar on desktop,
    // SidebarLayout mobile header on mobile).  The formula is scroll-invariant:
    //   pageTop = viewportTop + scrollY  (both change equally as user scrolls)
    const stickyProbeRef = useRef<HTMLDivElement>(null);
    const [activeStickyTop, setActiveStickyTop] = useState(stickyOffset);
    useEffect(() => {
      const measure = () => {
        if (!stickyProbeRef.current) return;
        const rect = stickyProbeRef.current.getBoundingClientRect();
        const pageTop = Math.round(rect.top + window.scrollY);
        setActiveStickyTop(Math.max(stickyOffset, pageTop));
      };
      // Run after first paint so layout measurements are settled.
      const raf = requestAnimationFrame(measure);
      window.addEventListener('resize', measure, { passive: true });
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', measure);
      };
    }, [stickyOffset]);

    // Off-window scroll: key to scroll to once the window is rebuilt around it
    const pendingScrollKeyRef = useRef<string | null>(null);

    // Suppress IO visible-date reports during programmatic scroll
    const suppressReportRef = useRef(false);
    const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastReportedRef = useRef<string>('');

    // ── Date window ──────────────────────────────────────────────────────────

    const [dateWindow, setDateWindow] = useState<{ start: Date; end: Date }>(() => {
      const today = new Date();
      // Start window with today as the top (newest) item and 7 days of history below.
      // Future dates are loaded lazily by the top sentinel when the user scrolls up.
      return {
        start: addDays(today, -7),
        end: today,
      };
    });

    // Descending list: future first, oldest last.
    // Scroll UP → future/planned workouts. Scroll DOWN → history.
    // Today is in the middle; mount scroll jumps to it.
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

    // ── Oldest data floor ─────────────────────────────────────────────────────
    // The bottom sentinel stops loading once the window extends past the oldest
    // known record (journal entries + results) by a buffer of 14 days.
    // This prevents infinite backward expansion on devices with momentum scrolling.

    const oldestDataDate = useMemo(() => {
      let oldest: Date | null = null;
      // Scan journal entry dates (keys are 'YYYY-MM-DD')
      journalEntries?.forEach((_, key) => {
        const d = new Date(key + 'T00:00:00');
        if (!oldest || d < oldest) oldest = d;
      });
      // Scan result dates
      items.forEach(item => {
        if (!item.date) return;
        const d = new Date(item.date);
        if (!oldest || d < oldest) oldest = d;
      });
      return oldest;
    }, [journalEntries, items]);

    // Keep a ref so the observer callback can read the latest value
    const oldestDataDateRef = useRef<Date | null>(null);
    useEffect(() => {
      oldestDataDateRef.current = oldestDataDate;
    }, [oldestDataDate]);

    // Keep refs in sync with useLayoutEffect (not useEffect) so IO callbacks always
    // read the latest values — useLayoutEffect fires before the browser can deliver
    // new IO notifications that could read a stale value.
    useLayoutEffect(() => {
      dateWindowStartRef.current = dateWindow.start;
    }, [dateWindow.start]);

    useLayoutEffect(() => {
      dateWindowEndRef.current = dateWindow.end;
    }, [dateWindow.end]);

    // ── Prepend scroll compensation ───────────────────────────────────────────
    // When new dates are inserted at the top of the list (top sentinel fires),
    // the existing DOM shifts down by the height of the new elements. We capture
    // the position of the anchor element (the previous dates[0]) just BEFORE the
    // state update, then restore the user's visual position in a useLayoutEffect
    // that fires synchronously after DOM mutations but before the browser paints.
    useLayoutEffect(() => {
      const anchor = prependAnchorRef.current;
      if (!anchor) return;
      prependAnchorRef.current = null;
      const el = dateGroupRefs.current.get(anchor.key);
      if (!el) return;
      const newTop = el.getBoundingClientRect().top;
      const delta = newTop - anchor.top;
      if (Math.abs(delta) > 1) {
        window.scrollBy(0, delta);
      }
    }, [dates]);

    // ── Suppress visible-date reports + sentinels during programmatic scroll ──

    /**
     * Re-observe both sentinels to force IO to re-evaluate their current
     * intersection state. Called after suppression ends so that sentinels
     * that were blocked during a programmatic scroll fire immediately if
     * they are still within the preload margin.
     */
    const recheckSentinels = useCallback(() => {
      const reconnect = (
        observerRef: React.MutableRefObject<IntersectionObserver | null>,
        sentinelRef: React.RefObject<HTMLDivElement | null>,
      ) => {
        if (observerRef.current && sentinelRef.current) {
          observerRef.current.unobserve(sentinelRef.current);
          observerRef.current.observe(sentinelRef.current);
        }
      };
      reconnect(topObserverRef, topSentinelRef);
      reconnect(bottomObserverRef, bottomSentinelRef);
    }, []);

    const suppressReportUntilScrollEnd = useCallback(() => {
      suppressReportRef.current = true;
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);

      const clearSuppression = () => {
        suppressReportRef.current = false;
        if (suppressTimerRef.current) {
          clearTimeout(suppressTimerRef.current);
          suppressTimerRef.current = null;
        }
        recheckSentinels();
      };

      // Primary: release on the native scrollend event (Chrome 114+, FF 109+, Safari 16.4+)
      window.addEventListener('scrollend', clearSuppression, { once: true });

      // Fallback: poll scrollY every 100 ms; release once it has been
      // stable for two consecutive polls. This handles:
      //   - browsers without scrollend
      //   - instant scrolls (scrollend fires synchronously, poll is a no-op)
      //   - long smooth scrolls that would exceed a fixed 1s timeout
      let lastY = window.scrollY;
      let stableCount = 0;
      const poll = () => {
        if (!suppressReportRef.current) return; // already cleared by scrollend
        const y = window.scrollY;
        if (y === lastY) {
          stableCount++;
          if (stableCount >= 2) {
            window.removeEventListener('scrollend', clearSuppression);
            clearSuppression();
            return;
          }
        } else {
          lastY = y;
          stableCount = 0;
        }
        suppressTimerRef.current = setTimeout(poll, 100);
      };
      // Start polling after 150 ms to let the scroll begin before measuring
      suppressTimerRef.current = setTimeout(poll, 150);
    }, [recheckSentinels]);

    // ── Imperative handle ─────────────────────────────────────────────────────

    /** Scroll to a date group, accounting for the sticky header. */
    const scrollToElement = useCallback((el: HTMLElement) => {
      const top = el.getBoundingClientRect().top + window.scrollY - activeStickyTop - 8;
      window.scrollTo({ top, behavior: 'smooth' });
    }, [activeStickyTop]);

    useImperativeHandle(ref, () => ({
      scrollToDate(date: Date) {
        const key = localDateKey(date);
        const el = dateGroupRefs.current.get(key);
        if (el) {
          suppressReportUntilScrollEnd();
          scrollToElement(el);
        } else {
          // Date is outside the current window — rebuild a ±14-day window around target,
          // capped at today+90 on the future side to prevent runaway loading.
          const ceiling = addDays(new Date(), 90);
          pendingScrollKeyRef.current = key;
          setDateWindow({
            start: addDays(date, -14),
            end: addDays(date, 14) > ceiling ? ceiling : addDays(date, 14),
          });
        }
      },
    }), [suppressReportUntilScrollEnd, scrollToElement]);

    // On mount: snap to the top. Today is always the first item in the descending list
    // (initial window ends at today), so no complex offset math is needed — just reset
    // scroll position to 0 in case the browser restored a previous position.
    // Sentinels are suppressed until this completes to avoid mount-time burst loading.
    useEffect(() => {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      requestAnimationFrame(() => {
        mountScrollDoneRef.current = true;
        // Re-check sentinels that were pre-visible during mount suppression
        recheckSentinels();
      });
      // Intentionally run only on mount; deps are stable
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // After window rebuild: instantly jump to the pending off-window target.
    // Smooth scroll is wrong here — the DOM was fully rebuilt so there is no
    // continuous path to animate along. Instant keeps the UX clean.
    useEffect(() => {
      const key = pendingScrollKeyRef.current;
      if (!key) return;
      const el = dateGroupRefs.current.get(key);
      if (!el) return;
      pendingScrollKeyRef.current = null;
      suppressReportUntilScrollEnd();
      requestAnimationFrame(() => {
        const top = el.getBoundingClientRect().top + window.scrollY - activeStickyTop - 8;
        window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
      });
    }, [dates, suppressReportUntilScrollEnd, activeStickyTop]);

    // ── Top sentinel: load more future dates (prepend at top) ────────────────
    // Fires when the user scrolls UP past the loaded future dates.
    // Extends window.end further into the future, capped at today+90 days.
    // Inserts new rows at the top — useLayoutEffect compensates the viewport shift.

    useEffect(() => {
      const sentinel = topSentinelRef.current;
      if (!sentinel) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting || isPrependingRef.current || !mountScrollDoneRef.current || suppressReportRef.current) return;

          // Ceiling: don't load more than 90 days into the future.
          // Pre-check via ref before setting the guard to prevent deadlock if state update is a no-op.
          const ceiling = addDays(new Date(), 90);
          if (dateWindowEndRef.current >= ceiling) return;

          // Capture scroll anchor: position of the current topmost (newest/future) date group.
          // useLayoutEffect will restore visual position after new rows are inserted above it.
          const anchorKey = localDateKey(dateWindowEndRef.current);
          const anchorEl = dateGroupRefs.current.get(anchorKey);
          if (anchorEl) {
            prependAnchorRef.current = { key: anchorKey, top: anchorEl.getBoundingClientRect().top };
          }

          isPrependingRef.current = true;
          setDateWindow(w => {
            const actualCeiling = addDays(new Date(), 90);
            // Safety: if state already at ceiling (ref was slightly stale), no-op.
            if (w.end >= actualCeiling) return w;
            const next = addDays(w.end, 7);
            return { ...w, end: next > actualCeiling ? actualCeiling : next };
          });
        },
        // 600px top margin preloads before user reaches the top of loaded future dates
        { rootMargin: '600px 0px 0px 0px', threshold: 0 },
      );
      observer.observe(sentinel);
      topObserverRef.current = observer;
      return () => {
        observer.disconnect();
        topObserverRef.current = null;
      };
    }, []);

    // Release prepend guard after 400ms; re-check sentinel in case still in preload margin.
    useEffect(() => {
      const timer = setTimeout(() => {
        isPrependingRef.current = false;
        recheckSentinels();
      }, 400);
      return () => clearTimeout(timer);
    // recheckSentinels is stable (useCallback with [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateWindow.end]);

    // ── Bottom sentinel: load older history (append at bottom) ──────────────
    // Fires when the user scrolls DOWN toward the oldest loaded date.
    // No scroll compensation needed — DOM grows below the viewport naturally.
    // Stops loading once the window extends 14 days past the oldest known record.

    useEffect(() => {
      const sentinel = bottomSentinelRef.current;
      if (!sentinel) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting || isAppendingRef.current || !mountScrollDoneRef.current || suppressReportRef.current) return;

          // Floor: don't load more than 14 days past the oldest known record.
          // If there is no data at all, cap at 90 days before today.
          const oldest = oldestDataDateRef.current;
          const floor = oldest ? addDays(oldest, -14) : addDays(new Date(), -90);
          if (dateWindowStartRef.current <= floor) return;

          isAppendingRef.current = true;
          setDateWindow(w => {
            const actualFloor = oldestDataDateRef.current ? addDays(oldestDataDateRef.current, -14) : addDays(new Date(), -90);
            const next = addDays(w.start, -7);
            return { ...w, start: next < actualFloor ? actualFloor : next };
          });
        },
        // 400px bottom margin fires before hitting the bottom of loaded history
        { rootMargin: '0px 0px 400px 0px', threshold: 0 },
      );
      observer.observe(sentinel);
      bottomObserverRef.current = observer;
      return () => {
        observer.disconnect();
        bottomObserverRef.current = null;
      };
    }, []);

    // After append: release the guard after 400ms to debounce momentum scrolling on phones
    useEffect(() => {
      const timer = setTimeout(() => {
        isAppendingRef.current = false;
      }, 400);
      return () => clearTimeout(timer);
    }, [dateWindow.start]);

    // Keep a ref so the IO observer callback always reads the latest value.
    const activeStickyTopRef = useRef(activeStickyTop);
    useEffect(() => {
      activeStickyTopRef.current = activeStickyTop;
    }, [activeStickyTop]);

    // ── Visible date IO — top-proximity: pick the date group closest to sticky header ──

    useEffect(() => {
      if (!onVisibleDateChange) return;
      // Map: id → viewport-relative top at last observation (only intersecting elements kept)
      const topMap = new Map<string, number>();
      // Debounce timer — prevents rapid scroll-driven IO bursts from hammering URL/state updates
      let reportTimer: ReturnType<typeof setTimeout> | null = null;

      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (!entry.target.id) return;
            if (entry.isIntersecting) {
              topMap.set(entry.target.id, entry.boundingClientRect.top);
            } else {
              topMap.delete(entry.target.id);
            }
          });

          if (suppressReportRef.current || !mountScrollDoneRef.current) return;

          // Winner = intersecting group whose top is closest to the sticky header bottom
          const threshold = activeStickyTopRef.current + 8;
          let bestId = '';
          let bestDist = Infinity;
          topMap.forEach((top, id) => {
            const dist = Math.abs(top - threshold);
            if (dist < bestDist) {
              bestDist = dist;
              bestId = id;
            }
          });

          if (bestId && bestId !== lastReportedRef.current) {
            // Debounce: wait for scroll to settle before updating URL/state.
            // This prevents rapid IO fires during scrolling from causing re-render churn
            // that could interfere with scroll position.
            if (reportTimer) clearTimeout(reportTimer);
            const capturedId = bestId;
            reportTimer = setTimeout(() => {
              if (capturedId !== lastReportedRef.current) {
                lastReportedRef.current = capturedId;
                onVisibleDateChange(capturedId);
              }
            }, 150);
          }
        },
        // Pixel inset excludes the sticky chrome; bottom half excluded to focus on "current" date
        { rootMargin: `-${activeStickyTop + 8}px 0px -50% 0px`, threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] },
      );

      dateGroupRefs.current.forEach(el => el && observer.observe(el));
      return () => {
        observer.disconnect();
        if (reportTimer) clearTimeout(reportTimer);
      };
    }, [dates, onVisibleDateChange, activeStickyTop]);

    // ── Stable callback ref factory ───────────────────────────────────────────

    const setDateGroupRef = useCallback(
      (key: string) => (el: HTMLElement | null) => {
        if (el) dateGroupRefs.current.set(key, el);
        else dateGroupRefs.current.delete(key);
      },
      [],
    );

    // ── Render helpers ────────────────────────────────────────────────────────

    const todayKey = localDateKey(new Date());

    return (
      <div className={cn('bg-card', className)} data-testid="journal-date-scroll">
        {/* Sticky-chrome height probe — its pageTop (rect.top + scrollY) is scroll-invariant
            and equals the height of all sticky headers above the journal content area. */}
        <div ref={stickyProbeRef} className="h-0" aria-hidden />
        <div ref={topSentinelRef} className="h-px" data-testid="top-sentinel" />

        {dates.map(date => {
          const key = localDateKey(date);
          const dayItems = itemsByDate.get(key) ?? [];
          const dayResults = dayItems.filter(i => i.type === 'result');
          const noteEntry = journalEntries?.get(key);
          const isToday = key === todayKey;
          const isFuture = date > new Date(todayKey + 'T23:59:59');
          const isEmpty = !noteEntry && dayResults.length === 0;

          return (
            <div
              key={key}
              id={key}
              ref={setDateGroupRef(key) as React.RefCallback<HTMLDivElement>}
              className="flex flex-col"
              style={{ scrollMarginTop: activeStickyTop + 8 }}
            >
              {/* Sticky date header */}
              <div
                className="sticky z-[5] px-6 py-2 bg-muted/80 backdrop-blur-sm border-y border-border flex items-center gap-2"
                style={{ top: activeStickyTop }}
              >
                <CalendarIcon className="size-3 text-muted-foreground" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {formatDateHeader(date)}
                  {isToday && <span className="ml-2 text-primary font-black">— Today</span>}
                </span>
              </div>

              <div className="flex flex-col gap-0 pb-1">
                {/* Note card — links to the journal entry for this date */}
                {noteEntry ? (
                  <button
                    onClick={() => onOpenEntry?.(key)}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/40 transition-colors text-left group"
                  >
                    <div className="flex-shrink-0 size-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <FileTextIcon className="size-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">
                        {noteEntry.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-medium">Note</p>
                    </div>
                    <ChevronRightIcon className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
                  </button>
                ) : null}

                {/* Results — split into Feeds, Workouts and Playground groups */}
                {(() => {
                  const feedResults = dayResults.filter(i => i.group === 'feeds')
                  const workoutResults = dayResults.filter(i => i.group !== 'playground' && i.group !== 'feeds')
                  const playgroundResults = dayResults.filter(i => i.group === 'playground')

                  const renderResultRow = (item: FilteredListItem) => (
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
                  )

                  const renderGroup = (label: string, items: FilteredListItem[]) =>
                    items.length > 0 && (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 px-6 pt-2 pb-1">
                          <div className="h-px flex-1 bg-border/40" />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                            {label}
                          </span>
                          <div className="h-px flex-1 bg-border/40" />
                        </div>
                        {items.map(renderResultRow)}
                      </div>
                    )

                  return (
                    <>
                      {renderGroup('Feeds', feedResults)}
                      {renderGroup('Workouts', workoutResults)}
                      {renderGroup('Playground', playgroundResults)}
                    </>
                  )
                })()}

                {/* Empty state — future dates show a "Plan workout" button; past dates show a quiet placeholder */}
                {isEmpty && (
                  isFuture ? (
                    <button
                      data-date={key}
                      data-testid="journal-plan-workout"
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

        <div ref={bottomSentinelRef} className="h-px" data-testid="bottom-sentinel" />

        {/* Beginning of records — shown at the very bottom once the oldest data floor is reached */}
        {oldestDataDate && dateWindow.start <= addDays(oldestDataDate, -14) && (
          <div className="flex items-center gap-3 px-6 py-6 select-none" aria-hidden>
            <div className="h-px flex-1 bg-border/30" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
              Beginning of records
            </span>
            <div className="h-px flex-1 bg-border/30" />
          </div>
        )}
      </div>
    );
  },
);

JournalDateScroll.displayName = 'JournalDateScroll';
