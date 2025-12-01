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
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
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
    return spans.reduce((total, span) => {
        const start = span.start instanceof Date ? span.start.getTime() : span.start;
        const stop = span.stop ? (span.stop instanceof Date ? span.stop.getTime() : span.stop) : now;
        return total + (stop - start);
    }, 0);
};

/**
 * Rounds a duration in seconds to the nearest 0.1s.
 */
export const roundToTenth = (seconds: number): number => {
    return Math.round(seconds * 10) / 10;
};
