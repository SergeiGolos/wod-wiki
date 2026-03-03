import { describe, it, expect, vi } from 'bun:test';
import { FragmentType, ICodeFragment } from '../../../core/models/CodeFragment';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { IMemoryLocation, MemoryLocation } from '../../memory/MemoryLocation';
import { FragmentPromotionBehavior } from '../FragmentPromotionBehavior';
import { CurrentRoundFragment } from '../../compiler/fragments/CurrentRoundFragment';
import { RoundState } from '../../memory/MemoryTypes';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext & { memoryStore: Map<string, IMemoryLocation[]> } {
    const memoryStore = new Map<string, IMemoryLocation[]>();

    const pushMemory = vi.fn((tag: string, fragments: ICodeFragment[]) => {
        const location = new MemoryLocation(tag as any, fragments);
        const existing = memoryStore.get(tag) ?? [];
        existing.push(location);
        memoryStore.set(tag, existing);
        return location;
    });

    const updateMemory = vi.fn((tag: string, fragments: ICodeFragment[]) => {
        const existing = memoryStore.get(tag);
        if (!existing || existing.length === 0) {
            const location = new MemoryLocation(tag as any, fragments);
            memoryStore.set(tag, [location]);
            return;
        }

        existing[0].update(fragments);
    });

    const context: IBehaviorContext & { memoryStore: Map<string, IMemoryLocation[]> } = {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Test Block',
            fragments: [],
            completionReason: undefined,
            getMemoryByTag: vi.fn((tag: string) => memoryStore.get(tag) ?? []),
            getAllMemory: vi.fn(() => Array.from(memoryStore.values()).flat()),
            getBehavior: vi.fn(),
        } as any,
        clock: { now: new Date('2024-01-01T00:00:00Z') },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemoryByTag: vi.fn((tag: string) => memoryStore.get(tag) ?? []),
        getMemory: vi.fn((tag: string) => {
            const location = memoryStore.get(tag)?.[0];
            if (!location || location.fragments.length === 0) return undefined;
            // Special case: synthesize RoundState from CurrentRoundFragment fields
            if (tag === 'round') {
                const frag = location.fragments[0] as unknown as { current?: number; total?: number };
                if (frag?.current !== undefined) {
                    return { current: frag.current, total: frag.total } as RoundState;
                }
                return undefined;
            }
            return location.fragments[0]?.value;
        }),
        setMemory: vi.fn(),
        pushMemory,
        updateMemory,
        memoryStore,
        ...overrides
    } as any;

    return context;
}

