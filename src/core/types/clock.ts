/**
 * Clock types for WOD Wiki
 * 
 * Type definitions for clock and timer components including
 * DigitalClock, ClockAnchor, and EnhancedTimerHarness.
 */

import { TypedMemoryReference } from './runtime';
import type { ScriptRuntime } from '@/runtime/ScriptRuntime';
import type { RuntimeBlock } from '@/runtime/RuntimeBlock';
import type { TimeSpan } from '@/runtime/behaviors/TimerBehavior';

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
  
  /** Display type: 'countdown' or 'countup' */
  timerType?: 'countdown' | 'countup';
  
  /** Current round number */
  currentRound?: number;
  
  /** Optional metrics to display */
  metrics?: Array<{
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
 * Result object returned by EnhancedTimerHarness
 */
export interface EnhancedTimerHarnessResult {
  /** Script runtime instance */
  runtime: ScriptRuntime;
  
  /** Block key for the timer */
  blockKey: string;
  
  /** Timer block instance */
  block: RuntimeBlock;
  
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
 * Props for the EnhancedTimerHarness component
 */
export interface EnhancedTimerHarnessProps {
  /** Timer type: 'countdown' or 'countup' */
  timerType: 'countdown' | 'countup';
  
  /** Initial duration in milliseconds */
  durationMs: number;
  
  /** Whether the timer should start running immediately */
  autoStart?: boolean;
  
  /** Optional: Pre-configured time spans for complex scenarios */
  timeSpans?: TimeSpan[];
  
  /** Children to render with runtime context */
  children: (harness: EnhancedTimerHarnessResult) => React.ReactNode;
}

/**
 * Re-export TimeSpan from TimerBehavior
 */
export type { TimeSpan } from '@/runtime/behaviors/TimerBehavior';
