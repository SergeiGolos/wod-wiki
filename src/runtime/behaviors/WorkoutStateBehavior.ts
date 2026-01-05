import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { SetWorkoutStateAction, WorkoutState } from '../actions/display/WorkoutStateActions';

/**
 * WorkoutStateBehavior - Manages and emits workout execution state.
 * 
 * Tracks the current workout state (idle, running, paused, complete) and
 * provides methods to transition between states with proper action emission.
 * 
 * This is a single-responsibility behavior that only handles workout state,
 * not timer control, button management, or other concerns.
 * 
 * @example
 * ```typescript
 * const stateBehavior = new WorkoutStateBehavior('idle');
 * 
 * // Transition to running state
 * const actions = stateBehavior.setState('running');
 * // Returns [SetWorkoutStateAction('running')]
 * ```
 */
export class WorkoutStateBehavior implements IRuntimeBehavior {
    private state: WorkoutState;

    constructor(initialState: WorkoutState = 'idle') {
        this.state = initialState;
    }

    /**
     * Gets the current workout state.
     */
    getState(): WorkoutState {
        return this.state;
    }

    /**
     * Sets the workout state and returns the action to emit.
     * @param newState - The new workout state
     * @returns Array containing SetWorkoutStateAction
     */
    setState(newState: WorkoutState): IRuntimeAction[] {
        if (this.state === newState) {
            return []; // No change
        }
        this.state = newState;
        return [new SetWorkoutStateAction(newState)];
    }

    /**
     * Checks if the workout is in a specific state.
     */
    isState(state: WorkoutState): boolean {
        return this.state === state;
    }

    onPush(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        // Emit initial state on push
        return [new SetWorkoutStateAction(this.state)];
    }

    onNext(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }

    onPop(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }
}
