/**
 * Display Stack Types
 * 
 * Types for the visual timer stack and display card system.
 * These types define the memory structures that blocks can push
 * to control what the Clock UI displays.
 */

/**
 * Timer display entry that blocks push onto the visual stack.
 * Each entry references a timer memory location and defines
 * how it should be displayed.
 */
export interface ITimerDisplayEntry {
  /** Unique identifier for this display entry */
  id: string;

  /** Block key that owns this timer display */
  ownerId: string;

  /** Memory reference ID pointing to the timer data (TimeSpan[]) */
  timerMemoryId: string;

  /** Custom label to display (defaults to effort label from the block) */
  label?: string;

  /** Timer format: 'countdown' shows remaining, 'countup' shows elapsed */
  format: 'countdown' | 'countup';

  /** Duration in milliseconds (for countdown format) */
  durationMs?: number;

  /** Optional button configurations to display with this timer */
  buttons?: IDisplayButton[];

  /** Priority for display ordering (lower = more important) */
  priority?: number;

  /** Semantic role of the timer */
  role?: 'primary' | 'secondary' | 'auto';

  /** 
   * Accumulated time from previous spans (for paused/resumed timers).
   * Used for calculating live display time without memory subscription.
   */
  accumulatedMs?: number;

  /**
   * Start time of the current running span (epoch ms).
   * If undefined, timer is not currently running a span.
   */
  startTime?: number;

  /** Whether the timer is currently running */
  isRunning?: boolean;
}

/**
 * Button that can be displayed with a timer or card
 */
export interface IDisplayButton {
  /** Unique identifier for this button */
  id: string;

  /** Button label text */
  label: string;

  /** Event name to emit when clicked */
  eventName: string;

  /** Optional payload to include with the event */
  payload?: Record<string, unknown>;

  /** Button variant for styling */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';

  /** Optional icon identifier */
  icon?: string;
}

/**
 * Display card content type registry.
 * Cards can display different content types based on runtime state.
 */
export type DisplayCardType =
  | 'idle-start'      // Workout not started - "Start Workout"
  | 'idle-complete'   // Workout finished - "View Analytics"
  | 'active-block'    // Currently executing block - shows metrics
  | 'rest-period'     // Rest period between efforts
  | 'custom';         // Custom component specified by componentId

/**
 * Display card entry that appears below the timer.
 * Shows context about the current workout state.
 */
export interface IDisplayCardEntry {
  /** Unique identifier for this card */
  id: string;

  /** Block key that owns this card */
  ownerId: string;

  /** Type of card content to render */
  type: DisplayCardType;

  /** Title displayed on the card */
  title?: string;

  /** Subtitle or description */
  subtitle?: string;

  /** 
   * For 'active-block' type: the metrics/fragments to display 
   * These should match the format used by FragmentVisualizer
   */
  metrics?: IDisplayMetric[];

  /**
   * Optional grouped metrics for multi-row display.
   * If present, this takes precedence over 'metrics'.
   */
  metricGroups?: IDisplayMetric[][];

  /** For 'custom' type: the component ID to render */
  componentId?: string;

  /** Additional props to pass to the component */
  componentProps?: Record<string, unknown>;

  /** Optional buttons to display on this card */
  buttons?: IDisplayButton[];

  /** Priority for display ordering */
  priority?: number;

  /** 
   * Optional memory ID for a timer associated with this card.
   * Allows the card to display a running timer (e.g. for the active block).
   */
  timerMemoryId?: string;
}

/**
 * Metric to display on an active block card.
 * Mirrors the fragment display format for consistency.
 */
export interface IDisplayMetric {
  /** Type of metric (e.g., 'reps', 'weight', 'distance') */
  type: string;

  /** Display value */
  value: string | number;

  /** Original fragment image/text */
  image?: string;

  /** Unit label (e.g., 'lbs', 'm', 'cal') */
  unit?: string;

  /** Whether this metric is currently active/highlighted */
  isActive?: boolean;
}

/**
 * Complete display state stored in memory.
 * The Clock UI subscribes to this to render the current display.
 */
export interface IDisplayStackState {
  /** Stack of timer displays (last = top = currently shown) */
  timerStack: ITimerDisplayEntry[];

  /** Stack of display cards (last = top = currently shown) */
  cardStack: IDisplayCardEntry[];

  /** Global workout state */
  workoutState: 'idle' | 'running' | 'paused' | 'complete' | 'error';

  /**
   * Memory reference ID for the global workout timer.
   * This timer persists across the entire workout duration.
   */
  globalTimerMemoryId?: string;

  /**
   * Memory reference ID for the current lap/round timer.
   * Tracks the duration of the current round or interval.
   */
  currentLapTimerMemoryId?: string;

  /** Total elapsed time across the entire workout (ms) */
  totalElapsedMs?: number;

  /** Current round number if applicable */
  currentRound?: number;

  /** Total rounds if applicable */
  totalRounds?: number;
}

/**
 * Default display state factory
 */
export function createDefaultDisplayState(): IDisplayStackState {
  return {
    timerStack: [],
    cardStack: [],
    workoutState: 'idle',
    totalElapsedMs: 0,
  };
}
