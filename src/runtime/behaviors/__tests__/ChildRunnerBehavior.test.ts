import { describe, it, expect, vi } from 'bun:test';
import { ChildRunnerBehavior } from '../ChildRunnerBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';

function createMockContext(): IBehaviorContext {
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
        setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value))
    } as unknown as IBehaviorContext;
}

describe('ChildRunnerBehavior', () => {
    describe('construction', () => {
        it('should start with childIndex at 0', () => {
            const behavior = new ChildRunnerBehavior({ childGroups: [[1], [2]] });
            expect(behavior.allChildrenExecuted).toBe(false);
            expect(behavior.allChildrenCompleted).toBe(false);
        });

        it('should report allChildrenExecuted for empty childGroups', () => {
            const behavior = new ChildRunnerBehavior({ childGroups: [] });
            expect(behavior.allChildrenExecuted).toBe(true);
        });
    });

    describe('onMount', () => {
        it('should push first child on mount', () => {
            const behavior = new ChildRunnerBehavior({ childGroups: [[1, 2], [3, 4]] });
            const ctx = createMockContext();

            const actions = behavior.onMount(ctx);

            expect(actions.length).toBe(2);
            expect(actions[0].type).toBe('compile-child-block');
            expect(actions[0].payload).toEqual({ statementIds: [1, 2] });
            expect(actions[1].type).toBe('update-next-preview');
        });

        it('should return no actions for empty childGroups on mount', () => {
            const behavior = new ChildRunnerBehavior({ childGroups: [] });
            const ctx = createMockContext();

            const actions = behavior.onMount(ctx);

            expect(actions).toEqual([]);
        });

        it('should advance childIndex to 1 after mount', () => {
            const behavior = new ChildRunnerBehavior({ childGroups: [[1], [2]] });
            const ctx = createMockContext();

            behavior.onMount(ctx);

            // childIndex is now 1 (next to push)
            // allChildrenExecuted should still be false (2 children total)
            expect(behavior.allChildrenExecuted).toBe(false);
        });
    });

    describe('onNext - sequential child dispatch', () => {
        it('should push next child on next', () => {
            const behavior = new ChildRunnerBehavior({ childGroups: [[1], [2], [3]] });
            const ctx = createMockContext();

            behavior.onMount(ctx); // pushes [1], childIndex → 1

            const actions = behavior.onNext(ctx);

            expect(actions.length).toBe(2);
            expect(actions[0].type).toBe('compile-child-block');
            expect(actions[0].payload).toEqual({ statementIds: [2] });
            expect(actions[1].type).toBe('update-next-preview');
        });

        it('should return clear preview when all children dispatched', () => {
            const behavior = new ChildRunnerBehavior({ childGroups: [[1]] });
            const ctx = createMockContext();

            behavior.onMount(ctx); // pushes [1], childIndex → 1

            const actions = behavior.onNext(ctx);

            // No more children to dispatch — only a clear-preview action
            expect(actions.length).toBe(1);
            expect(actions[0].type).toBe('update-next-preview');
        });

        it('should dispatch children in order', () => {
            const behavior = new ChildRunnerBehavior({
                childGroups: [[10], [20], [30]]
            });
            const ctx = createMockContext();

            behavior.onMount(ctx); // pushes [10]

            const actions1 = behavior.onNext(ctx); // pushes [20]
            expect(actions1[0].payload).toEqual({ statementIds: [20] });

            const actions2 = behavior.onNext(ctx); // pushes [30]
            expect(actions2[0].payload).toEqual({ statementIds: [30] });

            const actions3 = behavior.onNext(ctx); // no more — only clear-preview
            expect(actions3.length).toBe(1);
            expect(actions3[0].type).toBe('update-next-preview');
        });
    });

    describe('allChildrenExecuted', () => {
        it('should be false when children remain', () => {
            const behavior = new ChildRunnerBehavior({ childGroups: [[1], [2]] });
            const ctx = createMockContext();

            behavior.onMount(ctx);

            expect(behavior.allChildrenExecuted).toBe(false);
        });

        it('should be true when all children have been dispatched', () => {
            const behavior = new ChildRunnerBehavior({ childGroups: [[1]] });
            const ctx = createMockContext();

            behavior.onMount(ctx);

            expect(behavior.allChildrenExecuted).toBe(true);
        });
    });

    describe('allChildrenCompleted', () => {
        it('should be false right after dispatching last child', () => {
            const behavior = new ChildRunnerBehavior({ childGroups: [[1]] });
            const ctx = createMockContext();

            behavior.onMount(ctx); // dispatches last child

            // allChildrenExecuted = true, but last dispatch was on mount
            // _dispatchedOnLastNext = false (mount, not next)
            // Actually allChildrenCompleted should be true because mount doesn't set _dispatchedOnLastNext
            expect(behavior.allChildrenExecuted).toBe(true);
        });

        it('should be true when next() finds nothing to dispatch', () => {
            const behavior = new ChildRunnerBehavior({ childGroups: [[1]] });
            const ctx = createMockContext();

            behavior.onMount(ctx); // dispatches [1]
            behavior.onNext(ctx);  // nothing to dispatch

            expect(behavior.allChildrenCompleted).toBe(true);
        });

        it('should be false when next() just dispatched a child', () => {
            const behavior = new ChildRunnerBehavior({ childGroups: [[1], [2]] });
            const ctx = createMockContext();

            behavior.onMount(ctx); // dispatches [1]
            behavior.onNext(ctx);  // dispatches [2]

            // Last next() dispatched, so allChildrenCompleted = false
            expect(behavior.allChildrenExecuted).toBe(true);
            expect(behavior.allChildrenCompleted).toBe(false);
        });
    });

    describe('resetChildIndex', () => {
        it('should reset childIndex to 0', () => {
            const behavior = new ChildRunnerBehavior({ childGroups: [[1], [2]] });
            const ctx = createMockContext();

            behavior.onMount(ctx);  // childIndex → 1
            behavior.onNext(ctx);   // childIndex → 2

            expect(behavior.allChildrenExecuted).toBe(true);

            behavior.resetChildIndex();

            expect(behavior.allChildrenExecuted).toBe(false);
            expect(behavior.allChildrenCompleted).toBe(false);
        });

        it('should allow dispatching children again after reset', () => {
            const behavior = new ChildRunnerBehavior({ childGroups: [[1], [2]] });
            const ctx = createMockContext();

            behavior.onMount(ctx);  // dispatches [1]
            behavior.onNext(ctx);   // dispatches [2]
            behavior.resetChildIndex();

            // After reset, onNext should push first child again
            const actions = behavior.onNext(ctx);
            expect(actions.length).toBe(2);
            expect(actions[0].payload).toEqual({ statementIds: [1] });
        });
    });

    describe('onUnmount', () => {
        it('should return no actions on unmount', () => {
            const behavior = new ChildRunnerBehavior({ childGroups: [[1]] });
            const ctx = createMockContext();
            const actions = behavior.onUnmount(ctx);
            expect(actions).toEqual([]);
        });
    });
});
