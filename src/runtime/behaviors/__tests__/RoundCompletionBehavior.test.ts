import { describe, it, expect, vi } from 'bun:test';
import { RoundCompletionBehavior } from '../RoundCompletionBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';

function createMockContext(overrides: {
    roundState?: { current: number; total: number | undefined };
} = {}): IBehaviorContext {
    const memoryStore = new Map<string, any>();

    if (overrides.roundState) {
        memoryStore.set('round', overrides.roundState);
    }

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
        setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value))
    } as unknown as IBehaviorContext;
}

describe('RoundCompletionBehavior', () => {
    describe('onMount', () => {
        it('should return no actions on mount', () => {
            const behavior = new RoundCompletionBehavior();
            const ctx = createMockContext();
            const actions = behavior.onMount(ctx);
            expect(actions).toEqual([]);
        });
    });

    describe('onNext - completion check', () => {
        it('should mark complete and pop when current > total', () => {
            const behavior = new RoundCompletionBehavior();
            const ctx = createMockContext({
                roundState: { current: 4, total: 3 }
            });

            const actions = behavior.onNext(ctx);

            expect(ctx.markComplete).toHaveBeenCalledWith('rounds-complete');
            expect(actions.length).toBe(1);
            expect(actions[0].type).toBe('pop-block');
        });

        it('should not mark complete when current == total', () => {
            const behavior = new RoundCompletionBehavior();
            const ctx = createMockContext({
                roundState: { current: 3, total: 3 }
            });

            const actions = behavior.onNext(ctx);

            expect(ctx.markComplete).not.toHaveBeenCalled();
            expect(actions).toEqual([]);
        });

        it('should not mark complete when current < total', () => {
            const behavior = new RoundCompletionBehavior();
            const ctx = createMockContext({
                roundState: { current: 1, total: 5 }
            });

            const actions = behavior.onNext(ctx);

            expect(ctx.markComplete).not.toHaveBeenCalled();
            expect(actions).toEqual([]);
        });

        it('should not mark complete when total is undefined (AMRAP)', () => {
            const behavior = new RoundCompletionBehavior();
            const ctx = createMockContext({
                roundState: { current: 100, total: undefined }
            });

            const actions = behavior.onNext(ctx);

            expect(ctx.markComplete).not.toHaveBeenCalled();
            expect(actions).toEqual([]);
        });

        it('should not mark complete when no round state', () => {
            const behavior = new RoundCompletionBehavior();
            const ctx = createMockContext();

            const actions = behavior.onNext(ctx);

            expect(ctx.markComplete).not.toHaveBeenCalled();
            expect(actions).toEqual([]);
        });

        it('should pop when current exceeds total by exactly 1', () => {
            const behavior = new RoundCompletionBehavior();
            const ctx = createMockContext({
                roundState: { current: 6, total: 5 }
            });

            const actions = behavior.onNext(ctx);

            expect(ctx.markComplete).toHaveBeenCalledWith('rounds-complete');
            expect(actions.length).toBe(1);
            expect(actions[0].type).toBe('pop-block');
        });

        it('should pop when current exceeds total by large amount', () => {
            const behavior = new RoundCompletionBehavior();
            const ctx = createMockContext({
                roundState: { current: 100, total: 3 }
            });

            const actions = behavior.onNext(ctx);

            expect(ctx.markComplete).toHaveBeenCalledWith('rounds-complete');
            expect(actions.length).toBe(1);
        });
    });

    describe('onUnmount', () => {
        it('should return no actions on unmount', () => {
            const behavior = new RoundCompletionBehavior();
            const ctx = createMockContext();
            const actions = behavior.onUnmount(ctx);
            expect(actions).toEqual([]);
        });
    });
});
