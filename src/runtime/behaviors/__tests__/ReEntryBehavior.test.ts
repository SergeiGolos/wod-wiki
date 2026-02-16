import { describe, it, expect, vi } from 'bun:test';
import { ReEntryBehavior } from '../ReEntryBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IMemoryLocation, MemoryTag, MemoryLocation } from '../../memory/MemoryLocation';
import { ICodeFragment, FragmentType } from '../../../core/models/CodeFragment';

function createMockContext(overrides: {
    roundState?: { current: number; total: number | undefined };
} = {}): IBehaviorContext {
    const memoryLocations: IMemoryLocation[] = [];

    if (overrides.roundState) {
        const roundFragment: ICodeFragment = {
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            image: `Round ${overrides.roundState.current}`,
            origin: 'runtime',
            value: overrides.roundState,
        } as any;
        memoryLocations.push(new MemoryLocation('round', [roundFragment]));
    }

    const block = {
        key: { toString: () => 'test-block' },
        label: 'Test Block',
        fragments: [],
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
        pushMemory: vi.fn((tag: MemoryTag, fragments: ICodeFragment[]) => {
            const loc = new MemoryLocation(tag, fragments);
            memoryLocations.push(loc);
            return loc;
        }),
        updateMemory: vi.fn((tag: string, fragments: ICodeFragment[]) => {
            const locs = memoryLocations.filter(l => l.tag === tag);
            if (locs.length > 0) {
                locs[0].update(fragments);
            }
        })
    } as unknown as IBehaviorContext;
}

describe('ReEntryBehavior', () => {
    describe('onMount', () => {
        it('initializes round state (current=1, total=N)', () => {
            const behavior = new ReEntryBehavior({ totalRounds: 5 });
            const ctx = createMockContext();

            behavior.onMount(ctx);

            const round = ctx.block.getMemoryByTag('round')[0]?.fragments[0] as any;
            expect(round?.value).toEqual({ current: 1, total: 5 });
        });

        it('supports custom startRound', () => {
            const behavior = new ReEntryBehavior({ totalRounds: 7, startRound: 3 });
            const ctx = createMockContext();

            behavior.onMount(ctx);

            const round = ctx.block.getMemoryByTag('round')[0]?.fragments[0] as any;
            expect(round?.value).toEqual({ current: 3, total: 7 });
        });

        it('supports unbounded rounds', () => {
            const behavior = new ReEntryBehavior({ totalRounds: undefined, startRound: 1 });
            const ctx = createMockContext();

            behavior.onMount(ctx);

            const round = ctx.block.getMemoryByTag('round')[0]?.fragments[0] as any;
            expect(round?.value).toEqual({ current: 1, total: undefined });
        });

        it('creates CurrentRoundFragment with sourceBlockKey and timestamp', () => {
            const behavior = new ReEntryBehavior({ totalRounds: 3, startRound: 2 });
            const ctx = createMockContext();

            behavior.onMount(ctx);

            const round = ctx.block.getMemoryByTag('round')[0]?.fragments[0] as any;
            expect(round?.sourceBlockKey).toBe('test-block');
            expect(round?.timestamp).toEqual(new Date(1000));
        });
    });

    describe('onNext', () => {
        it('is a no-op (round advancement handled by ChildSelectionBehavior)', () => {
            const behavior = new ReEntryBehavior();
            const ctx = createMockContext({ roundState: { current: 1, total: 5 } });

            const actions = behavior.onNext(ctx);

            expect(actions).toEqual([]);
            expect(ctx.updateMemory).not.toHaveBeenCalled();
        });
    });
});
