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
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const bottomSentinelRef = useRef<HTMLDivElement>(null);

    // Stored observer refs so we can reconnect them after programmatic scrolls
    const topObserverRef = useRef<IntersectionObserver | null>(null);
    const bottomObserverRef = useRef<IntersectionObserver | null>(null);

    // Map from date key → DOM element; populated via stable callback refs during render.
    const dateGroupRefs = useRef<Map<string, HTMLElement>>(new Map());

    // Prepend scroll anchoring — anchor-element-based to avoid scrollHeight over-compensation
    const isPrependingRef = useRef(false);
    const prependAnchorElRef = useRef<HTMLElement | null>(null);
    const prependAnchorTopRef = useRef(0);

    // Append guard — prevents burst-loading when bottom sentinel stays visible
    const isAppendingRef = useRef(false);

    // Suppress sentinel firing until the initial mount scroll has completed
    const mountScrollDoneRef = useRef(false);

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
        end: addDays(anchor, 14),
      };
    });

    // Ascending list of all dates in the window (oldest → newest).
    // Today sits in the middle; scroll up = past, scroll down = future.
    const dates = useMemo(() => {
      const result: Date[] = [];
      let d = new Date(dateWindow.start);
      const stop = dateWindow.end;
      while (d <= stop) {
        result.push(new Date(d));
        d = addDays(d, 1);
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
      const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset - 8;
      window.scrollTo({ top, behavior: 'smooth' });
    }, [stickyOffset]);

    useImperativeHandle(ref, () => ({
      scrollToDate(date: Date) {
        const key = localDateKey(date);
        const el = dateGroupRefs.current.get(key);
        if (el) {
          suppressReportUntilScrollEnd();
          scrollToElement(el);
        } else {
          // Date is outside the current window — rebuild symmetric window around it
          pendingScrollKeyRef.current = key;
          setDateWindow({
            start: addDays(date, -14),
            end: addDays(date, 14),
          });
        }
      },
    }), [suppressReportUntilScrollEnd, scrollToElement]);

    // On mount: instantly center today (or initialDate) in the viewport.
    // Sentinels are suppressed until this completes to avoid mount-time burst loading.
    useEffect(() => {
      const key = localDateKey(initialDate ?? new Date());
      const el = dateGroupRefs.current.get(key);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Center the date group in the viewport
        const top = rect.top + window.scrollY - window.innerHeight / 2 + rect.height / 2;
        window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
      }
      requestAnimationFrame(() => {
        mountScrollDoneRef.current = true;
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
        const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset - 8;
        window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
      });
    }, [dates, suppressReportUntilScrollEnd, stickyOffset]);

    // ── Top sentinel: load past dates (prepend older at top) ─────────────────

    useEffect(() => {
      const sentinel = topSentinelRef.current;
      if (!sentinel) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting || isPrependingRef.current || !mountScrollDoneRef.current || suppressReportRef.current) return;
          isPrependingRef.current = true;
          // Anchor on the current visible date group to compensate after DOM grows above
          const anchorKey = lastReportedRef.current;
          const anchorEl = anchorKey ? dateGroupRefs.current.get(anchorKey) : [...dateGroupRefs.current.values()][0];
          prependAnchorElRef.current = anchorEl ?? null;
          prependAnchorTopRef.current = anchorEl ? anchorEl.getBoundingClientRect().top : 0;
          setDateWindow(w => ({ ...w, start: addDays(w.start, -7) }));
        },
        // root:null = window viewport; 600px top margin fires ~4 date groups before hitting top
        { rootMargin: '600px 0px 0px 0px', threshold: 0 },
      );
      observer.observe(sentinel);
      topObserverRef.current = observer;
      return () => {
        observer.disconnect();
        topObserverRef.current = null;
      };
    }, []);

    // After prepend: compensate scroll so the viewport stays on the same date
    useLayoutEffect(() => {
      const el = prependAnchorElRef.current;
      if (!el) return;
      const delta = el.getBoundingClientRect().top - prependAnchorTopRef.current;
      if (delta !== 0) window.scrollBy({ top: delta, behavior: 'auto' });
      prependAnchorElRef.current = null;
      prependAnchorTopRef.current = 0;
      requestAnimationFrame(() => {
        isPrependingRef.current = false;
      });
    }, [dateWindow.start]);

    // ── Bottom sentinel: load future dates (append newer at bottom) ───────────

    useEffect(() => {
      const sentinel = bottomSentinelRef.current;
      if (!sentinel) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting || isAppendingRef.current || !mountScrollDoneRef.current || suppressReportRef.current) return;
          isAppendingRef.current = true;
          setDateWindow(w => ({ ...w, end: addDays(w.end, 7) }));
        },
        // root:null = window viewport; 600px bottom margin fires ~4 date groups before hitting bottom
        { rootMargin: '0px 0px 600px 0px', threshold: 0 },
      );
      observer.observe(sentinel);
      bottomObserverRef.current = observer;
      return () => {
        observer.disconnect();
        bottomObserverRef.current = null;
      };
    }, []);

    // After append: release the guard once DOM has settled
    useEffect(() => {
      requestAnimationFrame(() => {
        isAppendingRef.current = false;
      });
    }, [dateWindow.end]);

    // ── Visible date IO — top-proximity: pick the date group closest to sticky header ──

    useEffect(() => {
      if (!onVisibleDateChange) return;
      // Map: id → viewport-relative top at last observation (only intersecting elements kept)
      const topMap = new Map<string, number>();

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

          if (suppressReportRef.current) return;

          // Winner = intersecting group whose top is closest to the sticky header bottom
          const threshold = stickyOffset + 8;
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
            lastReportedRef.current = bestId;
            onVisibleDateChange(bestId);
          }
        },
        // Pixel inset excludes the sticky chrome; bottom half excluded to focus on "current" date
        { rootMargin: `-${stickyOffset + 8}px 0px -50% 0px`, threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] },
      );

      dateGroupRefs.current.forEach(el => el && observer.observe(el));
      return () => observer.disconnect();
    }, [dates, onVisibleDateChange, stickyOffset]);

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
      <div className={cn('bg-card', className)}>
        <div ref={topSentinelRef} className="h-px" />

        {dates.map(date => {
          const key = localDateKey(date);
          const dayItems = itemsByDate.get(key) ?? [];
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              id={key}
              ref={setDateGroupRef(key) as React.RefCallback<HTMLDivElement>}
              className="flex flex-col"
              style={{ scrollMarginTop: stickyOffset + 8 }}
            >
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

              {/* Ghost "Add note" row — only on today and future dates */}
              {key >= todayKey && (
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
              )}
            </div>
          );
        })}

        <div ref={bottomSentinelRef} className="h-px" />
      </div>
    );
  },
);

JournalDateScroll.displayName = 'JournalDateScroll';
