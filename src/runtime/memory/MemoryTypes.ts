import { ICodeFragment } from '../../core/models/CodeFragment';
import { TimeSpan } from '../models/TimeSpan';

/**
 * Timer direction for count-down vs count-up.
 */
export type TimerDirection = 'up' | 'down';

/**
 * Timer state stored in memory.
 * 
 * Contains the raw time spans (segments) for ground-truth calculation
 * and display metadata to guide the UI representation.
 */
export interface TimerState {
    /** 
     * Raw time segments being tracked. 
     * Aggregate these to calculate total elapsed time.
     */
    readonly spans: readonly TimeSpan[];

    /** Target duration in milliseconds (for countdowns or goals) */
    readonly durationMs?: number;

    /** Timer direction preference */
    readonly direction: TimerDirection;

    /** Human-readable label for the timer */
    readonly label: string;

    /** Timer role for UI prioritization */
    readonly role?: 'primary' | 'secondary' | 'auto';
}

/**
 * Round state stored in memory.
 * Represents current iteration and scale of a loop.
 */
export interface RoundState {
    /** Current round number (typically 1-based) */
    readonly current: number;

    /** Total number of rounds planned (undefined for unbounded) */
    readonly total: number | undefined;
}

/**
 * Fragment state stored in memory.
 * 
 * A collection of fragments hosted by the current block that should be 
 * inherited by its children in the runtime hierarchy.
 */
export interface FragmentState {
    /** Collection of fragments to be passed down */
    readonly fragments: readonly ICodeFragment[];
}

/**
 * Completion state stored in memory.
 * Tracks whether a block has completed and why.
 */
export interface CompletionState {
    /** Whether block is marked complete */
    readonly isComplete: boolean;

    /** Reason for completion */
    readonly reason?: 'timer-expired' | 'rounds-complete' | 'user-advance' | 'manual' | string;

    /** Timestamp of completion (epoch ms) */
    readonly completedAt?: number;
}

/**
 * Display state stored in memory.
 * UI-facing state for labels and modes.
 */
export interface DisplayState {
    /** Current display mode */
    readonly mode: 'clock' | 'timer' | 'countdown' | 'hidden';

    /** Primary label */
    readonly label: string;

    /** Secondary/subtitle label */
    readonly subtitle?: string;

    /** Formatted round string (e.g., "Round 2/5") */
    readonly roundDisplay?: string;

    /** Exercise/action being performed */
    readonly actionDisplay?: string;
}

/**
 * Union of all valid memory type keys.
 */
export type MemoryType = 'timer' | 'round' | 'fragment' | 'completion' | 'display';

/**
 * Registry mapping memory types to their corresponding data shapes.
 * Enables compile-time type safety when accessing block memory.
 * 
 * @example
 * const timer = block.getMemory('timer'); // Returns IMemoryEntry<'timer', TimerState>
 */
export interface MemoryTypeMap {
    timer: TimerState;
    round: RoundState;
    fragment: FragmentState;
    completion: CompletionState;
    display: DisplayState;
}

/**
 * Utility to resolve the value type for a given memory type key.
 */
export type MemoryValueOf<T extends MemoryType> = MemoryTypeMap[T];

