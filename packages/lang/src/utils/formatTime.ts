/**
 * Canonical time formatting utilities
 * Consolidates 15+ inline formatter implementations across the codebase
 * 
 * All formatters handle edge cases: null, undefined, negative numbers, non-finite values
 */

/**
 * Formats milliseconds to MM:SS format
 * e.g., 65432 → "01:05" (~65 seconds)
 */
export const formatTimeMMSS = (ms: number): string => {
  if (ms === undefined || ms === null || !Number.isFinite(ms)) {
    return '--:--';
  }
  const isNegative = ms < 0;
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const sign = isNegative ? '-' : '';
  return `${sign}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Formats milliseconds to HH:MM:SS format
 * e.g., 3665432 → "01:01:05" (~1 hour, 1 minute, 5 seconds)
 */
export const formatTimeHHMMSS = (ms: number): string => {
  if (ms === undefined || ms === null || !Number.isFinite(ms)) {
    return '--:--:--';
  }
  const isNegative = ms < 0;
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const sign = isNegative ? '-' : '';
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Formats milliseconds to MM:SS.ms format (with centisecond precision)
 * e.g., 65432 → "01:05.43" (~65.4 seconds)
 */
export const formatTimePrecise = (ms: number): string => {
  if (ms === undefined || ms === null || !Number.isFinite(ms)) {
    return '--:--.--';
  }
  const isNegative = ms < 0;
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((absMs % 1000) / 10);
  const sign = isNegative ? '-' : '';
  return `${sign}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

/**
 * Formats seconds to MM:SS format
 * NOTE: Input is SECONDS, not milliseconds (unlike the ms variants above)
 * e.g., 65 → "01:05"
 * 
 * Use this ONLY for callers that have seconds-based time values
 */
export const formatSecondsMMSS = (seconds: number): string => {
  if (seconds === undefined || seconds === null || !Number.isFinite(seconds)) {
    return '--:--';
  }
  const isNegative = seconds < 0;
  const absSeconds = Math.abs(seconds);
  const mins = Math.floor(absSeconds / 60);
  const secs = Math.floor(absSeconds % 60);
  const sign = isNegative ? '-' : '';
  return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Formats seconds to HH:MM:SS format
 * NOTE: Input is SECONDS, not milliseconds
 * e.g., 3665 → "01:01:05"
 */
export const formatSecondsHHMMSS = (seconds: number): string => {
  if (seconds === undefined || seconds === null || !Number.isFinite(seconds)) {
    return '--:--:--';
  }
  const isNegative = seconds < 0;
  const absSeconds = Math.abs(seconds);
  const hours = Math.floor(absSeconds / 3600);
  const mins = Math.floor((absSeconds % 3600) / 60);
  const secs = Math.floor(absSeconds % 60);
  const sign = isNegative ? '-' : '';
  return `${sign}${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Smart duration formatter: chooses MM:SS or HH:MM:SS based on total duration
 * If duration >= 1 hour: returns HH:MM:SS, else MM:SS
 * Input: milliseconds
 */
export const formatDurationSmart = (ms: number): string => {
  if (ms === undefined || ms === null || !Number.isFinite(ms)) {
    return '--:--';
  }
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  if (totalSeconds >= 3600) {
    return formatTimeHHMMSS(ms);
  }
  return formatTimeMMSS(ms);
};

/**
 * Compact duration format: M:SS.m or MM:SS depending on magnitude
 * e.g., 5432 → "5:43", 65432 → "01:05"
 * Input: milliseconds
 * 
 * Use this only for space-constrained UIs
 */
export const formatDurationCompact = (ms: number): string => {
  if (ms === undefined || ms === null || !Number.isFinite(ms)) {
    return '--:--';
  }
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  // If minutes < 10, use compact format without leading zero
  if (minutes < 10) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Otherwise use standard MM:SS
  return formatTimeMMSS(ms);
};

/**
 * Formats a timestamp (Date or number) into HH:MM:SS format
 * e.g., new Date('2024-01-01T12:34:56Z') → "12:34:56"
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
