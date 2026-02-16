import { describe, it, expect, vi } from 'bun:test';
import { FragmentPromotionBehavior } from '../FragmentPromotionBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { FragmentType, ICodeFragment } from '../../../core/models/CodeFragment';
import { RoundState } from '../../memory/MemoryTypes';
import { IRepSource } from '../../contracts/behaviors/IRepSource';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext {
    const memoryStore = new Map<string, any>();

    return {
        block: {
            key: { toString: () => 'loop-block' },
            label: 'Loop',
            fragments: [],
            completionReason: undefined,
            getMemoryByTag: vi.fn(() => []),
        },
        clock: { now: new Date(1000) },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => memoryStore.get(type)),
        setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
        pushMemory: vi.fn(),
        updateMemory: vi.fn(),
        ...overrides,
    } as unknown as IBehaviorContext;
}

function withRoundState(round: RoundState): Partial<IBehaviorContext> {
    const memoryStore = new Map<string, any>([['round', round]]);
    return {
        getMemory: vi.fn((type: string) => memoryStore.get(type)),
        setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
    };
}

function withMutableRound(initial: RoundState) {
    const memoryStore = new Map<string, any>([['round', initial]]);
    return {
        memoryStore,
        overrides: {
            getMemory: vi.fn((type: string) => memoryStore.get(type)),
            setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
        } as Partial<IBehaviorContext>,
    };
}

