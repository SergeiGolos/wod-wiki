import { describe, it, expect } from 'bun:test';
import { RuntimeMemory } from '../../RuntimeMemory';
import { MemoryTypeEnum } from '../../MemoryTypeEnum';
import { PushActionsAction, PopActionsAction, UpdateActionsAction, ActionDescriptor } from '../ActionStackActions';

const createRuntime = () => ({ memory: new RuntimeMemory() } as any);

const getState = (runtime: any) => {
  const refs = runtime.memory.search({ id: null, ownerId: 'runtime', type: MemoryTypeEnum.ACTION_STACK_STATE, visibility: null });
  if (refs.length === 0) return undefined;
  const ref = refs[0] as any;
  return ref.get();
};

describe('ActionStackActions', () => {
  it('pushes actions and makes them visible', () => {
    const runtime = createRuntime();
    const actions: ActionDescriptor[] = [
      { id: 'a', name: 'a', eventName: 'a', ownerId: 'owner' },
    ];

    new PushActionsAction('owner', actions).do(runtime);

    const state = getState(runtime);
    expect(state?.visible).toHaveLength(1);
    expect(state?.visible[0].id).toBe('a');
  });

  it('keeps pinned parent actions visible when child layer is pushed', () => {
    const runtime = createRuntime();

    new PushActionsAction('parent', [
      { id: 'p', name: 'parent', eventName: 'parent', ownerId: 'parent', isPinned: true },
    ]).do(runtime);

    new PushActionsAction('child', [
      { id: 'c', name: 'child', eventName: 'child', ownerId: 'child' },
    ]).do(runtime);

    let state = getState(runtime);
    expect(state?.visible.map((a: ActionDescriptor) => a.id)).toEqual(['p', 'c']);

    new PopActionsAction('child').do(runtime);

    state = getState(runtime);
    expect(state?.visible.map((a: ActionDescriptor) => a.id)).toEqual(['p']);
  });

  it('updates an existing layer instead of duplicating', () => {
    const runtime = createRuntime();

    new PushActionsAction('owner', [
      { id: 'a1', name: 'a1', eventName: 'a1', ownerId: 'owner' },
    ]).do(runtime);

    new UpdateActionsAction('owner', [
      { id: 'a2', name: 'a2', eventName: 'a2', ownerId: 'owner' },
    ]).do(runtime);

    const state = getState(runtime);
    expect(state?.layers).toHaveLength(1);
    expect(state?.visible[0].id).toBe('a2');
  });
});