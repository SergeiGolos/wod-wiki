/**
 * Clock Stories Index
 *
 * This file organizes all clock-related stories in the new unified format.
 * The clock stories have been restructured to use a consistent harness component
 * that provides memory visualization, timer controls, and recalculate functionality.
 */

// Main story exports
export { default as CountdownTimers } from './CountdownTimers.stories';
export { default as CountUpTimers } from './CountUpTimers.stories';

// Unified story wrapper
export { UnifiedClockStory } from './UnifiedClockStory';
export type { UnifiedClockStoryConfig } from './UnifiedClockStory';

// Timer harness components
export {
  TimerHarness,
  MemoryCard,
  TimerControls
} from '../../src/clock/components/TimerHarness';
export type {
  TimerHarnessProps,
  TimerHarnessResult
} from '../../src/clock/components/TimerHarness';

// Digital Clock component
export { DigitalClock } from '../../src/clock/components/DigitalClock';
export type { DigitalClockProps } from '../../src/clock/components/DigitalClock';

// Legacy timer control stories (preserved for reference)
// These demonstrate the old format before migration to unified stories
export { default as TimerControl } from './TimerControl.stories';

/**
 * Migration Notes:
 *
 * The clock stories have been completely restructured to use a unified format:
 *
 * OLD STRUCTURE:
 * - TimerControl.stories.tsx (interactive controls only)
 * - RunningTimers.stories.tsx (running states only)
 * - CompletedTimers.stories.tsx (completed states only)
 * - EdgeCases.stories.tsx (edge cases only)
 *
 * NEW STRUCTURE:
 * - CountdownTimers.stories.tsx (all countdown scenarios)
 * - CountUpTimers.stories.tsx (all count up scenarios)
 * - UnifiedClockStory.tsx (shared wrapper component)
 * - TimerHarness.tsx (harness with memory + controls)
 *
 * Each new story includes:
 * - Clock display
 * - Memory card with start/stop table
 * - Recalculate elapsed time button
 * - Interactive timer controls
 * - Running, stopped, and edge case examples
 *
 * The TimerControl.stories.tsx file is preserved for reference but should be
 * considered deprecated in favor of the new unified format.
 */
