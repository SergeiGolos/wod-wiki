import { useEffect, useRef } from 'react';
import { telemetry } from './TelemetryService';

const DEFAULT_THRESHOLDS = [25, 50, 75, 90];

/**
 * Tracks vertical scroll depth milestones (25%, 50%, 75%, 90%) and emits standard
 * GA4 'scroll' telemetry events with `percent_scrolled` and `page_path`.
 */
export function useScrollTelemetry(
  path?: string,
  thresholds: number[] = DEFAULT_THRESHOLDS,
): void {
  const firedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!path || typeof window === 'undefined') return;

    firedRef.current.clear();

    // ponytail: passive scroll listener with 4 milestone thresholds; upgrade to rAF throttle if scroll churn is measured
    const handleScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;

      const percent = Math.round((window.scrollY / maxScroll) * 100);
      for (const threshold of thresholds) {
        if (percent >= threshold && !firedRef.current.has(threshold)) {
          firedRef.current.add(threshold);
          telemetry.record('scroll', { percent_scrolled: threshold, page_path: path });
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [path, thresholds]);
}
