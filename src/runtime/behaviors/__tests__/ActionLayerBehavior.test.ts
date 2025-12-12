import { describe, it, expect } from 'bun:test';
import { ActionLayerBehavior } from '../ActionLayerBehavior';
import { PushActionsAction } from '../../actions/ActionStackActions';
import { RuntimeMemory } from '../../RuntimeMemory';
import { MemoryTypeEnum } from '../../MemoryTypeEnum';
import { FragmentType } from '../../../core/models/CodeFragment';

const runtimeStub = () => ({ memory: new RuntimeMemory(), stack: { current: null } } as any);

const blockStub = (id: string) => ({ key: { toString: () => id } } as any);

describe('ActionLayerBehavior', () => {
  it('adds default next action when no actions exist', () => {
    const behavior = new ActionLayerBehavior('block-1', []);
    const runtime = runtimeStub();
    const pushAction = behavior.onPush!(runtime, blockStub('block-1'))[0] as PushActionsAction;
    pushAction.do(runtime);

    const refs = runtime.memory.search({ id: null, ownerId: 'runtime', type: MemoryTypeEnum.ACTION_STACK_STATE, visibility: null });
    const state = (refs[0] as any)?.get?.() ?? (refs[0] as any)?.value?.();

    expect(state?.visible.some((a: any) => a.eventName === 'next')).toBe(true);
  });

  it('uses action fragments and preserves pinning', () => {
    const fragments = [[{ fragmentType: FragmentType.Action, raw: '!reset', name: 'reset', isPinned: true, type: 'action' } as any]];
    const behavior = new ActionLayerBehavior('block-2', fragments);
    const runtime = runtimeStub();
    const pushAction = behavior.onPush!(runtime, blockStub('block-2'))[0] as PushActionsAction;
    pushAction.do(runtime);

    const refs = runtime.memory.search({ id: null, ownerId: 'runtime', type: MemoryTypeEnum.ACTION_STACK_STATE, visibility: null });
    const state = (refs[0] as any)?.get?.() ?? (refs[0] as any)?.value?.();

    expect(state?.visible.map((a: any) => a.eventName)).toContain('reset');
    expect(state?.visible.find((a: any) => a.eventName === 'reset')?.isPinned).toBe(true);
  });
});