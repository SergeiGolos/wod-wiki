/**
 * Clock Entry Point for WOD Wiki
 * 
 * Exports timer and clock components for workout tracking and display.
 * Includes DigitalClock, ClockAnchor, and timer-related hooks.
 * 
 * @example
 * ```typescript
 * import { DigitalClock, ClockAnchor } from 'wod-wiki/clock';
 * ```
 */

// Main clock components
export { DigitalClock } from './clock/components/DigitalClock';
export type { DigitalClockProps } from './clock/components/DigitalClock';

export { EnhancedTimerHarness } from './clock/components/EnhancedTimerHarness';
export type { EnhancedTimerHarnessProps, EnhancedTimerHarnessResult } from './clock/components/EnhancedTimerHarness';

export { TimeDisplay } from './clock/components/TimeDisplay';
export { TimeUnit } from './clock/components/TimeUnit';

// Clock anchors
export { ClockAnchor } from './clock/anchors/ClockAnchor';
export { LabelAnchor } from './clock/anchors/LabelAnchor';
export { MetricAnchor } from './clock/anchors/MetricAnchor';

// Timer hooks
export { useTimespan } from './clock/hooks/useStopwatch';
export type { TimeValue } from './clock/hooks/useStopwatch';
export { useTimerElapsed } from './runtime/hooks/useTimerElapsed';

// Timer memory visualization
export { TimerMemoryVisualization } from './clock/TimerMemoryVisualization';

// Constants
export { TIMER_COLORS, WORKOUT_TYPES, HEART_RATE_ZONES, WORKOUT_TYPE_COLORS } from './lib/constants';
