/**
 * Clock types for WOD Wiki
 * 
 * Type definitions for clock and timer components including
 * DigitalClock, ClockAnchor, and TimerHarness.
 */

import { TypedMemoryReference } from './runtime';

// NOTE: `core/` must not depend on `runtime/`. These runtime-facing types are
// intentionally declared as `unknown` here for legacy/compatibility.
import type { TimeSpan } from '../models/OutputStatement';

/**
 * Workout type constants
 */
export type WorkoutType = 'AMRAP' | 'FOR_TIME' | 'EMOM' | 'TABATA';

/**
 * Props for the DigitalClock component
 */
export interface DigitalClockProps {
  /** Block key to connect to runtime timer */
  blockKey: string;

  /** Title for the clock display */
  title?: string;

  /** Duration in milliseconds for countdown timers */
  duration?: number;

  /** Display type: 'down' or 'up' */
  timerType?: 'down' | 'up';

  /** Current round number */
  currentRound?: number;

  /** Optional metrics to display */
  metric: Array<{
    label: string;
    value: string | number;
    unit?: string;
  }>;

  /** Next card placeholder text */
  nextCardLabel?: string;
}

/**
 * Props for the ClockAnchor component
 */
export interface ClockAnchorProps {
  /** Block key to connect to runtime timer */
  blockKey: string;

  /** Title for the clock */
  title?: string;

  /** Description text */
  description?: string;

  /** Duration in milliseconds for countdown */
  duration?: number;

  /** Whether to show progress bar */
  showProgress?: boolean;

  /** Whether to show control buttons */
  showControls?: boolean;

  /** Workout type classification */
  workoutType?: WorkoutType;

  /** Current round number */
  currentRound?: number;

  /** Play button callback */
  onPlay?: () => void;

  /** Pause button callback */
  onPause?: () => void;

  /** Reset button callback */
  onReset?: () => void;

  /** Round complete callback */
  onRoundComplete?: () => void;

  /** External control of running state */
  isRunning?: boolean;
}

/**
 * Result object returned by TimerHarness
 */
export interface TimerHarnessResult {
  /** Script runtime instance */
  runtime: unknown;

  /** Block key for the timer */
  blockKey: string;

  /** Timer block instance */
  block: unknown;

  /** Memory references for timer state */
  memoryRefs: {
    timeSpans: TypedMemoryReference<TimeSpan[]>;
    isRunning: TypedMemoryReference<boolean>;
  };

  /** Timer control functions */
  controls: {
    start: () => void;
    stop: () => void;
    reset: () => void;
    pause: () => void;
    resume: () => void;
  };

  /** Current running state */
  isRunning: boolean;

  /** Function to trigger elapsed time recalculation */
  recalculateElapsed: () => void;
}

/**
 * Props for the TimerHarness component (harness with memory + controls)
 */
export interface TimerHarnessProps {
  /** Timer type: 'down' or 'up' */
  timerType: 'down' | 'up';

  /** Initial duration in milliseconds */
  durationMs: number;

  /** Whether the timer should start running immediately */
  autoStart?: boolean;

  /** Optional: Pre-configured time spans for complex scenarios */
  timeSpans?: TimeSpan[];

  /** Children to render with runtime context */
  children: (harness: TimerHarnessResult) => React.ReactNode;
}
