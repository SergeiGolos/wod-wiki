import { describe, it, expect, vi } from 'bun:test';
import { PopOnNextBehavior } from '../PopOnNextBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext {
    const memoryStore = new Map<string, any>();

    return {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Test Block',
            fragments: []
        },
        clock: { now: new Date(1000) },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => memoryStore.get(type)),
        setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
        ...overrides
    } as unknown as IBehaviorContext;
}

describe('PopOnNextBehavior', () => {
    it('should return no actions on mount', () => {
        const behavior = new PopOnNextBehavior();
        const ctx = createMockContext();
        const actions = behavior.onMount(ctx);
        expect(actions).toEqual([]);
    });

    it('should mark block complete on next', () => {
        const behavior = new PopOnNextBehavior();
        const ctx = createMockContext();
        behavior.onNext(ctx);
        expect(ctx.markComplete).toHaveBeenCalledWith('user-advance');
    });

    it('should return PopBlockAction on next', () => {
        const behavior = new PopOnNextBehavior();
        const ctx = createMockContext();
        const actions = behavior.onNext(ctx);
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('pop-block');
    });

    it('should return no actions on unmount', () => {
        const behavior = new PopOnNextBehavior();
        const ctx = createMockContext();
        const actions = behavior.onUnmount(ctx);
        expect(actions).toEqual([]);
    });

    it('should not mark complete on mount', () => {
        const behavior = new PopOnNextBehavior();
        const ctx = createMockContext();
        behavior.onMount(ctx);
        expect(ctx.markComplete).not.toHaveBeenCalled();
    });

    it('should always pop on next regardless of state', () => {
        const behavior = new PopOnNextBehavior();
        const ctx = createMockContext();

        // First call
        const actions1 = behavior.onNext(ctx);
        expect(actions1.length).toBe(1);
        expect(actions1[0].type).toBe('pop-block');

        // Second call (should still work)
        const actions2 = behavior.onNext(ctx);
        expect(actions2.length).toBe(1);
        expect(actions2[0].type).toBe('pop-block');
    });
});
