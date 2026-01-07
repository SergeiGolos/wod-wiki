import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';

/**
 * Workout execution phases.
 * 
 * - 'pre-start': Initial idle, waiting for user to start
 * - 'executing': Workout is running
 * - 'completing': Transitioning to final idle (child blocks being cleaned up)
 * - 'post-complete': Final idle shown, waiting for user dismissal
 * - 'complete': Workout is done, root block should pop
 */
export type WorkoutPhase = 'pre-start' | 'executing' | 'completing' | 'post-complete' | 'complete';

/**
 * WorkoutFlowStateMachine - Pure state machine for workout phase transitions.
 * 
 * This is a minimal behavior that only tracks the workout phase and handles
 * basic phase transitions. All side effects (UI updates, timer control, etc.)
 * are delegated to other behaviors.
 * 
 * State Transitions:
 * ```
 * pre-start → executing → completing → post-complete → complete
 *     ↑                        ↓
 *     └────────────────────────┘ (or direct to complete on skip)
 * ```
 * 
 * @example
 * ```typescript
 * const stateMachine = new WorkoutFlowStateMachine();
 * 
 * // Check current phase
 * if (stateMachine.getPhase() === 'pre-start') {
 *     stateMachine.transition('executing');
 * }
 * ```
 */
export class WorkoutFlowStateMachine implements IRuntimeBehavior {
    private phase: WorkoutPhase = 'pre-start';

    constructor(initialPhase: WorkoutPhase = 'pre-start') {
        this.phase = initialPhase;
    }

    /**
     * Gets the current workout phase.
     */
    getPhase(): WorkoutPhase {
        return this.phase;
    }

    /**
     * Transitions to a new phase.
     * @param newPhase - The phase to transition to
     * @returns true if the transition was valid, false otherwise
     */
    transition(newPhase: WorkoutPhase): boolean {
        // Validate transitions
        const validTransitions: Record<WorkoutPhase, WorkoutPhase[]> = {
            'pre-start': ['executing'],
            'executing': ['completing', 'complete'],
            'completing': ['post-complete', 'complete'],
            'post-complete': ['complete'],
            'complete': []
        };

        if (validTransitions[this.phase].includes(newPhase)) {
            this.phase = newPhase;
            return true;
        }
        return false;
    }

    /**
     * Checks if the workout is in a specific phase.
     */
    isPhase(phase: WorkoutPhase): boolean {
        return this.phase === phase;
    }

    /**
     * Checks if the workout is complete (or in completion phase).
     */
    isComplete(): boolean {
        return this.phase === 'complete' || this.phase === 'post-complete';
    }

    onPush(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        // Initial phase is set in constructor
        return [];
    }

    onNext(block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        // Handle phase-based actions
        switch (this.phase) {
            case 'pre-start':
                // Transition handled externally when idle block pops
                return [];

            case 'executing':
                // Execution continues, no action from state machine
                return [];

            case 'completing':
                // Transition to post-complete (final idle pushed)
                this.phase = 'post-complete';
                return [];

            case 'post-complete':
                // Final idle was dismissed, complete the workout
                this.phase = 'complete';
                // Mark block as complete - stack will pop it during sweep
                block.markComplete('workout-complete');
                return [];

            case 'complete':
                // Already complete, no action
                return [];
        }

        return [];
    }

    onPop(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }
}