describe('FragmentPromotionBehavior repScheme', () => {
    // ── IRepSource contract ──────────────────────────────────────────

    describe('IRepSource — getRepsForRound', () => {
        it('should return correct reps for 1-based round index', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });

            expect(behavior.getRepsForRound(1)).toBe(21);
            expect(behavior.getRepsForRound(2)).toBe(15);
            expect(behavior.getRepsForRound(3)).toBe(9);
        });

        it('should wrap around when round exceeds scheme length', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });

            // Round 4 → scheme[0] = 21
            expect(behavior.getRepsForRound(4)).toBe(21);
            // Round 5 → scheme[1] = 15
            expect(behavior.getRepsForRound(5)).toBe(15);
            // Round 6 → scheme[2] = 9
            expect(behavior.getRepsForRound(6)).toBe(9);
        });

        it('should return undefined for empty rep scheme', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [], promotions: [] });

            expect(behavior.getRepsForRound(1)).toBeUndefined();
        });

        it('should handle single-element scheme', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [10], promotions: [] });

            expect(behavior.getRepsForRound(1)).toBe(10);
            expect(behavior.getRepsForRound(2)).toBe(10);
            expect(behavior.getRepsForRound(100)).toBe(10);
        });
    });

    describe('IRepSource — getRepsForCurrentRound', () => {
        it('should return first rep value before any mount', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });

            expect(behavior.getRepsForCurrentRound()).toBe(21);
        });

        it('should return reps for last promoted round after mount', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const ctx = createMockContext(withRoundState({ current: 2, total: 3 }));

            behavior.onMount(ctx);

            // After mount with round 2, current reps should be for round 2
            expect(behavior.getRepsForCurrentRound()).toBe(15);
        });
    });

    describe('IRepSource — repScheme property', () => {
        it('should expose readonly copy of rep scheme', () => {
            const original = [21, 15, 9];
            const behavior = new FragmentPromotionBehavior({ repScheme: original, promotions: [] });

            expect(behavior.repScheme).toEqual([21, 15, 9]);

            // Mutating original should not affect behavior's scheme
            original.push(99);
            expect(behavior.repScheme).toEqual([21, 15, 9]);
        });
    });

    // ── onMount ──────────────────────────────────────────────────────

    describe('onMount — promotes reps for initial round', () => {
        it('should push rep fragment to fragment:rep-target on mount', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const ctx = createMockContext(withRoundState({ current: 1, total: 3 }));

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith(
                'fragment:rep-target',
                [expect.objectContaining({
                    fragmentType: FragmentType.Rep,
                    type: 'rep',
                    value: 21,
                    image: '21',
                    origin: 'runtime',
                })]
            );
        });

        it('should use round 1 when no round memory exists', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const ctx = createMockContext(); // no round state

            behavior.onMount(ctx);

            // Defaults to round 1 → scheme[0] = 21
            expect(ctx.pushMemory).toHaveBeenCalledWith(
                'fragment:rep-target',
                [expect.objectContaining({ value: 21 })]
            );
        });

        it('should promote reps for non-first round on mount', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const ctx = createMockContext(withRoundState({ current: 2, total: 3 }));

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith(
                'fragment:rep-target',
                [expect.objectContaining({ value: 15, image: '15' })]
            );
        });

        it('should not push memory when rep scheme is empty', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [], promotions: [] });
            const ctx = createMockContext(withRoundState({ current: 1, total: 3 }));

            behavior.onMount(ctx);

            expect(ctx.pushMemory).not.toHaveBeenCalled();
        });

        it('should return empty actions on mount', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const ctx = createMockContext(withRoundState({ current: 1, total: 3 }));

            const actions = behavior.onMount(ctx);

            expect(actions).toEqual([]);
        });
    });

    // ── onNext — round change detection ──────────────────────────────

    describe('onNext — promotes reps on round change', () => {
        it('should update rep-target when round advances', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const { memoryStore, overrides } = withMutableRound({ current: 1, total: 3 });
            const ctx = createMockContext({
                ...overrides,
                block: {
                    key: { toString: () => 'loop-block' },
                    label: 'Loop',
                    fragments: [],
                    completionReason: undefined,
                    getMemoryByTag: vi.fn(() => [{ tag: 'fragment:rep-target', fragments: [] }]),
                },
            } as unknown as Partial<IBehaviorContext>);

            // Mount with round 1
            behavior.onMount(ctx);

            // Advance to round 2
            memoryStore.set('round', { current: 2, total: 3 } as RoundState);
            behavior.onNext(ctx);

            // Should update (not push) because rep-target already exists
            expect(ctx.updateMemory).toHaveBeenCalledWith(
                'fragment:rep-target',
                [expect.objectContaining({ value: 15, image: '15' })]
            );
        });

        it('should NOT promote when round has not changed', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const { memoryStore, overrides } = withMutableRound({ current: 1, total: 3 });
            const ctx = createMockContext(overrides);

            // Mount with round 1
            behavior.onMount(ctx);
            // Reset call counts
            (ctx.pushMemory as any).mockClear();
            (ctx.updateMemory as any).mockClear();

            // onNext with same round 1 — should NOT promote
            behavior.onNext(ctx);
            expect(ctx.pushMemory).not.toHaveBeenCalled();
            expect(ctx.updateMemory).not.toHaveBeenCalled();
        });

        it('should NOT promote when no round memory exists', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const ctx = createMockContext();

            behavior.onNext(ctx);

            expect(ctx.pushMemory).not.toHaveBeenCalled();
            expect(ctx.updateMemory).not.toHaveBeenCalled();
        });

        it('should handle full round-robin cycle over multiple advances', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const { memoryStore, overrides } = withMutableRound({ current: 1, total: 6 });
            let repTargetPushed = false;
            const ctx = createMockContext({
                ...overrides,
                block: {
                    key: { toString: () => 'loop-block' },
                    label: 'Loop',
                    fragments: [],
                    completionReason: undefined,
                    getMemoryByTag: vi.fn(() =>
                        repTargetPushed ? [{ tag: 'fragment:rep-target', fragments: [] }] : []
                    ),
                },
                pushMemory: vi.fn(() => { repTargetPushed = true; }),
            } as unknown as Partial<IBehaviorContext>);

            // Mount: round 1 → 21 (pushMemory because rep-target doesn't exist yet)
            behavior.onMount(ctx);
            expect(ctx.pushMemory).toHaveBeenCalledWith(
                'fragment:rep-target',
                [expect.objectContaining({ value: 21 })]
            );

            // Round 2 → 15
            memoryStore.set('round', { current: 2, total: 6 });
            behavior.onNext(ctx);
            expect(ctx.updateMemory).toHaveBeenCalledWith(
                'fragment:rep-target',
                [expect.objectContaining({ value: 15 })]
            );

            // Round 3 → 9
            memoryStore.set('round', { current: 3, total: 6 });
            behavior.onNext(ctx);
            expect(ctx.updateMemory).toHaveBeenCalledWith(
                'fragment:rep-target',
                [expect.objectContaining({ value: 9 })]
            );

            // Round 4 → wraps to 21
            memoryStore.set('round', { current: 4, total: 6 });
            behavior.onNext(ctx);
            expect(ctx.updateMemory).toHaveBeenLastCalledWith(
                'fragment:rep-target',
                [expect.objectContaining({ value: 21 })]
            );
        });
    });

    // ── Lifecycle ────────────────────────────────────────────────────

    describe('onUnmount / onDispose', () => {
        it('should return empty actions on unmount', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const ctx = createMockContext();

            expect(behavior.onUnmount(ctx)).toEqual([]);
        });

        it('should not throw on dispose', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [21, 15, 9], promotions: [] });
            const ctx = createMockContext();

            expect(() => behavior.onDispose(ctx)).not.toThrow();
        });
    });

    // ── Fragment shape ───────────────────────────────────────────────

    describe('emitted fragment shape', () => {
        it('should include sourceBlockKey and timestamp in fragment', () => {
            const behavior = new FragmentPromotionBehavior({ repScheme: [10], promotions: [] });
            const clockTime = new Date('2024-06-15T10:00:00Z');
            const ctx = createMockContext({
                ...withRoundState({ current: 1, total: 1 }),
                clock: { now: clockTime },
            } as unknown as Partial<IBehaviorContext>);

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith(
                'fragment:rep-target',
                [expect.objectContaining({
                    sourceBlockKey: 'loop-block',
                    timestamp: clockTime,
                })]
            );
        });
    });
});
