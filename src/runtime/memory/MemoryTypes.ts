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
 * Fragment groups represent semantic groupings from compilation (e.g., per-round,
 * per-interval). Each inner array is one group produced by the fragment distributor.
 * This preserves the multi-dimensional structure through the entire pipeline:
 * Parser → Strategy → BlockBuilder → FragmentGroupStore → RuntimeBlock
 */
export interface FragmentState {
    /** Fragment groups — each inner array is a semantic group (e.g., per-round fragments) */
    readonly groups: readonly (readonly ICodeFragment[])[];
}

/**
 * Display-ready fragment state stored in memory.
 * 
 * Produced by applying precedence resolution to raw fragment groups.
 * The `resolved` array contains fragments after per-type precedence
 * selection (user > runtime > compiler > parser).
 */
export interface FragmentDisplayState {
    /** All raw fragments flattened from groups (before precedence) */
    readonly fragments: readonly ICodeFragment[];
    /** Precedence-resolved fragments ready for display */
    readonly resolved: readonly ICodeFragment[];
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
 * Button style variants for UI rendering.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

/**
 * Configuration for a single control button.
 */
export interface ButtonConfig {
    /** Unique button identifier */
    readonly id: string;

    /** Display label */
    readonly label: string;

    /** Button style variant */
    readonly variant: ButtonVariant;

    /** Whether button is currently visible */
    readonly visible: boolean;

    /** Whether button is enabled (clickable) */
    readonly enabled: boolean;

    /** 
     * Event name to emit when clicked.
     * External systems subscribe to these events to handle user actions.
     * Examples: 'timer:pause', 'block:next', 'workout:stop'
     */
    readonly eventName?: string;

    /** 
     * Whether this button is pinned (always visible).
     * Derived from `[:!action]` syntax in WOD scripts.
     */
    readonly isPinned?: boolean;
}

/**
 * Buttons state stored in memory.
 * Represents the current set of control buttons available to the user.
 * 
 * The UI observes this memory to render action buttons. When buttons are
 * clicked, the UI emits the corresponding `eventName` as an external event.
 */
export interface ButtonsState {
    /** Current button configurations */
    readonly buttons: readonly ButtonConfig[];
}

/**
 * Union of all valid memory type keys.
 */
export type MemoryType = 'timer' | 'round' | 'fragment' | 'fragment:display' | 'completion' | 'display' | 'controls';

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
    'fragment:display': FragmentDisplayState;
    completion: CompletionState;
    display: DisplayState;
    controls: ButtonsState;
}

/**
 * Utility to resolve the value type for a given memory type key.
 */
export type MemoryValueOf<T extends MemoryType> = MemoryTypeMap[T];

