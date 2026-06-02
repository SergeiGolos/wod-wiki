import { useEffect, useMemo, useRef, useCallback } from 'react';

export interface UseActiveScrollSectionOptions {
  /** Section element ids to observe in document order. */
  ids: string[];
  /** Enable or disable the observer entirely. */
  enabled?: boolean;
  /** IntersectionObserver root margin. */
  rootMargin?: string;
  /** IntersectionObserver thresholds. */
  threshold?: number[];
  /** Called when a new active section wins. */
  onChange: (id: string) => void;
  /** Optional guard used to suppress updates (e.g. during programmatic scroll). */
  shouldAcceptChange?: (id: string) => boolean;
  /**
   * Selection strategy when multiple sections are visible.
   * - 'ratio': pick the section with the highest intersection ratio (default).
   * - 'topmost-when-up': when scrolling up, pick the topmost (earliest in doc order)
   *   intersecting section instead of the one with the highest ratio.
   */
  scrollDirection?: 'ratio' | 'topmost-when-up';
  /** HTML data attribute to read the section id from (e.g. 'data-section-id'). Falls back to `element.id`. */
  dataAttribute?: string;
  /** Debounce delay in ms before firing `onChange`. 0 = no debounce. */
  debounceMs?: number;
}

/**
 * Shared scroll-tracking hook used by page shells and section dropdowns.
 *
 * Tracks the most-visible observed section using a persistent ratio map so the
 * active section does not oscillate when multiple entries cross thresholds in
 * quick succession.
 *
 * Optional enhancements:
 * - `scrollDirection: 'topmost-when-up'` changes the winner strategy based on
 *   scroll direction (requires a scroll listener).
 * - `dataAttribute` observes elements by a data attribute rather than `id`.
 * - `debounceMs` delays the `onChange` callback to reduce churn.
 */
export function useActiveScrollSection({
  ids,
  enabled = true,
  rootMargin = '-10% 0px -40% 0px',
  threshold = [0, 0.3, 1],
  onChange,
  shouldAcceptChange,
  scrollDirection = 'ratio',
  dataAttribute,
  debounceMs = 0,
}: UseActiveScrollSectionOptions): void {
  const lastActiveIdRef = useRef('');
  const onChangeRef = useRef(onChange);
  const shouldAcceptChangeRef = useRef(shouldAcceptChange);
  const debounceTimerRef = useRef<number | null>(null);
  const scrollDirRef = useRef<1 | -1>(1);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    shouldAcceptChangeRef.current = shouldAcceptChange;
  }, [shouldAcceptChange]);

  const normalizedIds = useMemo(() => Array.from(new Set(ids.filter(Boolean))), [ids.join('\u0000')]);
  const normalizedThreshold = useMemo(() => [...threshold], [threshold.join(',')]);

  const flushDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || normalizedIds.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const ratioMap = new Map<string, number>();

    const getId = (el: Element): string | null => {
      if (dataAttribute) {
        return el.getAttribute(dataAttribute);
      }
      return el.id || null;
    };

    // Scroll-direction tracking (only when needed)
    let removeScrollListener: (() => void) | undefined;
    if (scrollDirection === 'topmost-when-up') {
      let lastScrollY = window.scrollY;
      const trackScroll = () => {
        const y = window.scrollY;
        if (y !== lastScrollY) {
          scrollDirRef.current = y > lastScrollY ? 1 : -1;
        }
        lastScrollY = y;
      };
      window.addEventListener('scroll', trackScroll, { passive: true });
      removeScrollListener = () => window.removeEventListener('scroll', trackScroll);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = getId(entry.target);
          if (!id) return;

          if (entry.isIntersecting) {
            ratioMap.set(id, entry.intersectionRatio);
          } else {
            ratioMap.delete(id);
          }
        });

        if (ratioMap.size === 0) {
          return;
        }

        let bestId = '';
        if (scrollDirection === 'topmost-when-up' && scrollDirRef.current === -1) {
          let bestOrder = Infinity;
          ratioMap.forEach((_, id) => {
            const order = normalizedIds.indexOf(id);
            if (order >= 0 && order < bestOrder) {
              bestOrder = order;
              bestId = id;
            }
          });
        } else {
          let bestRatio = -1;
          ratioMap.forEach((ratio, id) => {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestId = id;
            }
          });
        }

        if (!bestId || bestId === lastActiveIdRef.current) {
          return;
        }

        if (shouldAcceptChangeRef.current && !shouldAcceptChangeRef.current(bestId)) {
          return;
        }

        lastActiveIdRef.current = bestId;

        if (debounceMs > 0) {
          flushDebounce();
          debounceTimerRef.current = setTimeout(() => {
            onChangeRef.current(bestId);
            debounceTimerRef.current = null;
          }, debounceMs);
        } else {
          onChangeRef.current(bestId);
        }
      },
      { rootMargin, threshold: normalizedThreshold },
    );

    normalizedIds.forEach((id) => {
      const element = dataAttribute
        ? document.querySelector(`[${dataAttribute}="${id}"]`)
        : document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => {
      observer.disconnect();
      flushDebounce();
      removeScrollListener?.();
    };
  }, [enabled, normalizedIds, normalizedThreshold, rootMargin, scrollDirection, dataAttribute, debounceMs, flushDebounce]);
}

export default useActiveScrollSection;
