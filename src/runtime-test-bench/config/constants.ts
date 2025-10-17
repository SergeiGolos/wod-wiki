/**
 * RuntimeTestBench Configuration Constants
 * 
 * Centralized configuration values for runtime execution and UI behavior.
 * 
 * Phase: 1.3 Foundation - Infrastructure
 */

/**
 * Fixed execution tick rate in milliseconds
 * 
 * Decision Rationale (from proposal):
 * - Fixed at 20ms (50 ticks per second)
 * - Speed control UI removed to eliminate complexity
 * - Provides consistent, predictable execution timing
 * - Matches fitness timer requirements (50fps granularity)
 * 
 * Usage:
 * ```typescript
 * setInterval(executeStep, EXECUTION_TICK_RATE_MS);
 * ```
 */
export const EXECUTION_TICK_RATE_MS = 20;

/**
 * Debounce delay for script parsing in milliseconds
 * 
 * Applied to editor onChange events to avoid excessive re-parsing
 */
export const PARSE_DEBOUNCE_MS = 500;

/**
 * Maximum number of execution steps before safety cutoff
 * 
 * Prevents infinite loops from hanging the UI
 */
export const MAX_EXECUTION_STEPS = 10000;
