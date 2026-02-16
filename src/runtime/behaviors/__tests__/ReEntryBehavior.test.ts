import { describe, it, expect, vi } from 'bun:test';
import { ReEntryBehavior } from '../ReEntryBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IMemoryLocation, MemoryTag, MemoryLocation } from '../../memory/MemoryLocation';
import { ICodeFragment, FragmentType } from '../../../core/models/CodeFragment';
import { ChildrenStatusState } from '../../memory/MemoryTypes';

function createMockContext(overrides: {
    roundState?: { current: number; total: number | undefined };
    childrenStatus?: ChildrenStatusState;
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
        getMemory: vi.fn((type: string) => {
            if (type === 'children:status') {
                return overrides.childrenStatus;
            }
            return undefined;
        }),
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
        it('advances on leaf blocks (missing children:status)', () => {
            const behavior = new ReEntryBehavior();
            const ctx = createMockContext({ roundState: { current: 1, total: 5 } });

            behavior.onNext(ctx);

            expect(ctx.updateMemory).toHaveBeenCalledWith('round', expect.arrayContaining([
                expect.objectContaining({ value: { current: 2, total: 5 } })
            ]));
        });

        it('advances when children:status.allCompleted=true', () => {
            const behavior = new ReEntryBehavior();
            const ctx = createMockContext({
                roundState: { current: 2, total: 5 },
                childrenStatus: {
                    childIndex: 3,
                    totalChildren: 3,
                    allExecuted: true,
                    allCompleted: true,
                }
            });

            behavior.onNext(ctx);

            expect(ctx.updateMemory).toHaveBeenCalledWith('round', expect.arrayContaining([
                expect.objectContaining({ value: { current: 3, total: 5 } })
            ]));
        });

        it('does not advance when children:status.allCompleted=false', () => {
            const behavior = new ReEntryBehavior();
            const ctx = createMockContext({
                roundState: { current: 2, total: 5 },
                childrenStatus: {
                    childIndex: 1,
                    totalChildren: 3,
                    allExecuted: false,
                    allCompleted: false,
                }
            });

            behavior.onNext(ctx);

            expect(ctx.updateMemory).not.toHaveBeenCalled();
        });

        it('handles missing round memory', () => {
            const behavior = new ReEntryBehavior();
            const ctx = createMockContext();

            behavior.onNext(ctx);

            expect(ctx.updateMemory).not.toHaveBeenCalled();
        });
    });
});
