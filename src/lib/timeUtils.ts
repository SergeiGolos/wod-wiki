/**
 * Formats a timestamp (Date or number) into HH:MM:SS format.
 * Returns 'running' if date is undefined.
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
 * Interface for a time span.
 */
export interface TimeSpan {
  start: number; // Changed from Date to number for consistency with calculations
  stop?: number;
}

/**
 * Calculates the total duration of an array of time spans.
 * @param spans Array of time spans
 * @param now Current timestamp (defaults to Date.now())
 * @returns Total duration in milliseconds
 */
export const calculateDuration = (spans: { start: number | Date, stop?: number | Date }[], now: number = Date.now()): number => {
  if (!spans || !Array.isArray(spans)) return 0;
  return spans.reduce((total, span) => {
    const start = span.start instanceof Date ? span.start.getTime() : (span.start || 0);
    const stop = span.stop ? (span.stop instanceof Date ? span.stop.getTime() : span.stop) : now;
    return total + Math.max(0, stop - start); // Ensure no negative durations from weird inputs
  }, 0);
};

/**
 * Rounds a duration in seconds to the nearest 0.1s.
 */
export const roundToTenth = (seconds: number): number => {
  if (!Number.isFinite(seconds)) return 0;
  return Math.round(seconds * 10) / 10;
};
