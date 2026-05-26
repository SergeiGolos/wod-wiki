import { useEffect, useMemo, useRef } from 'react';

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
}

/**
 * Shared scroll-tracking hook used by page shells and section dropdowns.
 *
 * Tracks the most-visible observed section using a persistent ratio map so the
 * active section does not oscillate when multiple entries cross thresholds in
 * quick succession.
 */
export function useActiveScrollSection({
  ids,
  enabled = true,
  rootMargin = '-10% 0px -40% 0px',
  threshold = [0, 0.3, 1],
  onChange,
  shouldAcceptChange,
}: UseActiveScrollSectionOptions): void {
  const lastActiveIdRef = useRef('');
  const onChangeRef = useRef(onChange);
  const shouldAcceptChangeRef = useRef(shouldAcceptChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    shouldAcceptChangeRef.current = shouldAcceptChange;
  }, [shouldAcceptChange]);

  const normalizedIds = useMemo(() => Array.from(new Set(ids.filter(Boolean))), [ids.join('\u0000')]);
  const normalizedThreshold = useMemo(() => [...threshold], [threshold.join(',')]);

  useEffect(() => {
    if (!enabled || normalizedIds.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const ratioMap = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          if (!id) return;

          if (entry.isIntersecting) {
            ratioMap.set(id, entry.intersectionRatio);
          } else {
            ratioMap.delete(id);
          }
        });

        let bestId = '';
        let bestRatio = -1;
        ratioMap.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });

        if (!bestId || bestId === lastActiveIdRef.current) {
          return;
        }

        if (shouldAcceptChangeRef.current && !shouldAcceptChangeRef.current(bestId)) {
          return;
        }

        lastActiveIdRef.current = bestId;
        onChangeRef.current(bestId);
      },
      { rootMargin, threshold: normalizedThreshold },
    );

    normalizedIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [enabled, normalizedIds, normalizedThreshold, rootMargin]);
}

export default useActiveScrollSection;
