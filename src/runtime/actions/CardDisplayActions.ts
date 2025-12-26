import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { MemoryTypeEnum } from '../MemoryTypeEnum';
import { TypedMemoryReference } from '../IMemoryReference';
import { 
  IDisplayCardEntry, 
  IDisplayStackState, 
  createDefaultDisplayState 
} from '../../clock/types/DisplayTypes';

/**
 * Action that pushes a display card onto the visual stack.
 * 
 * Display cards appear below the timer and show context about
 * the current workout state (active block metrics, rest period, etc.)
 * 
 * Usage:
 * ```typescript
 * // In a block's mount() method:
 * return [
 *   new PushCardDisplayAction({
 *     id: `card-${this.key}`,
 *     ownerId: this.key.toString(),
 *     type: 'active-block',
 *     title: '10 Burpees',
 *     metrics: [
 *       { type: 'reps', value: 10, image: '10' },
 *       { type: 'effort', value: 'Burpees', image: 'Burpees' }
 *     ]
 *   })
 * ];
 * ```
 */
export class PushCardDisplayAction implements IRuntimeAction {
  private _type = 'push-card-display';

  constructor(private readonly entry: IDisplayCardEntry) {}

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

    // Check if this card is already in the stack
    const existingIndex = state.cardStack.findIndex(c => c.id === this.entry.id);
    if (existingIndex >= 0) {
      // Update existing entry instead of duplicating
      state.cardStack[existingIndex] = this.entry;
    } else {
      // Push the new card display entry
      state.cardStack.push(this.entry);
    }

    // Sort by priority if specified (lower priority = earlier in stack)
    state.cardStack.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

    // Update memory
    stateRef.set({ ...state });


  }
}

/**
 * Action that pops a display card from the visual stack.
 * 
 * Removes the card entry with the specified ID.
 * If no ID is provided, pops the most recently pushed card.
 * 
 * Usage:
 * ```typescript
 * // In a block's unmount() method:
 * return [new PopCardDisplayAction(`card-${this.key}`)];
 * ```
 */
export class PopCardDisplayAction implements IRuntimeAction {
  private _type = 'pop-card-display';

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

    if (!state || state.cardStack.length === 0) {
      return;
    }

    let removedEntry: IDisplayCardEntry | undefined;

    if (this.entryId) {
      // Remove specific entry by ID
      const index = state.cardStack.findIndex(c => c.id === this.entryId);
      if (index >= 0) {
        removedEntry = state.cardStack.splice(index, 1)[0];
      } else {
        return;
      }
    } else {
      // Pop the last (most recently pushed) card
      removedEntry = state.cardStack.pop();
    }

    // Update memory
    stateRef.set({ ...state });


  }
}

/**
 * Action that updates an existing display card entry.
 * 
 * Useful for updating metrics, buttons, or other card properties
 * without popping and re-pushing the card.
 */
export class UpdateCardDisplayAction implements IRuntimeAction {
  private _type = 'update-card-display';

  constructor(
    private readonly entryId: string,
    private readonly updates: Partial<IDisplayCardEntry>
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

    const index = state.cardStack.findIndex(c => c.id === this.entryId);
    if (index < 0) {
      return;
    }

    // Merge updates with existing entry
    state.cardStack[index] = {
      ...state.cardStack[index],
      ...this.updates
    };

    // Re-sort if priority changed
    if (this.updates.priority !== undefined) {
      state.cardStack.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    }

    // Update memory
    stateRef.set({ ...state });


  }
}
