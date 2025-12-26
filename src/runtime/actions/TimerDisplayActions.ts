import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { MemoryTypeEnum } from '../MemoryTypeEnum';
import { TypedMemoryReference } from '../IMemoryReference';
import { 
  ITimerDisplayEntry, 
  IDisplayStackState, 
  createDefaultDisplayState 
} from '../../clock/types/DisplayTypes';

/**
 * Action that pushes a timer display onto the visual stack.
 * 
 * This action allows blocks to register a timer for display in the Clock UI.
 * The timer display references a timer memory location and provides
 * display configuration (label, format, buttons).
 * 
 * Usage:
 * ```typescript
 * // In a block's mount() method:
 * return [
 *   new PushTimerDisplayAction({
 *     id: `timer-${this.key}`,
 *     ownerId: this.key.toString(),
 *     timerMemoryId: this.timerRef.id,
 *     label: 'AMRAP 20',
 *     format: 'countdown',
 *     durationMs: 20 * 60 * 1000,
 *     buttons: [
 *       { id: 'skip', label: 'Skip', eventName: 'timer:skip', variant: 'secondary' }
 *     ]
 *   })
 * ];
 * ```
 */
export class PushTimerDisplayAction implements IRuntimeAction {
  private _type = 'push-timer-display';

  constructor(private readonly entry: ITimerDisplayEntry) {}

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

    // Check if this timer is already in the stack
    const existingIndex = state.timerStack.findIndex(t => t.id === this.entry.id);
    if (existingIndex >= 0) {
      // Update existing entry instead of duplicating
      state.timerStack[existingIndex] = this.entry;
    } else {
      // Push the new timer display entry
      state.timerStack.push(this.entry);
    }

    // Sort by priority if specified (lower priority = earlier in stack)
    state.timerStack.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

    // Update memory
    stateRef.set({ ...state });


  }
}

/**
 * Action that pops a timer display from the visual stack.
 * 
 * Removes the timer display entry with the specified ID.
 * If no ID is provided, pops the most recently pushed timer.
 * 
 * Usage:
 * ```typescript
 * // In a block's unmount() method:
 * return [new PopTimerDisplayAction(`timer-${this.key}`)];
 * ```
 */
export class PopTimerDisplayAction implements IRuntimeAction {
  private _type = 'pop-timer-display';

  constructor(private readonly entryId?: string) {}

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

    if (!state || state.timerStack.length === 0) {
      return;
    }

    let removedEntry: ITimerDisplayEntry | undefined;

    if (this.entryId) {
      // Remove specific entry by ID
      const index = state.timerStack.findIndex(t => t.id === this.entryId);
      if (index >= 0) {
        removedEntry = state.timerStack.splice(index, 1)[0];
      } else {
        return;
      }
    } else {
      // Pop the last (most recently pushed) timer
      removedEntry = state.timerStack.pop();
    }

    // Update memory
    stateRef.set({ ...state });


  }
}

/**
 * Action that updates an existing timer display entry.
 * 
 * Useful for updating labels, buttons, or format without
 * popping and re-pushing the timer.
 */
export class UpdateTimerDisplayAction implements IRuntimeAction {
  private _type = 'update-timer-display';

  constructor(
    private readonly entryId: string,
    private readonly updates: Partial<ITimerDisplayEntry>
  ) {}

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

    const index = state.timerStack.findIndex(t => t.id === this.entryId);
    if (index < 0) {
      return;
    }

    // Merge updates with existing entry
    state.timerStack[index] = {
      ...state.timerStack[index],
      ...this.updates
    };

    // Re-sort if priority changed
    if (this.updates.priority !== undefined) {
      state.timerStack.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    }

    // Update memory
    stateRef.set({ ...state });


  }
}
