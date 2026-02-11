import { describe, it, expect, vi } from 'bun:test';
import { RoundAdvanceBehavior } from '../RoundAdvanceBehavior';
import { ChildRunnerBehavior } from '../ChildRunnerBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';

function createMockContext(overrides: {
    roundState?: { current: number; total: number | undefined };
    childRunner?: ChildRunnerBehavior | null;
} = {}): IBehaviorContext {
    const memoryStore = new Map<string, any>();

    if (overrides.roundState) {
        memoryStore.set('round', overrides.roundState);
    }

    const behaviorsMap = new Map<any, any>();
    if (overrides.childRunner !== undefined && overrides.childRunner !== null) {
        behaviorsMap.set(ChildRunnerBehavior, overrides.childRunner);
    }

    const block = {
        key: { toString: () => 'test-block' },
        label: 'Test Block',
        fragments: [],
        getBehavior: vi.fn((type: any) => behaviorsMap.get(type))
    } as unknown as IRuntimeBlock;

    return {
        block,
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

describe('RoundAdvanceBehavior', () => {
    describe('onMount', () => {
        it('should return no actions on mount', () => {
            const behavior = new RoundAdvanceBehavior();
            const ctx = createMockContext();
            const actions = behavior.onMount(ctx);
            expect(actions).toEqual([]);
        });
    });

    describe('onNext - without children', () => {
        it('should advance round on next', () => {
            const behavior = new RoundAdvanceBehavior();
            const ctx = createMockContext({
                roundState: { current: 2, total: 5 }
            });

            behavior.onNext(ctx);

            expect(ctx.setMemory).toHaveBeenCalledWith('round', {
                current: 3,
                total: 5
            });
        });

        it('should advance round with undefined total (AMRAP)', () => {
            const behavior = new RoundAdvanceBehavior();
            const ctx = createMockContext({
                roundState: { current: 1, total: undefined }
            });

            behavior.onNext(ctx);

            expect(ctx.setMemory).toHaveBeenCalledWith('round', {
                current: 2,
                total: undefined
            });
        });

        it('should do nothing when no round state', () => {
            const behavior = new RoundAdvanceBehavior();
            const ctx = createMockContext();

            behavior.onNext(ctx);

            expect(ctx.setMemory).not.toHaveBeenCalled();
        });

        it('should not emit any events on advance', () => {
            const behavior = new RoundAdvanceBehavior();
            const ctx = createMockContext({
                roundState: { current: 1, total: 3 }
            });

            behavior.onNext(ctx);

            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });
    });

    describe('onNext - with children (ChildRunnerBehavior)', () => {
        it('should not advance when children are not all completed', () => {
            const childRunner = new ChildRunnerBehavior({ childGroups: [[1], [2], [3]] });
            // childRunner hasn't dispatched all children yet (childIndex=0)

            const behavior = new RoundAdvanceBehavior();
            const ctx = createMockContext({
                roundState: { current: 1, total: 3 },
                childRunner
            });

            behavior.onNext(ctx);

            expect(ctx.setMemory).not.toHaveBeenCalled();
        });

        it('should advance when all children have completed', () => {
            const childRunner = new ChildRunnerBehavior({ childGroups: [[1]] });
            // Simulate: mount dispatches first child, then next() with no more children
            const dummyCtx = createMockContext();
            childRunner.onMount(dummyCtx); // dispatches child 0 (childIndex → 1)
            childRunner.onNext(dummyCtx);  // no more children, allChildrenCompleted = true

            const behavior = new RoundAdvanceBehavior();
            const ctx = createMockContext({
                roundState: { current: 1, total: 3 },
                childRunner
            });

            behavior.onNext(ctx);

            expect(ctx.setMemory).toHaveBeenCalledWith('round', {
                current: 2,
                total: 3
            });
        });

        it('should not advance when last child was just dispatched', () => {
            const childRunner = new ChildRunnerBehavior({ childGroups: [[1], [2]] });
            const dummyCtx = createMockContext();
            childRunner.onMount(dummyCtx); // dispatches child 0 (childIndex → 1)
            // childRunner has dispatched first but second not yet dispatched
            // allChildrenExecuted = false, allChildrenCompleted = false

            const behavior = new RoundAdvanceBehavior();
            const ctx = createMockContext({
                roundState: { current: 1, total: 3 },
                childRunner
            });

            behavior.onNext(ctx);

            expect(ctx.setMemory).not.toHaveBeenCalled();
        });
    });

    describe('onUnmount', () => {
        it('should return no actions on unmount', () => {
            const behavior = new RoundAdvanceBehavior();
            const ctx = createMockContext();
            const actions = behavior.onUnmount(ctx);
            expect(actions).toEqual([]);
        });
    });
});
