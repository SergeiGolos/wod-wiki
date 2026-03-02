/**
 * Constants for Cast / WebRTC configuration
 */

/**
 * Default cast protocol version
 */
export const CAST_PROTOCOL_VERSION = '1.0.0';

/**
 * Default metrics sync interval in milliseconds
 */
export const DEFAULT_METRICS_SYNC_INTERVAL_MS = 5000;

/**
 * Timeout (ms) for the WebRTC DataChannel to open during connect().
 */
export const WEBRTC_CONNECT_TIMEOUT_MS = 15_000;

/**
 * Name of the RTCDataChannel used for workout data.
 */
export const DATA_CHANNEL_LABEL = 'wod-wiki';
