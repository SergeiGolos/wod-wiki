import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { MemoryTypeEnum } from '../models/MemoryTypeEnum';
import { TypedMemoryReference } from '../contracts/IMemoryReference';
import { TimeSpan } from '../models/TimeSpan';
import { calculateDuration } from '../../lib/timeUtils';
import {
  IDisplayStackState,
  createDefaultDisplayState
} from '../../clock/types/DisplayTypes';

/**
 * Action that updates the global workout state.
 * 
 * This controls the overall workout status shown in the UI
 * and affects which idle cards are displayed.
 * 
 * Usage:
 * ```typescript
 * // When starting a workout:
 * return [new SetWorkoutStateAction('running')];
 * 
 * // When completing a workout:
 * return [new SetWorkoutStateAction('complete')];
 * ```
 */
export class SetWorkoutStateAction implements IRuntimeAction {
  private _type = 'set-workout-state';

  constructor(
    private readonly workoutState: 'idle' | 'running' | 'paused' | 'complete' | 'error'
  ) { }

  get type(): string {
    return this._type;
  }

  set type(_value: string) {
    throw new Error('Cannot modify readonly property type');
  }

  do(runtime: IScriptRuntime): void {
    // Find or create the display stack state
    const stateRefs = runtime.memory.search({
      id: null,
      ownerId: 'runtime',
      type: MemoryTypeEnum.DISPLAY_STACK_STATE,
      visibility: null
    });

    let stateRef: TypedMemoryReference<IDisplayStackState>;
    let state: IDisplayStackState;

    if (stateRefs.length > 0) {
      stateRef = stateRefs[0] as TypedMemoryReference<IDisplayStackState>;
      state = stateRef.get() || createDefaultDisplayState();
    } else {
      // Allocate the display stack state if it doesn't exist
      state = createDefaultDisplayState();
      stateRef = runtime.memory.allocate<IDisplayStackState>(
        MemoryTypeEnum.DISPLAY_STACK_STATE,
        'runtime',
        state,
        'public'
      );
    }

    const previousState = state.workoutState;
    state.workoutState = this.workoutState;

    // Allocate global timer if starting workout and not already present
    if (this.workoutState === 'running' && previousState === 'idle' && !state.globalTimerMemoryId) {
      const globalTimerRef = runtime.memory.allocate<TimeSpan[]>(
        'timer:global',
        'runtime',
        [new TimeSpan(Date.now())],
        'public'
      );
      state.globalTimerMemoryId = globalTimerRef.id;
    }

    // Update totalElapsedMs on every state change if global timer exists
    if (state.globalTimerMemoryId) {
      const timerRefs = runtime.memory.search({
        id: state.globalTimerMemoryId,
        ownerId: null,
        type: null,
        visibility: null
      });
      if (timerRefs.length > 0) {
        const spans = (timerRefs[0] as TypedMemoryReference<TimeSpan[]>).get();
        if (spans) {
          state.totalElapsedMs = calculateDuration(spans, Date.now());
        }
      }
    }

    // Update memory
    stateRef.set({ ...state });


  }
}

/**
 * Action that updates round information in the display state.
 * 
 * Usage:
 * ```typescript
 * // At the start of round 2 of 5:
 * return [new SetRoundsDisplayAction(2, 5)];
 * ```
 */
export class SetRoundsDisplayAction implements IRuntimeAction {
  private _type = 'set-rounds-display';

  constructor(
    private readonly currentRound?: number,
    private readonly totalRounds?: number
  ) { }

  get type(): string {
    return this._type;
  }

  set type(_value: string) {
    throw new Error('Cannot modify readonly property type');
  }

  do(runtime: IScriptRuntime): void {
    const stateRefs = runtime.memory.search({
      id: null,
      ownerId: 'runtime',
      type: MemoryTypeEnum.DISPLAY_STACK_STATE,
      visibility: null
    });

    if (stateRefs.length === 0) {
      return;
    }

    const stateRef = stateRefs[0] as TypedMemoryReference<IDisplayStackState>;
    const state = stateRef.get();

    if (!state) {
      return;
    }

    if (this.currentRound !== undefined) {
      state.currentRound = this.currentRound;
    }
    if (this.totalRounds !== undefined) {
      state.totalRounds = this.totalRounds;
    }

    // Update memory
    stateRef.set({ ...state });


  }
}

/**
 * Action that resets the display stack to its initial state.
 * 
 * Useful for cleanup when a workout ends or is cancelled.
 */
export class ResetDisplayStackAction implements IRuntimeAction {
  private _type = 'reset-display-stack';

  get type(): string {
    return this._type;
  }

  set type(_value: string) {
    throw new Error('Cannot modify readonly property type');
  }

  do(runtime: IScriptRuntime): void {
    const stateRefs = runtime.memory.search({
      id: null,
      ownerId: 'runtime',
      type: MemoryTypeEnum.DISPLAY_STACK_STATE,
      visibility: null
    });

    if (stateRefs.length === 0) {
      return;
    }

    const stateRef = stateRefs[0] as TypedMemoryReference<IDisplayStackState>;
    const freshState = createDefaultDisplayState();

    // Update memory
    stateRef.set(freshState);


  }
}
