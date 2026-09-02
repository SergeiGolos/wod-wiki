import { TimeSpan } from '@bitcobblers/wod-wiki-engine';

/**
 * Formats a **TimeStamp** (Date or epoch ms) into HH:MM:SS format.
 * Returns 'running' if date is undefined.
 *
 * @see docs/architecture/time-terminology.md — TimeStamp is the system time
 * (Date.now()) when a message is logged.
 */
export const formatTimestamp = (date?: Date | number): string => {
  if (!date) return 'running';

  const dateObj = typeof date === 'number' ? new Date(date) : date;

  return dateObj.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Format milliseconds to MM:SS.ms display
 * e.g., 65432 -> "01:05.43"
 */
export const formatTime = (ms: number): string => {
  if (ms === undefined || ms === null || !Number.isFinite(ms)) {
    return '--:--.--';
  }
  const isNegative = ms < 0;
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((absMs % 1000) / 10);
  const sign = isNegative ? '-' : '';
  return `${sign}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
};

/**
 * Calculates **Elapsed** (sum of span durations) from an array of time spans.
 *
 * Equivalent to `calculateElapsed()` in `src/runtime/time/calculateElapsed.ts`.
 * Prefer the runtime version for new code; this exists for component-layer compat.
 *
 * @see docs/architecture/time-terminology.md
 */
export const calculateDuration = (spans: ReadonlyArray<TimeSpan | { started: number, ended?: number } | { start: number | Date, stop?: number | Date }>, now: number): number => {
  if (!spans || !Array.isArray(spans)) return 0;
  return spans.reduce((total, span) => {
    // Handle canonical TimeSpan or raw objects with 'started'/'ended'
    if ('started' in span) {
      const start = span.started;
      const end = span.ended ?? now;
      return total + Math.max(0, end - start);
    }

    // Handle legacy objects with 'start'/'stop'
    const start = span.start instanceof Date ? span.start.getTime() : (span.start || 0);
    const stop = span.stop ? (span.stop instanceof Date ? span.stop.getTime() : span.stop) : now;
    return total + Math.max(0, stop - start);
  }, 0);
};

/**
 * Rounds a duration in seconds to the nearest 0.1s.
 */
export const roundToTenth = (seconds: number): number => {
  if (!Number.isFinite(seconds)) return 0;
  return Math.round(seconds * 10) / 10;
};
