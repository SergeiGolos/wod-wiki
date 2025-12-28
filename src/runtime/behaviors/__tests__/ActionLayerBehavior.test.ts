import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '../../../../tests/harness';
import { ActionLayerBehavior } from '../ActionLayerBehavior';
import { PushActionsAction } from '../../actions/ActionStackActions';
import { MemoryTypeEnum } from '../../models/MemoryTypeEnum';
import { FragmentType } from '../../../core/models/CodeFragment';

/**
 * ActionLayerBehavior Contract Tests (Migrated to Test Harness)
 * 
 * Tests that ActionLayerBehavior correctly pushes action layers to memory
 * during block lifecycle.
 */
describe('ActionLayerBehavior', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness();
  });

  it('adds default next action when no actions exist', () => {
    const behavior = new ActionLayerBehavior('block-1', []);
    const block = new MockBlock('block-1', [behavior]);

    harness.push(block);
    const actions = harness.mount();

    // Execute the PushActionsAction
    const pushAction = actions.find(a => a instanceof PushActionsAction) as PushActionsAction;
    expect(pushAction).toBeDefined();

    const refs = harness.runtime.memory.search({ id: null, ownerId: 'runtime', type: MemoryTypeEnum.ACTION_STACK_STATE, visibility: null });
    const state = (refs[0] as any)?.get?.() ?? (refs[0] as any)?.value?.();

    expect(state?.visible.some((a: any) => a.eventName === 'next')).toBe(true);
  });

  it('uses action fragments and preserves pinning', () => {
    const fragments = [[{ fragmentType: FragmentType.Action, raw: '!reset', name: 'reset', isPinned: true, type: 'action' } as any]];
    const behavior = new ActionLayerBehavior('block-2', fragments);
    const block = new MockBlock('block-2', [behavior]);

    harness.push(block);
    harness.mount();

    const refs = harness.runtime.memory.search({ id: null, ownerId: 'runtime', type: MemoryTypeEnum.ACTION_STACK_STATE, visibility: null });
    const state = (refs[0] as any)?.get?.() ?? (refs[0] as any)?.value?.();

    expect(state?.visible.map((a: any) => a.eventName)).toContain('reset');
    expect(state?.visible.find((a: any) => a.eventName === 'reset')?.isPinned).toBe(true);
  });
});