/**
 * Constants for Cast Manager configuration
 */

/**
 * Maximum number of reconnection attempts before giving up
 */
export const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Base delay for reconnection attempts in seconds
 * Uses exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at MAX_RECONNECT_DELAY_SECONDS
 */
export const RECONNECT_BASE_DELAY_SECONDS = 1;

/**
 * Maximum delay between reconnection attempts in seconds
 */
export const MAX_RECONNECT_DELAY_SECONDS = 30;

/**
 * Jitter percentage (0-1) to add randomness to reconnection delays
 * Helps prevent thundering herd problem when multiple clients reconnect
 */
export const RECONNECT_JITTER_PERCENT = 0.3;

/**
 * Device ID prefix for web clients
 */
export const WEB_DEVICE_ID_PREFIX = 'web-';

/**
 * Device ID length (after prefix)
 */
export const DEVICE_ID_LENGTH = 8;

/**
 * Default cast protocol version
 */
export const CAST_PROTOCOL_VERSION = '1.0.0';

/**
 * Default metrics sync interval in milliseconds
 */
export const DEFAULT_METRICS_SYNC_INTERVAL_MS = 5000;
