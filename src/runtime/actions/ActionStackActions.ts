import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { MemoryTypeEnum } from '../MemoryTypeEnum';
import { TypedMemoryReference } from '../IMemoryReference';

export interface ActionDescriptor {
  id: string;
  name: string;
  eventName: string;
  ownerId: string;
  sourceId?: string;
  raw?: string;
  displayLabel?: string;
  payload?: Record<string, unknown>;
  isPinned?: boolean;
}

interface ActionLayer {
  ownerId: string;
  actions: ActionDescriptor[];
}

export interface ActionStackState {
  layers: ActionLayer[];
  visible: ActionDescriptor[];
}

const createDefaultState = (): ActionStackState => ({ layers: [], visible: [] });

function ensureState(runtime: IScriptRuntime): { ref: TypedMemoryReference<ActionStackState>; state: ActionStackState } {
  const existing = runtime.memory.search({
    id: null,
    ownerId: 'runtime',
    type: MemoryTypeEnum.ACTION_STACK_STATE,
    visibility: null,
  });

  if (existing.length > 0) {
    const ref = existing[0] as TypedMemoryReference<ActionStackState>;
    return { ref, state: ref.get() || createDefaultState() };
  }

  const ref = runtime.memory.allocate<ActionStackState>(
    MemoryTypeEnum.ACTION_STACK_STATE,
    'runtime',
    createDefaultState(),
    'public'
  );
  return { ref, state: createDefaultState() };
}

function dedupeDescriptors(actions: ActionDescriptor[]): ActionDescriptor[] {
  const seen = new Set<string>();
  const result: ActionDescriptor[] = [];

  for (const action of actions) {
    if (seen.has(action.id)) continue;
    seen.add(action.id);
    result.push(action);
  }

  return result;
}

function recomputeVisible(layers: ActionLayer[]): ActionDescriptor[] {
  if (layers.length === 0) return [];

  const pinned = layers.flatMap(layer => layer.actions.filter(a => a.isPinned));
  const top = layers[layers.length - 1]?.actions || [];
  const nonPinnedTop = top.filter(a => !a.isPinned);

  return dedupeDescriptors([...pinned, ...nonPinnedTop]);
}

/**
 * Pushes (or replaces) the action layer for an owner and recomputes visible actions.
 */
export class PushActionsAction implements IRuntimeAction {
  readonly type = 'push-actions';

  constructor(private readonly ownerId: string, private readonly actions: ActionDescriptor[]) {}

  do(runtime: IScriptRuntime): void {
    const { ref, state } = ensureState(runtime);

    const layers = state.layers.filter(l => l.ownerId !== this.ownerId);
    layers.push({ ownerId: this.ownerId, actions: [...this.actions] });

    ref.set({
      layers,
      visible: recomputeVisible(layers),
    });


  }
}

/**
 * Pops the action layer for an owner (or the top-most if none provided) and recomputes visibility.
 */
export class PopActionsAction implements IRuntimeAction {
  readonly type = 'pop-actions';

  constructor(private readonly ownerId?: string) {}

  do(runtime: IScriptRuntime): void {
    const { ref, state } = ensureState(runtime);
    let layers = state.layers;

    if (this.ownerId) {
      layers = layers.filter(l => l.ownerId !== this.ownerId);
    } else {
      layers = layers.slice(0, -1);
    }

    ref.set({
      layers,
      visible: recomputeVisible(layers),
    });


  }
}

/**
 * Updates an existing owner's action layer (or pushes if missing) and recomputes visibility.
 */
export class UpdateActionsAction implements IRuntimeAction {
  readonly type = 'update-actions';

  constructor(private readonly ownerId: string, private readonly actions: ActionDescriptor[]) {}

  do(runtime: IScriptRuntime): void {
    const { ref, state } = ensureState(runtime);

    let layers = state.layers;
    const existingIndex = layers.findIndex(l => l.ownerId === this.ownerId);

    if (existingIndex >= 0) {
      layers = [...layers];
      layers[existingIndex] = { ownerId: this.ownerId, actions: [...this.actions] };
    } else {
      layers = [...layers, { ownerId: this.ownerId, actions: [...this.actions] }];
    }

    ref.set({
      layers,
      visible: recomputeVisible(layers),
    });


  }
}