describe('FragmentPromotionBehavior', () => {
    it('promotes fragment by type to fragment:promote memory', () => {
        const ctx = createMockContext();
        ctx.pushMemory('round', [new CurrentRoundFragment(1, 5, 'test-block', new Date())]);

        const behavior = new FragmentPromotionBehavior({
            promotions: [{ fragmentType: FragmentType.CurrentRound, sourceTag: 'round' }]
        });

        behavior.onMount(ctx);

        const promoted = ctx.memoryStore.get('fragment:promote')?.[0]?.fragments;
        expect(promoted).toBeDefined();
        expect(promoted?.[0].fragmentType).toBe(FragmentType.CurrentRound);
        expect(promoted?.[0].origin).toBe('runtime');
    });

    it('uses configured origin override', () => {
        const ctx = createMockContext();
        ctx.pushMemory('round', [new CurrentRoundFragment(1, undefined, 'test-block', new Date())]);

        const behavior = new FragmentPromotionBehavior({
            promotions: [{
                fragmentType: FragmentType.CurrentRound,
                sourceTag: 'round',
                origin: 'runtime'
            }]
        });

        behavior.onMount(ctx);

        const promoted = ctx.memoryStore.get('fragment:promote')?.[0]?.fragments[0];
        expect(promoted?.origin).toBe('runtime');
    });

    it('skips promotion when source fragment is not found', () => {
        const ctx = createMockContext();
        const behavior = new FragmentPromotionBehavior({
            promotions: [{ fragmentType: FragmentType.CurrentRound, sourceTag: 'round' }]
        });

        behavior.onMount(ctx);

        expect(ctx.memoryStore.get('fragment:promote')).toBeUndefined();
    });

    it('does not re-promote on next when enableDynamicUpdates is false', () => {
        const ctx = createMockContext();
        const roundLocation = ctx.pushMemory('round', [new CurrentRoundFragment(1, 3, 'test-block', new Date())]);

        const behavior = new FragmentPromotionBehavior({
            promotions: [{ fragmentType: FragmentType.CurrentRound, sourceTag: 'round' }]
        });

        behavior.onMount(ctx);
        roundLocation.update([new CurrentRoundFragment(2, 3, 'test-block', new Date())]);

        behavior.onNext(ctx);

        const promoted = ctx.memoryStore.get('fragment:promote')?.[0]?.fragments[0];
        expect(promoted?.value).toBe(1);
    });

    it('re-promotes on next when enableDynamicUpdates is true', () => {
        const ctx = createMockContext();
        const roundLocation = ctx.pushMemory('round', [new CurrentRoundFragment(1, 3, 'test-block', new Date())]);

        const behavior = new FragmentPromotionBehavior({
            promotions: [{
                fragmentType: FragmentType.CurrentRound,
                sourceTag: 'round',
                enableDynamicUpdates: true
            }]
        });

        behavior.onMount(ctx);
        roundLocation.update([new CurrentRoundFragment(2, 3, 'test-block', new Date())]);

        behavior.onNext(ctx);

        const promoted = ctx.memoryStore.get('fragment:promote')?.[0]?.fragments[0];
        expect(promoted?.value).toBe(2);
    });

    it('writes rep scheme to fragment:rep-target and updates on round change', () => {
        const ctx = createMockContext();
        const roundLocation = ctx.pushMemory('round', [new CurrentRoundFragment(1, 3, 'test-block', new Date())]);

        const behavior = new FragmentPromotionBehavior({
            repScheme: [21, 15, 9],
            promotions: []
        });

        behavior.onMount(ctx);
        expect(ctx.memoryStore.get('fragment:rep-target')?.[0]?.fragments[0].value).toBe(21);

        roundLocation.update([new CurrentRoundFragment(2, 3, 'test-block', new Date())]);

        behavior.onNext(ctx);
        expect(ctx.memoryStore.get('fragment:rep-target')?.[0]?.fragments[0].value).toBe(15);
    });

    it('supports rep scheme round-robin and IRepSource methods', () => {
        const behavior = new FragmentPromotionBehavior({
            repScheme: [21, 15, 9],
            promotions: []
        });

        expect(behavior.getRepsForRound(1)).toBe(21);
        expect(behavior.getRepsForRound(2)).toBe(15);
        expect(behavior.getRepsForRound(3)).toBe(9);
        expect(behavior.getRepsForRound(4)).toBe(21);
        expect(behavior.repScheme).toEqual([21, 15, 9]);
    });

    it('handles multiple promotion rules without duplicate fragment types', () => {
        const ctx = createMockContext();
        ctx.pushMemory('round', [new CurrentRoundFragment(1, 2, 'test-block', new Date())]);
        ctx.pushMemory('fragment', [{
            fragmentType: FragmentType.Rep,
            type: 'rep',
            origin: 'parser',
            value: 10,
            image: '10'
        } as ICodeFragment]);

        const behavior = new FragmentPromotionBehavior({
            promotions: [
                { fragmentType: FragmentType.CurrentRound, sourceTag: 'round' },
                { fragmentType: FragmentType.Rep, sourceTag: 'fragment' }
            ]
        });

        behavior.onMount(ctx);

        const promoted = ctx.memoryStore.get('fragment:promote')?.[0]?.fragments ?? [];
        expect(promoted.filter(fragment => fragment.fragmentType === FragmentType.CurrentRound)).toHaveLength(1);
        expect(promoted.filter(fragment => fragment.fragmentType === FragmentType.Rep)).toHaveLength(1);
    });
});