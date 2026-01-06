/**
 * Behavior Priority Constants
 * 
 * Defines execution order for behaviors within a RuntimeBlock.
 * Lower values execute earlier.
 * 
 * Priority Ranges:
 * - 0-99: Infrastructure (event routing, logging, debugging)
 * - 100-499: Pre-execution (timers, state setup, memory allocation)
 * - 500-999: Core logic (child runners, loops, business logic)
 * - 1000-1499: Post-execution (tracking, display, telemetry)
 * - 1500+: Cleanup (disposal, memory release, finalization)
 * 
 * @see https://github.com/SergeiGolos/wod-wiki/blob/main/docs/BEHAVIOR_OVERLAP_AND_RACE_CONDITIONS_ASSESSMENT.md#75-medium-priority-explicit-behavior-ordering
 */

// Range boundaries
export const PRIORITY_INFRASTRUCTURE_MAX = 99;
export const PRIORITY_PRE_EXECUTION_MIN = 100;
export const PRIORITY_PRE_EXECUTION_MAX = 499;
export const PRIORITY_CORE_MIN = 500;
export const PRIORITY_CORE_MAX = 999;
export const PRIORITY_POST_EXECUTION_MIN = 1000;
export const PRIORITY_POST_EXECUTION_MAX = 1499;
export const PRIORITY_CLEANUP_MIN = 1500;

// Default priority - neutral, post-execution
export const PRIORITY_DEFAULT = PRIORITY_POST_EXECUTION_MIN;

// Common behavior priorities
export const PRIORITY_ACTION_LAYER = 0;                          // 0: Infrastructure (must be first)
export const PRIORITY_TIMER = PRIORITY_PRE_EXECUTION_MIN;        // 100: Pre-execution (timer setup)
export const PRIORITY_TIMER_PAUSE_RESUME = PRIORITY_PRE_EXECUTION_MIN + 50;  // 150: Pre-execution (after timer)
export const PRIORITY_SOUND = PRIORITY_PRE_EXECUTION_MIN + 100;  // 200: Pre-execution (sound coordination)
export const PRIORITY_CHILD_INDEX = PRIORITY_CORE_MIN;           // 500: Core (child management)
export const PRIORITY_ROUND_TRACKING = PRIORITY_CORE_MIN + 50;   // 550: Core (round state)
export const PRIORITY_CHILD_RUNNER = PRIORITY_CORE_MIN + 100;    // 600: Core (child execution)
export const PRIORITY_COMPLETION = PRIORITY_CORE_MIN + 200;      // 700: Core (completion detection)
export const PRIORITY_HISTORY = PRIORITY_POST_EXECUTION_MIN + 200; // 1200: Post-execution (tracking)
export const PRIORITY_DISPLAY = PRIORITY_POST_EXECUTION_MIN + 300; // 1300: Post-execution (display)
