import { TimeSpan } from '../runtime/models/TimeSpan';

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
export const calculateDuration = (spans: ReadonlyArray<TimeSpan | { started: number, ended?: number } | { start: number | Date, stop?: number | Date }>, now: number = Date.now()): number => {
  if (!spans || !Array.isArray(spans)) return 0;
  return spans.reduce((total, span) => {
    // Handle canonical TimeSpan or raw objects with 'started'/'ended'
    if ('started' in span) {
      const start = (span as any).started;
      const end = (span as any).ended ?? now;
      return total + Math.max(0, end - start);
    }

    // Handle legacy objects with 'start'/'stop'
    const start = (span as any).start instanceof Date ? (span as any).start.getTime() : ((span as any).start || 0);
    const stop = (span as any).stop ? ((span as any).stop instanceof Date ? (span as any).stop.getTime() : (span as any).stop) : now;
    return total + Math.max(0, (stop as number) - (start as number));
  }, 0);
};

/**
 * Rounds a duration in seconds to the nearest 0.1s.
 */
export const roundToTenth = (seconds: number): number => {
  if (!Number.isFinite(seconds)) return 0;
  return Math.round(seconds * 10) / 10;
};
