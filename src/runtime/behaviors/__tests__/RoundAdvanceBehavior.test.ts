import { describe, it, expect, vi } from 'bun:test';
import { RoundAdvanceBehavior } from '../RoundAdvanceBehavior';
import { ChildRunnerBehavior } from '../ChildRunnerBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IMemoryLocation, MemoryTag, MemoryLocation } from '../../memory/MemoryLocation';
import { ICodeFragment, FragmentType } from '../../../core/models/CodeFragment';

function createMockContext(overrides: {
    roundState?: { current: number; total: number | undefined };
    childRunner?: ChildRunnerBehavior | null;
} = {}): IBehaviorContext {
    const memoryLocations: IMemoryLocation[] = [];

    if (overrides.roundState) {
        const roundFragment: ICodeFragment = {
            fragmentType: FragmentType.Rounds,
            type: 'rounds',
            image: `Round ${overrides.roundState.current}`,
            origin: 'runtime',
            value: overrides.roundState,
        } as any;
        memoryLocations.push(new MemoryLocation('round', [roundFragment]));
    }

    const behaviorsMap = new Map<any, any>();
    if (overrides.childRunner !== undefined && overrides.childRunner !== null) {
        behaviorsMap.set(ChildRunnerBehavior, overrides.childRunner);
    }

    const block = {
        key: { toString: () => 'test-block' },
        label: 'Test Block',
        fragments: [],
        getBehavior: vi.fn((type: any) => behaviorsMap.get(type)),
        getMemoryByTag: vi.fn((tag: MemoryTag) => memoryLocations.filter(l => l.tag === tag)),
        pushMemory: vi.fn((loc: IMemoryLocation) => memoryLocations.push(loc)),
        getAllMemory: vi.fn(() => [...memoryLocations]),
    } as unknown as IRuntimeBlock;

    return {
        block,
        clock: { now: new Date(1000) },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn(),
        setMemory: vi.fn(),
        pushMemory: vi.fn(),
        updateMemory: vi.fn((tag: string, fragments: ICodeFragment[]) => {
            const locs = memoryLocations.filter(l => l.tag === tag);
            if (locs.length > 0) {
                locs[0].update(fragments);
            }
        })
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

            expect(ctx.updateMemory).toHaveBeenCalledWith('round', expect.arrayContaining([
                expect.objectContaining({ value: { current: 3, total: 5 } })
            ]));
        });

        it('should advance round with undefined total (AMRAP)', () => {
            const behavior = new RoundAdvanceBehavior();
            const ctx = createMockContext({
                roundState: { current: 1, total: undefined }
            });

            behavior.onNext(ctx);

            expect(ctx.updateMemory).toHaveBeenCalledWith('round', expect.arrayContaining([
                expect.objectContaining({ value: { current: 2, total: undefined } })
            ]));
        });

        it('should do nothing when no round state', () => {
            const behavior = new RoundAdvanceBehavior();
            const ctx = createMockContext();

            behavior.onNext(ctx);

            expect(ctx.updateMemory).not.toHaveBeenCalled();
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

            expect(ctx.updateMemory).not.toHaveBeenCalled();
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

            expect(ctx.updateMemory).toHaveBeenCalledWith('round', expect.arrayContaining([
                expect.objectContaining({ value: { current: 2, total: 3 } })
            ]));
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

            expect(ctx.updateMemory).not.toHaveBeenCalled();
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
